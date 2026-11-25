import { test } from "node:test";
import { startTestEnv, checker, image as img } from "./helpers.js";

test("old-data conversion, search and filters, renting and reviews", async (t) => {
  const check = checker(t);
  const env = await startTestEnv(t, "search", {
    beforeStart: async (db) => {
      // Properties in the format used before numbers, types and listings.
      await db.collection("properties").insertMany([
        { title: "Old Cottage", price: "1,200", area: "3", description: "Old format", location: "Shimla", pic: "" },
        { title: "Old Plot", price: "$50000", area: "1500 sqft", description: "Old format plot", location: "Goa", pic: "" },
      ]);
    },
  });
  const { call } = env;
  const titles = (r) => (r.body.data?.items ?? []).map((p) => p.title).sort();

  // --- Conversion of old-format properties
  await check("startup logs the conversion", env.server.log.includes("Converted 2 properties"), env.server.log);
  const raw = await env.db.collection("properties").find().toArray();
  const cottage = raw.find((p) => p.title === "Old Cottage");
  const plot = raw.find((p) => p.title === "Old Plot");
  await check("old price text -> number", cottage.price === 1200 && plot.price === 50000, JSON.stringify([cottage.price, plot.price]));
  await check("small old area -> bedrooms", cottage.bedrooms === 3 && cottage.area === undefined, JSON.stringify(cottage));
  await check("large old area -> sq ft", plot.area === 1500 && plot.bedrooms === 0, JSON.stringify(plot));
  await check("old properties get default types", cottage.propertyType === "house" && cottage.listingType === "sale");

  // --- Users and properties
  const login = async (email, password) => (await call("POST", "/api/login", { json: { email, password } })).body.data;
  const adminToken = (await login("admin@test.com", "TestAdmin123")).token;
  for (const [name, email] of [["Alice", "alice@test.com"], ["Bob", "bob@test.com"]]) {
    await call("POST", "/api/user-register", { form: { name, email, password: "pass-word-1", contact: "1", address: "a", profile: img() } });
  }
  const alice = await login("alice@test.com", "pass-word-1");
  const bob = await login("bob@test.com", "pass-word-1");

  const add = (fields) => call("POST", "/api/add-property", { token: adminToken, form: { description: "Test listing", pic: img(), ...fields } });
  let r = await add({ title: "City Flat", price: "900", bedrooms: "2", area: "850", location: "Pune", propertyType: "flat", listingType: "rent" });
  await check("add rent listing", r.status === 200 && r.body.data.price === 900 && r.body.data.listingType === "rent" && r.body.data.status === "available", JSON.stringify(r.body));
  const cityFlat = r.body.data;
  const bigHouse = (await add({ title: "Big House", price: "250000", bedrooms: "4", area: "2400", location: "Delhi", propertyType: "house", listingType: "sale" })).body.data;
  const shop = (await add({ title: "Corner Shop", price: "1500", bedrooms: "0", location: "Delhi Market", propertyType: "shop", listingType: "rent" })).body.data;
  const land = (await add({ title: "Farm Land", price: "80000", area: "20000", location: "Punjab", propertyType: "land", listingType: "sale" })).body.data;
  await check("bedrooms default to 0", land.bedrooms === 0);

  const bad = { title: "Bad", location: "x" };
  r = await add({ ...bad, price: "abc" }); await check("price not a number -> 400", r.status === 400);
  r = await add({ ...bad, price: "0" }); await check("price 0 -> 400", r.status === 400);
  r = await add({ ...bad, price: "10", bedrooms: "2.5" }); await check("fractional bedrooms -> 400", r.status === 400);
  r = await add({ ...bad, price: "10", area: "-5" }); await check("negative area -> 400", r.status === 400);
  r = await add({ ...bad, price: "10", propertyType: "castle" }); await check("unknown property type -> 400", r.status === 400);
  r = await add({ ...bad, price: "10", listingType: "lease" }); await check("unknown listing type -> 400", r.status === 400);

  // --- Filters
  const list = (qs = "") => call("GET", `/api/property-list${qs}`);
  r = await list();
  await check("list returns pagination info", r.status === 200 && r.body.data.total === 6 && r.body.data.page === 1 && r.body.data.pages === 1 && Array.isArray(r.body.data.items));
  await check("default sort is newest first", r.body.data.items[0].title === "Farm Land");
  r = await list("?listingType=rent");
  await check("filter rent", JSON.stringify(titles(r)) === JSON.stringify(["City Flat", "Corner Shop"]), titles(r));
  r = await list("?propertyType=land");
  await check("filter property type", JSON.stringify(titles(r)) === JSON.stringify(["Farm Land"]));
  r = await list("?minPrice=1000&maxPrice=100000");
  await check("filter price range", JSON.stringify(titles(r)) === JSON.stringify(["Corner Shop", "Farm Land", "Old Cottage", "Old Plot"]), titles(r));
  r = await list("?bedrooms=3");
  await check("filter minimum bedrooms", JSON.stringify(titles(r)) === JSON.stringify(["Big House", "Old Cottage"]), titles(r));
  r = await list("?q=DELHI");
  await check("keyword search is case-insensitive", JSON.stringify(titles(r)) === JSON.stringify(["Big House", "Corner Shop"]), titles(r));
  r = await list("?location=market");
  await check("filter location", JSON.stringify(titles(r)) === JSON.stringify(["Corner Shop"]));
  r = await list("?q=.*");
  await check("regex characters are matched literally", r.status === 200 && r.body.data.total === 0);
  r = await list("?q[$ne]=x&listingType[$ne]=sale");
  await check("operator-style query params are ignored", r.status === 200 && r.body.data.total === 6, JSON.stringify(r.body).slice(0, 200));
  r = await list("?listingType=foo&minPrice=abc");
  await check("invalid filter values are ignored", r.status === 200 && r.body.data.total === 6);
  r = await list("?listingType=rent&propertyType=shop&location=delhi");
  await check("filters combine", JSON.stringify(titles(r)) === JSON.stringify(["Corner Shop"]));
  r = await list("?sort=price_asc");
  await check("sort price low to high", r.body.data.items.map((p) => p.price).join() === "900,1200,1500,50000,80000,250000");
  r = await list("?sort=price_desc");
  await check("sort price high to low", r.body.data.items[0].title === "Big House");
  r = await list("?limit=2&page=2&sort=price_asc");
  await check("pagination page 2", r.body.data.items.map((p) => p.price).join() === "1500,50000" && r.body.data.pages === 3 && r.body.data.page === 2);
  r = await list("?limit=2&page=99");
  await check("page past the end clamps to the last page", r.body.data.page === 3 && r.body.data.items.length === 2);
  r = await list("?limit=1000");
  await check("limit capped at 50", r.body.data.limit === 50);

  // --- Rent and buy (request, then admin approval)
  const dealFor = async (token, propertyId) => {
    const request = await call("POST", "/api/buy", { token, json: { propertyId } });
    if (request.status !== 200) return request;
    return call("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: request.body.data._id } });
  };
  r = await dealFor(alice.token, cityFlat._id);
  await check("renting a rent listing", r.status === 200 && r.body.message.includes("rented") && r.body.data.deal.dealType === "rent", JSON.stringify(r.body));
  r = await call("POST", "/api/buy", { token: bob.token, json: { propertyId: cityFlat._id } });
  await check("second renter -> 409 'already rented'", r.status === 409 && r.body.message.includes("rented"));
  r = await dealFor(alice.token, bigHouse._id);
  await check("buying a sale listing", r.status === 200 && r.body.message.includes("sold") && r.body.data.deal.dealType === "sale", JSON.stringify(r.body));
  r = await call("GET", `/api/property/${cityFlat._id}`);
  await check("rented property status", r.body.data.status === "rented" && r.body.data.isSold === true);
  r = await call("GET", `/api/property/${bigHouse._id}`);
  await check("sold property status", r.body.data.status === "sold");
  r = await list("?available=true");
  await check("available=true hides sold and rented", r.body.data.total === 4 && !titles(r).includes("City Flat") && !titles(r).includes("Big House"), titles(r));
  r = await call("POST", "/api/user-bought-list", { token: alice.token });
  await check("user list has both deals with types", r.body.data.length === 2 && r.body.data.some((d) => d.dealType === "rent" && d.title === "City Flat") && r.body.data.some((d) => d.dealType === "sale"));
  r = await call("GET", "/api/admin-sold-list", { token: adminToken });
  await check("admin deal list includes dealType", r.body.data.length === 2 && r.body.data.some((d) => d.dealType === "rent"));
  r = await call("GET", "/api/admin-dashboard", { token: adminToken });
  const c = r.body.data.counts;
  await check("dashboard splits sold and rented", c.totalProperties === 6 && c.soldProperties === 1 && c.rentedProperties === 1 && c.availableProperties === 4, JSON.stringify(c));
  await check("dashboard recent deal has dealType", r.body.data.recentSales.some((s) => s.dealType === "rent"));

  // --- Reviews
  const reviewsUrl = `/api/property/${bigHouse._id}/reviews`;
  r = await call("GET", reviewsUrl);
  await check("no reviews yet", r.status === 200 && r.body.data.length === 0);
  r = await call("POST", reviewsUrl, { json: { rating: 4 } });
  await check("review without login -> 401", r.status === 401);
  r = await call("POST", reviewsUrl, { token: adminToken, json: { rating: 4 } });
  await check("admin cannot review -> 403", r.status === 403);
  for (const rating of [0, 6, 3.5, "abc", { $gt: 0 }]) {
    r = await call("POST", reviewsUrl, { token: alice.token, json: { rating } });
    await check(`rating ${JSON.stringify(rating)} -> 400`, r.status === 400);
  }
  r = await call("POST", reviewsUrl, { token: alice.token, json: { rating: 4, comment: "x".repeat(1001) } });
  await check("comment too long -> 400", r.status === 400);
  r = await call("POST", "/api/property/0123456789abcdef01234567/reviews", { token: alice.token, json: { rating: 4 } });
  await check("review of unknown property -> 404", r.status === 404);
  r = await call("POST", reviewsUrl, { token: alice.token, json: { rating: 4, comment: "Great house" } });
  await check("first review", r.status === 200 && r.body.message.includes("Thanks"));
  r = await call("POST", reviewsUrl, { token: alice.token, json: { rating: 5, comment: "Even better" } });
  await check("second post updates the review", r.status === 200 && r.body.message === "Review updated.");
  r = await call("POST", reviewsUrl, { token: bob.token, json: { rating: 2, comment: "Too far from town" } });
  r = await call("GET", reviewsUrl);
  await check("one review per user", r.body.data.length === 2);
  await check("reviews newest first with names", r.body.data[0].name === "Bob" && r.body.data[1].name === "Alice" && r.body.data[1].comment === "Even better");
  const [bobReview, aliceReview] = r.body.data;
  r = await call("GET", `/api/property/${bigHouse._id}`);
  await check("detail has rating summary", r.body.data.rating.average === 3.5 && r.body.data.rating.count === 2, JSON.stringify(r.body.data.rating));
  r = await list("?q=Big House");
  await check("list items have rating summary", r.body.data.items[0].rating.count === 2);
  r = await list("?q=City");
  await check("unreviewed property has zero rating", r.body.data.items[0].rating.count === 0 && r.body.data.items[0].rating.average === 0);

  r = await call("POST", "/api/delete-review", { token: bob.token, json: { _id: aliceReview._id } });
  await check("deleting someone else's review -> 403", r.status === 403);
  r = await call("POST", "/api/delete-review", { token: alice.token, json: { _id: aliceReview._id } });
  await check("deleting own review", r.status === 200);
  r = await call("POST", "/api/delete-review", { token: adminToken, json: { _id: bobReview._id } });
  await check("admin deletes any review", r.status === 200);
  await check("reviews gone", (await call("GET", reviewsUrl)).body.data.length === 0);

  await call("POST", `/api/property/${land._id}/reviews`, { token: bob.token, json: { rating: 3 } });
  await call("POST", "/api/delete-property", { token: adminToken, json: { _id: land._id } });
  await check("deleting a property deletes its reviews", (await env.db.collection("reviews").countDocuments({ propertyId: land._id })) === 0);

  // --- Edit with the new fields
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: shop._id, title: "Corner Shop", price: "1600", bedrooms: "0", area: "300", location: "Delhi Market", description: "Updated", propertyType: "shop", listingType: "sale" } });
  await check("edit saves the new fields", r.status === 200 && r.body.data.price === 1600 && r.body.data.area === 300 && r.body.data.listingType === "sale", JSON.stringify(r.body));
  r = await call("PUT", "/api/update-property", { token: adminToken, form: { _id: shop._id, title: "Corner Shop", price: "1600", location: "Delhi Market", description: "Updated" } });
  await check("edit with empty area clears it", r.status === 200 && r.body.data.area === null);

  await check("server logged no errors", !/Error|error/.test(env.server.log.replace(/Db connected.*|Server running.*/g, "")), env.server.log);
});
