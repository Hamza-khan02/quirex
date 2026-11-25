import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { startTestEnv, checker, image as img } from "./helpers.js";

test("property detail, editing, contact enquiries, dashboard and blocking", async (t) => {
  const check = checker(t);
  const env = await startTestEnv(t, "admin", { beforeStart: async (db) => {
      // An account from before passwords were hashed.
      await db.collection("users").insertOne({ name: "Legacy", email: "legacy@test.com", password: "legacy-pass-1", contact: "1", address: "x", profile: "", userType: "user" });
    } });
  const { call } = env;

  const login = async (email, password) => (await call("POST", "/api/login", { json: { email, password } })).body.data;
  const admin = await login("admin@test.com", "TestAdmin123");
  const adminToken = admin.token;
  await call("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "alice-pass-1", contact: "1", address: "a", profile: img() } });
  const alice = await login("alice@test.com", "alice-pass-1");

  // --- Property detail
  let r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "Villa", price: "500", area: "3", description: "Nice villa", location: "Delhi", pic: img() } });
  const villa = r.body.data;
  r = await call("POST", "/api/add-property", { token: adminToken, form: { title: "Flat", price: "200", area: "2", description: "Flat", location: "Pune", pic: img() } });
  const flat = r.body.data;
  r = await call("GET", `/api/property/${villa._id}`);
  await check("property detail public -> 200 with isSold", r.status === 200 && r.body.data.title === "Villa" && r.body.data.isSold === false);
  r = await call("GET", "/api/property/not-an-id");
  await check("property detail bad id -> 404", r.status === 404);
  r = await call("GET", "/api/property/0123456789abcdef01234567");
  await check("property detail unknown id -> 404", r.status === 404);

  // --- Edit property
  r = await call("PUT", "/api/update-property", { token: alice.token, form: { _id: villa._id, title: "X", price: "1", area: "1", description: "d", location: "l" } });
  await check("update-property as user -> 403", r.status === 403);
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: villa._id, title: "Villa Deluxe", price: "650", area: "4", description: "Bigger villa", location: "Delhi" } });
  await check("update-property without image keeps picture", r.status === 200 && r.body.data.title === "Villa Deluxe" && r.body.data.pic === villa.pic, JSON.stringify(r.body));
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: villa._id, title: "Flat", price: "1", area: "1", description: "d", location: "l" } });
  await check("update-property to another property title -> 409", r.status === 409);
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: villa._id, title: "Villa Deluxe", price: "700", area: "4", description: "Bigger villa", location: "Delhi", pic: img("new.png") } });
  await check("update-property with same title and new image ok", r.status === 200 && r.body.data.pic !== villa.pic && r.body.data.price === 700);
  await check("old property image removed", !fs.existsSync(path.join(env.uploadDir, villa.pic)));
  await check("new property image exists", fs.existsSync(path.join(env.uploadDir, r.body.data.pic)));
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: villa._id, title: "", price: "1", area: "1", description: "d", location: "l" } });
  await check("update-property missing field -> 400", r.status === 400);
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: "0123456789abcdef01234567", title: "Z", price: "1", area: "1", description: "d", location: "l" } });
  await check("update-property unknown id -> 404", r.status === 404);

  // --- Contact
  r = await call("POST", "/api/contact", { json: { name: "Bob", email: "bob@test.com" } });
  await check("contact without message -> 400", r.status === 400);
  r = await call("POST", "/api/contact", { json: { name: "Bob", email: "not-an-email", message: "Hello there" } });
  await check("contact bad email -> 400", r.status === 400);
  r = await call("POST", "/api/contact", { json: { name: { $ne: null }, email: "bob@test.com", message: "Hello there" } });
  await check("contact operator in name -> 400", r.status === 400);
  r = await call("POST", "/api/contact", { json: { name: "Bob", email: "bob@test.com", message: "x".repeat(2001) } });
  await check("contact message too long -> 400", r.status === 400);
  r = await call("POST", "/api/contact", { json: { name: "Bob", email: "bob@test.com", message: "Hi", propertyId: "0123456789abcdef01234567" } });
  await check("contact about unknown property -> 400", r.status === 400);
  r = await call("POST", "/api/contact", { json: { name: "Bob", email: "bob@test.com", message: "General question" } });
  await check("contact general -> 200", r.status === 200, JSON.stringify(r.body));
  r = await call("POST", "/api/contact", { json: { name: "Carol", email: "carol@test.com", message: "Is the flat available?", propertyId: flat._id } });
  await check("contact about property -> 200", r.status === 200);
  r = await call("GET", "/api/admin-contact-list");
  await check("contact list without token -> 401", r.status === 401);
  r = await call("GET", "/api/admin-contact-list", { token: alice.token });
  await check("contact list as user -> 403", r.status === 403);
  r = await call("GET", "/api/admin-contact-list", { token: adminToken });
  await check("contact list as admin, newest first, with property title", r.status === 200 && r.body.data.length === 2 && r.body.data[0].name === "Carol" && r.body.data[0].propertyTitle === "Flat" && r.body.data[1].propertyTitle === null, JSON.stringify(r.body.data));
  const carolId = r.body.data[0]._id, bobId = r.body.data[1]._id;
  await check("new messages are unread", r.body.data.every((m) => m.isRead === false));
  r = await call("POST", "/api/admin-contact-read", { token: adminToken, json: { _id: carolId, isRead: true } });
  await check("mark read ok", r.status === 200 && r.body.data.isRead === true);
  r = await call("POST", "/api/admin-contact-read", { token: adminToken, json: { _id: carolId, isRead: "yes" } });
  await check("mark read with non-boolean -> 400", r.status === 400);

  // --- Dashboard
  const flatRequest = await call("POST", "/api/buy", { token: alice.token, json: { propertyId: flat._id } });
  await call("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: flatRequest.body.data._id } });
  r = await call("GET", "/api/admin-dashboard", { token: alice.token });
  await check("dashboard as user -> 403", r.status === 403);
  r = await call("GET", "/api/admin-dashboard", { token: adminToken });
  const c = r.body.data?.counts || {};
  await check("dashboard counts", r.status === 200 && c.totalProperties === 2 && c.soldProperties === 1 && c.availableProperties === 1 && c.totalUsers === 2 && c.blockedUsers === 0 && c.totalEnquiries === 2 && c.unreadEnquiries === 1, JSON.stringify(c));
  await check("dashboard recent sale has title, buyer, date", r.body.data.recentSales[0]?.title === "Flat" && r.body.data.recentSales[0]?.buyer === "Alice" && Boolean(r.body.data.recentSales[0]?.date));
  await check("dashboard recent enquiries newest first", r.body.data.recentEnquiries[0]?.name === "Carol");

  r = await call("POST", "/api/delete-contact", { token: adminToken, json: { _id: bobId } });
  await check("delete contact ok", r.status === 200);
  r = await call("POST", "/api/delete-contact", { token: adminToken, json: { _id: bobId } });
  await check("delete contact twice -> 404", r.status === 404);

  // --- Block / unblock
  r = await call("POST", "/api/admin-toggle-block", { token: alice.token, json: { _id: alice.user._id, isBlocked: false } });
  await check("block as user -> 403", r.status === 403);
  r = await call("POST", "/api/admin-toggle-block", { token: adminToken, json: { _id: admin.user._id, isBlocked: true } });
  await check("cannot block an admin -> 404", r.status === 404);
  r = await call("POST", "/api/admin-toggle-block", { token: adminToken, json: { _id: alice.user._id, isBlocked: "true" } });
  await check("block with non-boolean -> 400", r.status === 400);
  r = await call("POST", "/api/admin-toggle-block", { token: adminToken, json: { _id: alice.user._id, isBlocked: true } });
  await check("block alice ok", r.status === 200 && r.body.data.isBlocked === true);
  r = await call("POST", "/api/user-bought-list", { token: alice.token });
  await check("blocked user's existing token -> 401", r.status === 401, JSON.stringify(r.body));
  r = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "alice-pass-1" } });
  await check("blocked user login -> 403 without token", r.status === 403 && !r.body.data, JSON.stringify(r.body));
  r = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "wrong-password" } });
  await check("blocked user with wrong password -> 401 (status not revealed)", r.status === 401);
  r = await call("GET", "/api/admin-dashboard", { token: adminToken });
  await check("dashboard counts blocked user", r.body.data.counts.blockedUsers === 1);
  r = await call("GET", "/api/admin-user-list", { token: adminToken });
  await check("user list shows isBlocked", r.body.data.find((u) => u.email === "alice@test.com")?.isBlocked === true && r.body.data.find((u) => u.email === "legacy@test.com")?.isBlocked !== true);
  r = await call("POST", "/api/admin-toggle-block", { token: adminToken, json: { _id: alice.user._id, isBlocked: false } });
  await check("unblock alice ok", r.status === 200 && r.body.data.isBlocked === false);
  r = await call("POST", "/api/login", { json: { email: "alice@test.com", password: "alice-pass-1" } });
  await check("unblocked user can log in", r.status === 200);
  await check("server logged no errors", !/Error|error/.test(env.server.log.replace(/Db connected.*|Server running.*/g, "")), env.server.log);
});
