import { test } from "node:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { startTestEnv, checker, image as img, ADMIN } from "./helpers.js";

// A stand-in for Cloudinary's upload API. The SDK is pointed at it through
// the upload_prefix option in CLOUDINARY_URL, so no real account is needed.
const startFakeCloudinary = () =>
  new Promise((resolve) => {
    const fake = { uploads: [], destroyed: [], failNextUpload: false, count: 0 };
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        if (req.url.endsWith("/image/upload")) {
          if (fake.failNextUpload) {
            fake.failNextUpload = false;
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: { message: "Simulated outage" } }));
          }
          fake.count += 1;
          fake.uploads.push(body);
          const publicId = `quirex/test-${fake.count}`;
          return res.end(JSON.stringify({
            public_id: publicId,
            version: 1,
            format: "png",
            resource_type: "image",
            secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.png`,
          }));
        }
        if (req.url.endsWith("/image/destroy")) {
          const match = body.match(/name="public_id"\r\n\r\n([^\r\n]+)/) || body.match(/public_id=([^&]+)/);
          fake.destroyed.push(match ? decodeURIComponent(match[1]) : body);
          return res.end(JSON.stringify({ result: "ok" }));
        }
        res.statusCode = 404;
        res.end("{}");
      });
    });
    server.listen(0, "127.0.0.1", () => {
      fake.url = `http://127.0.0.1:${server.address().port}`;
      fake.close = () => server.close();
      resolve(fake);
    });
  });

const cloudUrl = (n) => `https://res.cloudinary.com/demo/image/upload/v1/quirex/test-${n}.png`;

test("images are stored on Cloudinary when CLOUDINARY_URL is set", async (t) => {
  const check = checker(t);
  const fake = await startFakeCloudinary();
  t.after(() => fake.close());
  const env = await startTestEnv(t, "cloudinary", {
    serverEnv: { CLOUDINARY_URL: `cloudinary://key:secret@demo?upload_prefix=${fake.url}` },
  });
  const { call } = env;
  const login = async (email, password) => (await call("POST", "/api/login", { json: { email, password } })).body.data;

  let r = await call("GET", "/api/health");
  await check("health check reports Cloudinary storage", r.body.data.storage === "cloudinary", JSON.stringify(r.body));

  r = await call("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "pass-word-1", contact: "1", address: "a", profile: img() } });
  await check("profile picture is saved as a Cloudinary URL", r.status === 200 && r.body.data.profile === cloudUrl(1), JSON.stringify(r.body));
  await check("the image data is sent to the quirex folder", fake.uploads[0]?.includes("data:image/png;base64,") && fake.uploads[0]?.includes("quirex"));
  await check("nothing is written to the local upload folder", fs.readdirSync(env.uploadDir).length === 0);

  const admin = await login(ADMIN.email, ADMIN.password);
  const alice = await login("alice@test.com", "pass-word-1");
  const propertyForm = (extra = {}) => ({ title: "Villa", price: "1000", description: "x", location: "Pune", ...extra });

  r = await call("POST", "/api/add-property", { token: admin.token, form: propertyForm({ pic: img() }) });
  const villa = r.body.data;
  await check("property image is saved as a Cloudinary URL", villa?.pic === cloudUrl(2), JSON.stringify(r.body));
  r = await call("GET", `/api/property/${villa._id}`);
  await check("the URL is returned as stored", r.body.data.pic === cloudUrl(2));

  r = await call("PUT", "/api/update-property", { token: admin.token, form: propertyForm({ _id: villa._id, pic: img() }) });
  await check("a replacement image is uploaded", r.body.data.pic === cloudUrl(3));
  await check("the replaced image is deleted from Cloudinary", fake.destroyed.includes("quirex/test-2"), JSON.stringify(fake.destroyed));

  r = await call("PUT", "/api/user-update", { token: alice.token, form: { name: "Alice", contact: "1", address: "a", profile: img() } });
  await check("the old profile picture is deleted from Cloudinary", r.status === 200 && fake.destroyed.includes("quirex/test-1"));

  await call("POST", "/api/delete-property", { token: admin.token, json: { _id: villa._id } });
  await check("deleting a property deletes its image", fake.destroyed.includes("quirex/test-3"));

  // Images uploaded before Cloudinary was switched on are local files.
  const old = await env.db.collection("properties").insertOne({ title: "Old", price: 1, description: "x", location: "x", pic: "old.jpg" });
  fs.writeFileSync(path.join(env.uploadDir, "old.jpg"), "old image");
  const destroyedBefore = fake.destroyed.length;
  await call("POST", "/api/delete-property", { token: admin.token, json: { _id: String(old.insertedId) } });
  await check("older local images are still deleted from disk", !fs.existsSync(path.join(env.uploadDir, "old.jpg")));
  await check("Cloudinary is not asked to delete local files", fake.destroyed.length === destroyedBefore);

  fake.failNextUpload = true;
  r = await call("POST", "/api/add-property", { token: admin.token, form: propertyForm({ title: "Flat", pic: img() }) });
  await check("a failed upload returns a clear 502", r.status === 502 && r.body.message.includes("Could not upload the image"), JSON.stringify(r.body));
  await check("no property is created when the upload fails", (await call("GET", "/api/property-list?q=Flat")).body.data.total === 0);
});
