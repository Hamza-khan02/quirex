import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { startTestEnv, checker, image as img } from "./helpers.js";

test("buy/rent requests, wishlist and deployment settings", async (t) => {
  const check = checker(t);
  const env = await startTestEnv(t, "requests", { serverEnv: { CLIENT_URL: "http://localhost:5173, https://quirex.example/" } });
  const { call } = env;
  const ALT_UPLOADS = path.join(env.uploadDir, "alt");

  const login = async (email, password) => (await call("POST", "/api/login", { json: { email, password } })).body.data;
  const adminToken = (await login("admin@test.com", "TestAdmin123")).token;
  const users = {};
  for (const name of ["alice", "bob", "carol"]) {
    await call("POST", "/api/user-register", { form: { name: name[0].toUpperCase() + name.slice(1), email: `${name}@test.com`, password: "pass-word-1", contact: "1", address: "a", profile: img() } });
    users[name] = await login(`${name}@test.com`, "pass-word-1");
  }
  const { alice, bob, carol } = users;
  const add = async (fields) => (await call("POST", "/api/add-property", { token: adminToken, form: { description: "Test", location: "Pune", pic: img(), ...fields } })).body.data;
  const villa = await add({ title: "Villa", price: "500000", listingType: "sale" });
  const flat = await add({ title: "Flat", price: "900", listingType: "rent", propertyType: "flat" });
  const plot = await add({ title: "Plot", price: "80000", propertyType: "land" });

  const buy = (token, propertyId) => call("POST", "/api/buy", { token, json: { propertyId } });
  const approve = (_id) => call("POST", "/api/admin-approve-request", { token: adminToken, json: { _id } });
  const reject = (_id, note) => call("POST", "/api/admin-reject-request", { token: adminToken, json: { _id, note } });
  const villaItem = async (token) => (await call("GET", "/api/property-list?q=Villa", { token })).body.data.items[0];

  // --- Requests
  await check("request without login -> 401", (await buy(undefined, villa._id)).status === 401);
  await check("request as admin -> 403", (await buy(adminToken, villa._id)).status === 403);
  let r = await buy(alice.token, villa._id);
  await check("alice requests villa", r.status === 200 && r.body.data.status === "pending" && r.body.data.dealType === "sale" && r.body.message.includes("Request sent"), JSON.stringify(r.body));
  const aliceVilla = r.body.data._id;
  r = await buy(alice.token, villa._id);
  await check("second request by same user -> 409", r.status === 409 && r.body.message.includes("already requested"));
  const bobVilla = (await buy(bob.token, villa._id)).body.data._id;
  const carolVilla = (await buy(carol.token, villa._id)).body.data._id;
  await check("other users can request too", Boolean(bobVilla && carolVilla));
  await check("property stays available while requests are pending", (await call("GET", `/api/property/${villa._id}`)).body.data.status === "available");

  await check("requester sees hasPendingRequest", (await villaItem(alice.token)).hasPendingRequest === true);
  await check("visitor sees no flags", (await villaItem()).hasPendingRequest === false && (await villaItem()).pendingRequests === 0 && (await villaItem()).isSaved === false);
  await check("admin sees pending request count", (await villaItem(adminToken)).pendingRequests === 3);
  r = await call("GET", "/api/property-list", { token: "garbage.token.value" });
  await check("public list ignores an invalid token", r.status === 200 && r.body.data.total === 3);
  r = await call("GET", `/api/property/${villa._id}`, { token: alice.token });
  await check("detail has viewer flags too", r.body.data.hasPendingRequest === true);

  r = await call("GET", "/api/my-requests", { token: alice.token });
  await check("my-requests lists the request", r.status === 200 && r.body.data.length === 1 && r.body.data[0].title === "Villa" && r.body.data[0].status === "pending");
  r = await call("GET", "/api/my-requests", { token: adminToken });
  await check("my-requests as admin -> 403", r.status === 403);

  r = await call("POST", "/api/cancel-request", { token: bob.token, json: { _id: aliceVilla } });
  await check("cancelling someone else's request -> 404", r.status === 404);
  r = await call("POST", "/api/cancel-request", { token: bob.token, json: { _id: bobVilla } });
  await check("cancelling own request", r.status === 200 && r.body.data.status === "cancelled");
  r = await call("POST", "/api/cancel-request", { token: bob.token, json: { _id: bobVilla } });
  await check("cancelling twice -> 409", r.status === 409);

  r = await call("GET", "/api/admin-dashboard", { token: adminToken });
  await check("dashboard counts pending requests", r.body.data.counts.pendingRequests === 2, JSON.stringify(r.body.data.counts));
  r = await call("GET", "/api/admin-request-list?status=pending", { token: adminToken });
  await check("admin list filtered to pending", r.status === 200 && r.body.data.length === 2);
  r = await call("GET", "/api/admin-request-list", { token: adminToken });
  await check("admin list with requester and property", r.body.data.length === 3 && r.body.data.every((x) => x.name && x.email && x.title === "Villa" && x.propertyStatus === "available"));
  await check("admin list as user -> 403", (await call("GET", "/api/admin-request-list", { token: alice.token })).status === 403);
  await check("approve as user -> 403", (await call("POST", "/api/admin-approve-request", { token: alice.token, json: { _id: aliceVilla } })).status === 403);
  await check("approve with bad id -> 400", (await approve("nope")).status === 400);

  r = await approve(aliceVilla);
  await check("approving creates the deal", r.status === 200 && r.body.message.includes("sold") && r.body.data.deal.userId === alice.user._id, JSON.stringify(r.body));
  await check("property is now sold", (await call("GET", `/api/property/${villa._id}`)).body.data.status === "sold");
  r = await call("GET", "/api/my-requests", { token: carol.token });
  await check("other pending requests are rejected with a note", r.body.data[0].status === "rejected" && r.body.data[0].note.includes("Another request"));
  r = await call("GET", "/api/my-requests", { token: bob.token });
  await check("cancelled requests stay cancelled", r.body.data[0].status === "cancelled");
  await check("approving again -> 409", (await approve(aliceVilla)).status === 409);
  await check("approving a rejected request -> 409", (await approve(carolVilla)).status === 409);
  r = await buy(bob.token, villa._id);
  await check("requesting a sold property -> 409", r.status === 409 && r.body.message.includes("sold"));

  // --- Reject, request again, approve a rental
  const bobFlat1 = (await buy(bob.token, flat._id)).body.data._id;
  r = await reject(bobFlat1, "Documents missing");
  await check("reject with a note", r.status === 200 && r.body.data.status === "rejected" && r.body.data.note === "Documents missing");
  await check("rejecting twice -> 409", (await reject(bobFlat1)).status === 409);
  r = await buy(bob.token, flat._id);
  await check("user can request again after a rejection", r.status === 200);
  const bobFlat2 = r.body.data._id;
  const carolFlat = (await buy(carol.token, flat._id)).body.data._id;
  await check("note too long -> 400", (await reject(carolFlat, "x".repeat(501))).status === 400);
  r = await approve(carolFlat);
  await check("approving a rental", r.status === 200 && r.body.message.includes("rented") && r.body.data.deal.dealType === "rent");
  r = await call("GET", "/api/my-requests", { token: bob.token });
  await check("bob's newer flat request was rejected", r.body.data.find((x) => x._id === bobFlat2)?.status === "rejected");
  await check("flat is rented", (await call("GET", `/api/property/${flat._id}`)).body.data.status === "rented");

  // --- Two approvals at the same time
  const a = (await buy(alice.token, plot._id)).body.data._id;
  const b = (await buy(bob.token, plot._id)).body.data._id;
  const results = await Promise.all([approve(a), approve(b)]);
  const wins = results.filter((x) => x.status === 200).length;
  await check(`concurrent approvals -> exactly one wins (got ${wins})`, wins === 1, results.map((x) => x.status).join(","));
  await check("one deal for the plot", (await env.db.collection("buyers").countDocuments({ propertyId: plot._id })) === 1);
  const plotRequests = await env.db.collection("requests").find({ propertyId: plot._id }).toArray();
  await check("the other plot request ends up rejected", plotRequests.filter((x) => x.status === "approved").length === 1 && plotRequests.filter((x) => x.status === "rejected").length === 1, JSON.stringify(plotRequests.map((x) => x.status)));

  // --- Deleting a property removes its requests and wishlist entries
  const temp = await add({ title: "Temp", price: "1000" });
  const tempRequest = (await buy(bob.token, temp._id)).body.data._id;
  await call("POST", "/api/wishlist-toggle", { token: bob.token, json: { propertyId: temp._id } });
  await call("POST", "/api/delete-property", { token: adminToken, json: { _id: temp._id } });
  await check("requests deleted with the property", (await env.db.collection("requests").countDocuments({ propertyId: temp._id })) === 0);
  await check("wishlist entries deleted with the property", (await env.db.collection("wishlists").countDocuments({ propertyId: temp._id })) === 0);
  await check("approving a deleted property's request -> 404", (await approve(tempRequest)).status === 404);

  // --- Wishlist
  const toggle = (token, propertyId) => call("POST", "/api/wishlist-toggle", { token, json: { propertyId } });
  await check("wishlist without login -> 401", (await toggle(undefined, villa._id)).status === 401);
  await check("wishlist as admin -> 403", (await toggle(adminToken, villa._id)).status === 403);
  await check("wishlist bad id -> 400", (await toggle(alice.token, "nope")).status === 400);
  await check("wishlist unknown property -> 404", (await toggle(alice.token, "0123456789abcdef01234567")).status === 404);
  r = await toggle(alice.token, villa._id);
  await check("save villa", r.status === 200 && r.body.data.saved === true);
  r = await toggle(alice.token, flat._id);
  await check("save flat", r.body.data.saved === true);
  r = await call("GET", "/api/wishlist", { token: alice.token });
  await check("wishlist newest first with status", r.status === 200 && r.body.data.map((p) => p.title).join() === "Flat,Villa" && r.body.data[0].status === "rented" && r.body.data.every((p) => p.isSaved));
  await check("list shows isSaved for the owner", (await villaItem(alice.token)).isSaved === true);
  await check("other users don't see it as saved", (await villaItem(bob.token)).isSaved === false);
  r = await toggle(alice.token, villa._id);
  await check("toggle again removes it", r.body.data.saved === false && (await call("GET", "/api/wishlist", { token: alice.token })).body.data.length === 1);
  const doubleClick = await Promise.all([toggle(carol.token, plot._id), toggle(carol.token, plot._id)]);
  await check("double click does not error", doubleClick.every((x) => x.status === 200), doubleClick.map((x) => x.status).join());

  // --- Deployment settings
  r = await call("GET", "/api/health");
  await check("health check", r.status === 200 && r.body.data.database === "connected");
  await check("x-powered-by header removed", r.headers.get("x-powered-by") === null);
  r = await call("GET", "/api/health", { headers: { Origin: "https://quirex.example" } });
  await check("second CORS origin allowed (trailing slash in config ignored)", r.headers.get("access-control-allow-origin") === "https://quirex.example");
  r = await call("GET", "/api/health", { headers: { Origin: "http://localhost:5173" } });
  await check("first CORS origin allowed", r.headers.get("access-control-allow-origin") === "http://localhost:5173");
  r = await call("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
  await check("other origins not allowed", r.headers.get("access-control-allow-origin") === null);

  // A second server with a low rate limit and a custom upload folder.
  fs.rmSync(ALT_UPLOADS, { recursive: true, force: true });
  env.use(await env.startServer({ RATE_LIMIT_MAX: "3", UPLOAD_DIR: ALT_UPLOADS }));
  const adminToken2 = (await login("admin@test.com", "TestAdmin123")).token; // attempt 1
  const altProperty = (await call("POST", "/api/add-property", { token: adminToken2, form: { title: "Alt", price: "1", description: "x", location: "x", pic: img() } })).body.data;
  await check("UPLOAD_DIR: image saved in the configured folder", fs.existsSync(path.join(ALT_UPLOADS, altProperty.pic)));
  await check("UPLOAD_DIR: image served from /img", (await fetch(`${env.base}/img/${altProperty.pic}`)).status === 200);
  await call("POST", "/api/login", { json: { email: "admin@test.com", password: "wrong-pass-1" } }); // 2
  await call("POST", "/api/login", { json: { email: "admin@test.com", password: "wrong-pass-1" } }); // 3
  r = await call("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } }); // 4
  await check("4th login in the window -> 429 JSON", r.status === 429 && r.body.code === 429 && r.body.message.includes("Too many"), JSON.stringify(r.body));
  r = await call("GET", "/api/property-list");
  await check("other routes are not limited", r.status === 200);
  await call("POST", "/api/delete-property", { token: adminToken2, json: { _id: altProperty._id } });

  for (const s of env.servers) {
    await check(`server on port ${s.port} logged no errors`, !/Error|error/.test(s.log.replace(/Db connected.*|Server running.*/g, "")), s.log);
  }
});
