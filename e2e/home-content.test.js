import { test } from "node:test";
import { startApp, checker, SHOTS } from "./helpers.js";

test("home page shows real numbers, categories, reviews and working links", async (t) => {
  const check = checker(t);
  const { page, apiCall, image, consoleProblems, WEB } = await startApp(t, "home");

  const adminToken = (await apiCall("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } })).data.token;
  await apiCall("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "pass-word-1", contact: "1", address: "a", profile: image() } });
  const alice = (await apiCall("POST", "/api/login", { json: { email: "alice@test.com", password: "pass-word-1" } })).data;
  const add = async (fields) => (await apiCall("POST", "/api/add-property", { token: adminToken, form: { description: "A lovely place.", price: "1000", pic: image(), ...fields } })).data;
  const villa = await add({ title: "Hill Villa", location: "Shimla", propertyType: "house" });
  await add({ title: "City Flat", location: "Pune", propertyType: "flat", listingType: "rent" });
  await add({ title: "Market Shop", location: "Delhi", propertyType: "shop" });
  const request = await apiCall("POST", "/api/buy", { token: alice.token, json: { propertyId: villa._id } });
  await apiCall("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: request.data._id } });
  await apiCall("POST", `/api/property/${villa._id}/reviews`, { token: alice.token, json: { rating: 5, comment: "The view from the terrace is wonderful." } });

  await page.goto(WEB);
  const counter = (label) => page.locator(".counter-text", { hasText: label }).locator("xpath=..").locator(".counter-number");
  await page.waitForFunction(() => document.querySelector(".counter-number")?.textContent.trim() === "3", null, { timeout: 20000 });
  await check("counter: properties listed", (await counter("Properties Listed").innerText()) === "3");
  await page.waitForFunction(() => [...document.querySelectorAll(".counter-number")].map((el) => el.textContent.trim()).join() === "3,2,1,3");
  await check("counters: available, sold & rented, locations", true);

  const typeCard = (label) => page.locator(".amenity-card", { has: page.locator(`h5:text-is("${label}")`) });
  await check("Browse by Type shows live counts", (await typeCard("Houses").innerText()).includes("1 property") && (await typeCard("Land").innerText()).includes("0 properties"));

  const review = page.locator(".review-card", { hasText: "The view from the terrace is wonderful." });
  await review.waitFor();
  await check("home shows the real review with its author and property", (await review.innerText()).includes("Alice") && (await review.innerText()).includes("Hill Villa"));

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  await check("no lorem ipsum left on the home page", !bodyText.includes("lorem"));
  const deadLinks = await page.$$eval(".footer a, .footer-bottom a", (links) => links.filter((a) => !a.getAttribute("href") || a.getAttribute("href") === "#").map((a) => a.textContent.trim()));
  await check("footer has no dead links", deadLinks.length === 0, deadLinks.join(", "));
  await check("social icons are hidden until links are configured", (await page.locator("a[aria-label='Facebook']").count()) === 0);
  await page.screenshot({ path: `${SHOTS}/home.png`, fullPage: true });

  await typeCard("Flats").click();
  await page.waitForURL(`${WEB}/property?propertyType=flat`);
  await page.locator("text=1 property found").waitFor();
  await check("a category card opens the filtered list", (await page.inputValue("#filter-propertyType")) === "flat");

  await page.goto(WEB);
  await page.click(".footer >> text=Homes for Rent");
  await page.waitForURL(`${WEB}/property?listingType=rent`);
  await page.locator("text=1 property found").waitFor();
  await check("footer category links work", true);

  await check("no unexpected browser console errors", consoleProblems.length === 0, consoleProblems.join("\n"));
});
