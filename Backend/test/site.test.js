import { test } from "node:test";
import { startTestEnv, checker, image as img, ADMIN } from "./helpers.js";

test("home page statistics and featured reviews", async (t) => {
  const check = checker(t);
  const env = await startTestEnv(t, "site");
  const { call } = env;
  const login = async (email, password) => (await call("POST", "/api/login", { json: { email, password } })).body.data;

  let r = await call("GET", "/api/site-stats");
  await check("stats work on an empty site", r.status === 200 && r.body.data.totalProperties === 0 && r.body.data.locations === 0 && r.body.data.byType.house === 0, JSON.stringify(r.body));
  r = await call("GET", "/api/featured-reviews");
  await check("no featured reviews on an empty site", r.status === 200 && r.body.data.length === 0);

  const admin = await login(ADMIN.email, ADMIN.password);
  const users = [];
  for (const name of ["Alice", "Bob", "Carol", "Dan"]) {
    await call("POST", "/api/user-register", { form: { name, email: `${name.toLowerCase()}@test.com`, password: "pass-word-1", contact: "1", address: "a", profile: img() } });
    users.push(await login(`${name.toLowerCase()}@test.com`, "pass-word-1"));
  }
  const add = async (fields) => (await call("POST", "/api/add-property", { token: admin.token, form: { description: "x", price: "100", pic: img(), ...fields } })).body.data;
  const villa = await add({ title: "Villa", location: "Pune", propertyType: "house" });
  const flat = await add({ title: "Flat", location: "pune ", propertyType: "flat", listingType: "rent" });
  const shop = await add({ title: "Shop", location: "Delhi", propertyType: "shop" });
  await add({ title: "Plot", location: "Goa", propertyType: "land" });
  const cottage = await add({ title: "Cottage", location: "Goa", propertyType: "house" });

  // One sale and one rental.
  for (const property of [villa, flat]) {
    const request = await call("POST", "/api/buy", { token: users[0].token, json: { propertyId: property._id } });
    await call("POST", "/api/admin-approve-request", { token: admin.token, json: { _id: request.body.data._id } });
  }

  r = await call("GET", "/api/site-stats");
  const stats = r.body.data;
  await check("total properties", stats.totalProperties === 5);
  await check("sold and rented count as completed deals", stats.dealsCompleted === 2 && stats.availableProperties === 3, JSON.stringify(stats));
  await check("locations are counted once regardless of case", stats.locations === 3, JSON.stringify(stats));
  await check("counts per property type", JSON.stringify(stats.byType) === JSON.stringify({ house: 2, flat: 1, shop: 1, land: 1 }), JSON.stringify(stats.byType));

  const review = (user, property, rating, comment) =>
    call("POST", `/api/property/${property._id}/reviews`, { token: user.token, json: { rating, comment } });
  await review(users[0], villa, 5, "Lovely home");
  await review(users[1], villa, 3, "It was fine");
  await review(users[2], flat, 4, "");
  await review(users[1], shop, 4, "Great spot for a shop");
  await review(users[2], cottage, 5, "Quiet and green");
  await review(users[3], flat, 5, "Bright and close to everything");

  r = await call("GET", "/api/featured-reviews");
  const featured = r.body.data;
  await check("at most three featured reviews", featured.length === 3, JSON.stringify(featured));
  await check("newest first", featured.map((f) => f.comment).join("|") === "Bright and close to everything|Quiet and green|Great spot for a shop", JSON.stringify(featured.map((f) => f.comment)));
  await check("only 4+ stars with a comment", featured.every((f) => f.rating >= 4 && f.comment));
  await check("each has the reviewer's name and the property", featured[0].name === "Dan" && featured[0].propertyTitle === "Flat" && featured[0].propertyId === flat._id);

  await call("POST", "/api/delete-property", { token: admin.token, json: { _id: flat._id } });
  r = await call("GET", "/api/featured-reviews");
  await check("reviews of deleted properties disappear", r.body.data.every((f) => f.propertyTitle !== "Flat") && r.body.data[0].comment === "Quiet and green");
  r = await call("GET", "/api/site-stats");
  await check("stats update after deleting a property", r.body.data.totalProperties === 4 && r.body.data.dealsCompleted === 1);
});
