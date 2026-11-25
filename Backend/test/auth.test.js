import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { startTestEnv, checker, image as img, BACKEND_DIR as BACKEND } from "./helpers.js";

test("registration, login, roles, uploads, buying and deleting", async (t) => {
  const check = checker(t);
  const env = await startTestEnv(t, "auth", { beforeStart: async (db) => {
      // An account from before passwords were hashed.
      await db.collection("users").insertOne({ name: "Legacy", email: "legacy@test.com", password: "legacy-pass-1", contact: "1", address: "x", profile: "", userType: "user" });
    } });
  const { call } = env;

  // --- Register
  let r = await call("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "alice-pass-1", contact: "123", address: "Street 1", profile: img("../../index.js") } });
  await check("register ok", r.status === 200 && r.body.code === 200, JSON.stringify(r.body));
  await check("register response has no password", r.body.data && !("password" in r.body.data));
  await check("uploaded file gets generated name", /^\d+-[a-f\d]{16}\.png$/.test(r.body.data?.profile || ""), r.body.data?.profile);
  const aliceProfile = r.body.data?.profile;
  await check("index.js not overwritten", fs.readFileSync(path.join(BACKEND, "index.js"), "utf8").includes("startServer"));

  r = await call("POST", "/api/user-register", { form: { name: "X", email: "alice@test.com", password: "whatever-1", contact: "1", address: "a", profile: img() } });
  await check("duplicate register -> 409, no user data leaked", r.status === 409 && r.body.data === null, JSON.stringify(r.body));

  r = await call("POST", "/api/user-register", { form: { name: "Bob", email: "bob@test.com", password: "bob-pass-12", contact: "1", address: "a" } });
  await check("register without picture -> 400", r.status === 400, JSON.stringify(r.body));
  r = await call("POST", "/api/user-register", { form: { name: "Bob", email: "bob@test.com", password: "bob-pass-12", contact: "1", address: "a", profile: img("x.html", "<script>alert(1)</script>", "text/html") } });
  await check("register with html file -> 400", r.status === 400, JSON.stringify(r.body));
  r = await call("POST", "/api/user-register", { form: { name: "Bob", email: "bob@test.com", password: "bob-pass-12", contact: "1", address: "a", profile: img("big.png", Buffer.alloc(6 * 1024 * 1024)) } });
  await check("register with 6 MB image -> 413", r.status === 413, JSON.stringify(r.body));
  r = await call("POST", "/api/user-register", { form: { name: "Bob", email: "bob@test.com", password: "short", contact: "1", address: "a", profile: img() } });
  await check("register with short password -> 400", r.status === 400);
  r = await call("POST", "/api/user-register", { form: { name: "Bob", email: "bob@test.com", password: "bob-pass-12", contact: "1", address: "a", profile: img() } });
  await check("register bob ok", r.status === 200);

  // --- Login
  r = await call("POST", "/api/login", { json: { email: "admin@test.com", password: { $ne: null } } });
  await check("NoSQL injection login rejected", r.status !== 200 && !r.body.data, JSON.stringify(r.body));
  r = await call("POST", "/api/login", { json: { email: { $ne: null }, password: { $ne: null } } });
  await check("NoSQL injection on both fields rejected", r.status !== 200);
  r = await call("POST", "/api/login", { json: { email: "admin@test.com", password: "wrong-password" } });
  await check("wrong password -> 401", r.status === 401);
  r = await call("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } });
  await check("admin login ok with token", r.status === 200 && typeof r.body.data?.token === "string");
  await check("login response has no password", r.body.data?.user && !("password" in r.body.data.user));
  const adminToken = r.body.data.token;

  r = await call("POST", "/api/login", { json: { email: "legacy@test.com", password: "legacy-pass-1" } });
  await check("legacy plaintext user can log in", r.status === 200, JSON.stringify(r.body));
  const legacyToken = r.body.data?.token;
  const legacyDoc = await env.db.collection("users").findOne({ email: "legacy@test.com" });
  await check("legacy password migrated to bcrypt", /^\$2[aby]\$/.test(legacyDoc.password), legacyDoc.password);
  r = await call("POST", "/api/login", { json: { email: "legacy@test.com", password: "legacy-pass-1" } });
  await check("legacy user logs in again after migration", r.status === 200);

  const alice = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "alice-pass-1" } });
  const aliceToken = alice.body.data.token, aliceId = alice.body.data.user._id;
  const bob = await call("POST", "/api/login", { json: { email: "bob@test.com", password: "bob-pass-12" } });
  const bobToken = bob.body.data.token;

  // --- Authorization
  r = await call("GET", "/api/admin-user-list");
  await check("admin-user-list without token -> 401", r.status === 401);
  r = await call("GET", "/api/admin-user-list", { token: aliceToken });
  await check("admin-user-list as user -> 403", r.status === 403);
  r = await call("GET", "/api/admin-user-list", { token: "garbage.token.value" });
  await check("admin-user-list with bad token -> 401", r.status === 401);
  r = await call("GET", "/api/admin-user-list", { token: adminToken });
  await check("admin-user-list as admin -> 200", r.status === 200 && r.body.data.length === 3, JSON.stringify(r.body).slice(0, 200));
  await check("admin-user-list leaks no passwords", r.body.data.every((u) => !("password" in u)));

  r = await call("POST", "/api/add-property", { token: aliceToken, form: { title: "T", price: "1", area: "2", description: "d", location: "l", pic: img() } });
  await check("add-property as user -> 403", r.status === 403);

  // --- Properties
  r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "Villa", price: "500", area: "3", description: "Nice villa", location: "Delhi", pic: img() } });
  await check("add-property as admin ok", r.status === 200, JSON.stringify(r.body));
  const villa = r.body.data;
  r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "Flat", price: "200", area: "2", description: "Flat", location: "Pune", pic: img() } });
  const flat = r.body.data;
  r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "Villa", price: "1", area: "1", description: "dup", location: "x", pic: img() } });
  await check("duplicate property title -> 409", r.status === 409);
  const filesBefore = fs.readdirSync(env.uploadDir).length;
  r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "NoPic", price: "1", area: "1", description: "x", location: "x" } });
  await check("add-property without image -> 400", r.status === 400);
  await check("rejected requests leave no files behind", fs.readdirSync(env.uploadDir).length === filesBefore);

  r = await call("GET", "/api/property-list");
  await check("public property-list shows isSold=false", r.status === 200 && r.body.data.items.every((p) => p.isSold === false));

  // --- Buying
  r = await call("POST", "/api/buy", { json: { propertyId: villa._id } });
  await check("buy without login -> 401", r.status === 401);
  r = await call("POST", "/api/buy", { token: adminToken, json: { propertyId: villa._id } });
  await check("buy as admin -> 403", r.status === 403);
  r = await call("POST", "/api/buy", { token: aliceToken, json: { propertyId: { $ne: null } } });
  await check("buy with operator propertyId -> 400", r.status === 400);
  r = await call("POST", "/api/buy", { token: aliceToken, json: { propertyId: villa._id, userId: "someone-else" } });
  await check("alice requests villa", r.status === 200 && r.body.data.userId === aliceId && r.body.data.status === "pending", JSON.stringify(r.body));
  r = await call("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: r.body.data._id } });
  await check("admin approves -> alice owns villa", r.status === 200 && r.body.data.deal.userId === aliceId, JSON.stringify(r.body));
  r = await call("POST", "/api/buy", { token: bobToken, json: { propertyId: villa._id } });
  await check("second buyer -> 409", r.status === 409);

  const requests = await Promise.all([bobToken, legacyToken, bobToken, legacyToken, bobToken].map((t) => call("POST", "/api/buy", { token: t, json: { propertyId: flat._id } })));
  const accepted = requests.filter((x) => x.status === 200);
  await check(`one pending request per user (got ${accepted.length})`, accepted.length === 2, requests.map((x) => x.status).join(","));
  const approvals = await Promise.all(accepted.map((x) => call("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: x.body.data._id } })));
  const wins = approvals.filter((x) => x.status === 200).length;
  await check(`concurrent approvals of one property -> exactly one succeeds (got ${wins})`, wins === 1, approvals.map((x) => x.status).join(","));
  await check("buyers collection has one record per property", (await env.db.collection("buyers").countDocuments({ propertyId: flat._id })) === 1);

  r = await call("GET", "/api/property-list");
  await check("property-list now shows both sold", r.body.data.items.every((p) => p.isSold === true));
  r = await call("POST", "/api/user-bought-list", { token: aliceToken });
  await check("alice bought-list has villa", r.status === 200 && r.body.data.length === 1 && r.body.data[0].title === "Villa");
  r = await call("GET", "/api/admin-sold-list", { token: adminToken });
  await check("admin sold list has 2 rows with buyer names", r.status === 200 && r.body.data.length === 2 && r.body.data.some((x) => x.name === "Alice"));

  // --- Profile update
  r = await call("PUT", "/api/user-update", { token: aliceToken, form: { name: "Alice B", contact: "999", address: "Street 2", password: "new-alice-pass", userId: legacyDoc._id.toString(), email: "hijack@test.com" } });
  await check("update without picture ok", r.status === 200 && r.body.data.name === "Alice B", JSON.stringify(r.body));
  await check("update ignores email and body userId", r.body.data._id === aliceId && r.body.data.email === "alice@test.com");
  await check("legacy user untouched", (await env.db.collection("users").findOne({ email: "legacy@test.com" })).name === "Legacy");
  r = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "alice-pass-1" } });
  await check("old password no longer works", r.status === 401);
  r = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "new-alice-pass" } });
  await check("new password works", r.status === 200);
  r = await call("PUT", "/api/user-update", { token: aliceToken, form: { name: "Alice B", contact: "999", address: "Street 2", profile: img("new.png") } });
  await check("update with new picture ok", r.status === 200 && r.body.data.profile !== aliceProfile);
  await check("old profile picture file removed", !fs.existsSync(path.join(env.uploadDir, aliceProfile)));
  r = await call("PUT", "/api/user-update", { form: { name: "x", contact: "x", address: "x" } });
  await check("update without token -> 401", r.status === 401);

  // --- Static files
  const served = await fetch(`${env.base}/img/${villa.pic}`);
  await check("uploaded image served with nosniff", served.status === 200 && served.headers.get("x-content-type-options") === "nosniff");

  // --- Deleting
  r = await call("POST", "/api/delete-property", { token: aliceToken, json: { _id: villa._id } });
  await check("delete-property as user -> 403", r.status === 403);
  r = await call("POST", "/api/delete-property", { token: adminToken, json: { _id: "not-an-id" } });
  await check("delete-property bad id -> 400", r.status === 400);
  r = await call("POST", "/api/delete-property", { token: adminToken, json: { _id: villa._id } });
  await check("delete-property ok", r.status === 200);
  await check("its sale record deleted too", (await env.db.collection("buyers").countDocuments({ propertyId: villa._id })) === 0);
  await check("its image file removed", !fs.existsSync(path.join(env.uploadDir, villa.pic)));
  const sold = await call("GET", "/api/admin-sold-list", { token: adminToken });
  r = await call("POST", "/api/delete-sold-item", { token: adminToken, json: { _id: sold.body.data[0]._id } });
  await check("delete-sold-item ok", r.status === 200);
  r = await call("GET", "/api/property-list");
  await check("flat available again after sale deleted", r.body.data.items.find((p) => p._id === flat._id)?.isSold === false);

  // --- Misc
  r = await call("POST", "/api/login", { raw: "{not json" });
  await check("invalid JSON -> 400 JSON response", r.status === 400 && r.body.code === 400);
  r = await call("GET", "/api/does-not-exist");
  await check("unknown route -> 404 JSON", r.status === 404 && r.body.code === 404);
  const users = await env.db.collection("users").find({ createdAt: { $exists: true } }).toArray();
  await check("timestamps differ between documents", new Set(users.map((u) => u.createdAt.getTime())).size === users.length);
  await check("server logged no errors", !/Error|error/.test(env.server.log.replace(/Db connected.*|Server running.*/g, "")), env.server.log);
});
