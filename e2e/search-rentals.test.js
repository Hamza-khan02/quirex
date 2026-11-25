import { test } from "node:test";
import { startApp, checker, IMAGE_PATH, SHOTS } from "./helpers.js";

test("featured list, filters, pagination, property form, renting and reviews", async (t) => {
  const check = checker(t);
  const { page, apiCall, image, consoleProblems, WEB } = await startApp(t, "search");

  const adminToken = (await apiCall("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } })).data.token;
  await apiCall("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "alice-pass-1", contact: "123", address: "Street 1", profile: image() } });
  const add = (fields) => apiCall("POST", "/api/add-property", { token: adminToken, form: { description: "A lovely place to live.", pic: image(), ...fields } });
  // Ten fillers first so the three named listings are the newest.
  for (let i = 1; i <= 10; i++) await add({ title: `Filler ${i}`, price: String(100000 + i), bedrooms: "1", location: "Nagpur" });
  await add({ title: "Corner Shop", price: "1500", location: "Delhi Market", propertyType: "shop", listingType: "rent" });
  await add({ title: "Family House", price: "250000", bedrooms: "4", area: "2400", location: "Delhi", propertyType: "house", listingType: "sale" });
  await add({ title: "Sunny Flat", price: "900", bedrooms: "2", area: "850", location: "Pune", propertyType: "flat", listingType: "rent" });

  const swal = async () => {
    await page.waitForSelector(".swal2-popup", { state: "visible", timeout: 10000 });
    return (await page.textContent(".swal2-html-container")) || "";
  };
  const swalOk = async () => {
    await page.click(".swal2-confirm");
    await page.waitForSelector(".swal2-container", { state: "detached", timeout: 10000 });
  };
  const swalConfirmThen = async (expected) => {
    await page.click(".swal2-confirm");
    await page.waitForFunction((t) => document.querySelector(".swal2-html-container")?.textContent.includes(t), expected, { timeout: 10000 });
    return true;
  };
  const cardTitles = () => page.locator(".card .card-title").allInnerTexts();
  const foundText = () => page.locator("text=/\\d+ propert(y|ies) found/").innerText();
  const waitForFound = (text) => page.locator(`text=${text}`).waitFor({ timeout: 10000 });
  const login = async (email, password) => {
    await page.goto(`${WEB}/login`);
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('form input[type="submit"]');
    const text = await swal();
    await swalOk();
    return text;
  };

  // --- Home page: featured list
  await page.goto(WEB);
  await page.locator(".card .card-title", { hasText: "Sunny Flat" }).waitFor();
  await check("home shows 8 featured listings", (await cardTitles()).length === 8, (await cardTitles()).join());
  await check("rent price shows /month", await page.locator(".card", { hasText: "Sunny Flat" }).locator("text=$900/month").isVisible());
  await check("visitor sees 'Login to Rent' on rentals", await page.locator(".card", { hasText: "Sunny Flat" }).getByRole("button", { name: "Login to Rent" }).isVisible());
  await page.click("text=Find A Rental");
  await page.waitForURL(`${WEB}/property?listingType=rent`);
  await waitForFound("2 properties found");
  await check("Services 'Find A Rental' opens the rent filter", (await page.inputValue("#filter-listingType")) === "rent" && JSON.stringify((await cardTitles()).sort()) === JSON.stringify(["Corner Shop", "Sunny Flat"]));

  // --- Filters and pagination
  await page.click("text=Reset");
  await waitForFound("13 properties found");
  await check("reset clears filters", page.url() === `${WEB}/property`);
  await check("first page has 12 cards", (await cardTitles()).length === 12);
  await page.locator(".pagination").getByRole("button", { name: "2" }).click();
  await page.waitForURL(/page=2/);
  await page.waitForFunction(() => document.querySelectorAll(".card .card-title").length === 1);
  await check("page 2 has the last card", (await cardTitles()).length === 1);

  await page.click("text=Reset");
  await page.fill("#filter-q", "delhi");
  await page.click("form[aria-label='Search properties'] button[type=submit]");
  await waitForFound("2 properties found");
  await check("keyword search", JSON.stringify((await cardTitles()).sort()) === JSON.stringify(["Corner Shop", "Family House"]));
  await page.selectOption("#filter-sort", "price_desc");
  await page.click("form[aria-label='Search properties'] button[type=submit]");
  await page.waitForURL(/sort=price_desc/);
  await page.waitForFunction(() => document.querySelector(".card .card-title")?.textContent.includes("Family House"));
  await check("sort high to low", (await cardTitles())[0] === "Family House");

  await page.click("text=Reset");
  await page.selectOption("#filter-propertyType", "flat");
  await page.fill("#filter-maxPrice", "1000");
  await page.selectOption("#filter-bedrooms", "2");
  await page.click("form[aria-label='Search properties'] button[type=submit]");
  await waitForFound("1 property found");
  await check("combined filters", JSON.stringify(await cardTitles()) === JSON.stringify(["Sunny Flat"]));
  await page.screenshot({ path: `${SHOTS}/p3-filters.png`, fullPage: false });
  await page.goBack();
  await page.waitForURL(`${WEB}/property`);
  await check("back button restores the previous filters", (await page.inputValue("#filter-propertyType")) === "");

  // --- Detail page as a visitor
  await page.goto(`${WEB}/property?q=Family`);
  await page.locator(".card-title a", { hasText: "Family House" }).click();
  await page.waitForURL(/\/property\/[a-f\d]{24}$/);
  await page.waitForSelector("h2:has-text('Family House')");
  await check("detail shows price, bedrooms and area", await page.isVisible("text=$250,000") && await page.isVisible("text=4 Bedrooms") && await page.isVisible("text=2,400 sq ft"));
  await check("visitor is asked to log in to review", await page.isVisible("text=Log in to rate this property."));
  const familyHouseUrl = page.url();

  // --- Admin: add a property with the new fields
  await check("admin login", (await login("admin@test.com", "TestAdmin123")).includes("Login successful"));
  await page.waitForURL(`${WEB}/admin-dashboard`);
  await page.locator(".amenity-card", { hasText: "Rented" }).waitFor();
  await check("dashboard has a Rented card", true);
  await page.goto(`${WEB}/admin-add`);
  await page.fill("#pf-title", "Lake View Flat");
  await page.selectOption("#pf-listingType", "rent");
  await check("price label switches to monthly rent", await page.isVisible("text=Monthly Rent ($)"));
  await page.selectOption("#pf-propertyType", "flat");
  await page.fill("#pf-price", "1200");
  await page.fill("#pf-bedrooms", "3");
  await page.fill("#pf-area", "1100");
  await page.fill("#pf-location", "Bhopal");
  await page.fill("#pf-description", "Bright flat with a view of the lake.");
  await page.setInputFiles("#pf-pic", IMAGE_PATH);
  await page.screenshot({ path: `${SHOTS}/p3-form.png`, fullPage: true });
  await page.click('form input[type="submit"]');
  await check("admin adds a rental through the form", (await swal()).includes("added"));
  await swalOk();
  await check("form resets after adding", (await page.inputValue("#pf-title")) === "");
  const saved = (await apiCall("GET", "/api/property-list?q=Lake")).data.items[0];
  await check("saved with the right types and numbers", saved?.listingType === "rent" && saved?.propertyType === "flat" && saved?.price === 1200 && saved?.bedrooms === 3 && saved?.area === 1100, JSON.stringify(saved));
  await page.click("text=LogOut");
  await page.waitForURL(`${WEB}/login`);

  // --- User: rent, then review
  await check("user login", (await login("alice@test.com", "alice-pass-1")).includes("Login successful"));
  await page.waitForURL(`${WEB}/user-property`);
  const sunny = page.locator(".card", { hasText: "Sunny Flat" });
  await sunny.getByRole("button", { name: "Rent" }).click();
  await check("rent confirmation shows the monthly price", (await swal()).includes("$900/month"));
  await check("rent sends a request", await swalConfirmThen("Request sent"));
  await swalOk();
  await sunny.getByRole("button", { name: "Request Sent" }).waitFor({ timeout: 10000 });
  const pendingSunny = (await apiCall("GET", "/api/admin-request-list?status=pending", { token: adminToken })).data;
  await apiCall("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: pendingSunny[0]._id } });
  await page.reload();
  await sunny.getByRole("button", { name: "Rented" }).waitFor({ timeout: 10000 });
  await check("card switches to Rented after approval", await sunny.getByRole("button", { name: "Rented" }).isDisabled());
  await page.click("nav >> text=My Properties");
  await page.waitForURL(`${WEB}/user-bought`);
  await page.waitForSelector("tbody tr");
  await check("My Properties shows the rental", (await page.textContent("tbody")).includes("Sunny Flat") && (await page.textContent("tbody")).includes("Rented"));

  await page.goto(familyHouseUrl);
  await page.waitForSelector("text=Write a review");
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.fill("[aria-label='Review comment']", "Spacious and quiet.");
  await page.click("text=Submit Review");
  await check("review submitted", (await swal()).includes("Thanks"));
  await swalOk();
  await page.locator(".review-card", { hasText: "Spacious and quiet." }).waitFor();
  await check("review shows with a 'You' badge", await page.locator(".review-card", { hasText: "Alice" }).locator("text=You").isVisible());
  await page.locator("text=4 (1 review)").waitFor({ timeout: 10000 });
  await check("rating summary updates", true);
  await check("form switches to update mode", await page.isVisible("text=Update your review"));
  await page.getByRole("radio", { name: "5 stars" }).click();
  await page.click("text=Update Review");
  await check("review updated", (await swal()).includes("Review updated"));
  await swalOk();
  await page.locator("text=5 (1 review)").waitFor({ timeout: 10000 });
  await check("summary shows the new rating", true);
  await page.screenshot({ path: `${SHOTS}/p3-reviews.png`, fullPage: true });
  await page.locator(".review-card").getByRole("button", { name: "Delete" }).click();
  await swal();
  await check("review deleted", await swalConfirmThen("Review deleted"));
  await swalOk();
  await page.locator(".review-card").waitFor({ state: "detached", timeout: 10000 });
  await check("no reviews left", await page.isVisible("text=No reviews yet"));

  const unexpected = consoleProblems;
  await check("no unexpected browser console errors", unexpected.length === 0, unexpected.join("\n"));
});
