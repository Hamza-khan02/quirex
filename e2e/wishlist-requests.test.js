import { test } from "node:test";
import { startApp, checker, SHOTS } from "./helpers.js";

test("wishlist and buy requests with admin approval", async (t) => {
  const check = checker(t);
  const { page, apiCall, image, consoleProblems, WEB } = await startApp(t, "requests");

  const adminToken = (await apiCall("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } })).data.token;
  for (const name of ["Alice", "Bob"]) {
    await apiCall("POST", "/api/user-register", { form: { name, email: `${name.toLowerCase()}@test.com`, password: "pass-word-1", contact: "123", address: "Street 1", profile: image() } });
  }
  const add = (fields) => apiCall("POST", "/api/add-property", { token: adminToken, form: { description: "A lovely place to live.", location: "Pune", pic: image(), ...fields } });
  await add({ title: "Studio Flat", price: "700", bedrooms: "1", propertyType: "flat", listingType: "rent" });
  await add({ title: "Garden Villa", price: "320000", bedrooms: "4", listingType: "sale" });

  const swal = async () => {
    await page.waitForSelector(".swal2-popup", { state: "visible", timeout: 20000 });
    return (await page.textContent(".swal2-html-container")) || "";
  };
  const swalOk = async () => {
    await page.click(".swal2-confirm");
    await page.waitForSelector(".swal2-container", { state: "detached", timeout: 20000 });
  };
  const swalConfirmThen = async (expected) => {
    await page.click(".swal2-confirm");
    await page.waitForFunction((t) => document.querySelector(".swal2-html-container")?.textContent.includes(t), expected, { timeout: 20000 });
    return true;
  };
  const login = async (email, password) => {
    await page.goto(`${WEB}/login`);
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('form input[type="submit"]');
    const text = await swal();
    await swalOk();
    return text;
  };
  const logout = async () => {
    await page.click("text=LogOut");
    await page.waitForURL(`${WEB}/login`);
  };
  const card = (title) => page.locator(".card", { hasText: title });
  const heart = (title) => card(title).locator(".wishlist-button");

  // --- Visitor
  await page.goto(`${WEB}/property`);
  await heart("Garden Villa").click();
  await page.waitForURL(`${WEB}/login`);
  await check("visitor's heart click asks them to log in", true);

  // --- Wishlist
  await check("alice logs in", (await login("alice@test.com", "pass-word-1")).includes("Login successful"));
  await page.waitForURL(`${WEB}/user-property`);
  await heart("Garden Villa").click();
  await page.waitForFunction(() => document.querySelector(".card .wishlist-button.saved"));
  await check("heart fills after saving", (await heart("Garden Villa").getAttribute("aria-pressed")) === "true");
  await page.reload();
  await card("Garden Villa").waitFor();
  await check("saved state survives a reload", (await heart("Garden Villa").getAttribute("aria-pressed")) === "true");
  await page.click("nav >> text=Wishlist");
  await page.waitForURL(`${WEB}/user-wishlist`);
  // Wait for this page's own heading so the property list's cards are gone.
  await page.locator("h2:has-text('My Wishlist')").waitFor();
  await card("Garden Villa").waitFor();
  await check("wishlist page shows the saved property", (await page.locator(".card").count()) === 1);
  await page.screenshot({ path: `${SHOTS}/p4-wishlist.png` });
  await heart("Garden Villa").click();
  await page.locator("text=Your wishlist is empty.").waitFor({ timeout: 20000 });
  await check("un-hearting removes it from the wishlist page", true);

  // --- Request, cancel, request again
  await page.goto(`${WEB}/user-property`);
  await card("Garden Villa").getByRole("button", { name: "Buy" }).click();
  await check("buy explains that the admin reviews it", (await swal()).includes("admin will review"));
  await check("request sent", await swalConfirmThen("Request sent"));
  await swalOk();
  await card("Garden Villa").getByRole("button", { name: "Request Sent" }).waitFor({ timeout: 20000 });
  await check("button shows Request Sent", true);

  await page.click("nav >> text=Requests");
  await page.waitForURL(`${WEB}/user-requests`);
  const villaRow = page.locator("tbody tr", { hasText: "Garden Villa" });
  await villaRow.locator(".badge:has-text('Pending')").waitFor();
  await check("request listed as Pending", true);
  await villaRow.getByRole("button", { name: "Cancel" }).click();
  await swal();
  await check("cancel works", await swalConfirmThen("Request cancelled"));
  await swalOk();
  await villaRow.locator(".badge:has-text('Cancelled')").waitFor({ timeout: 20000 });
  await check("request shows Cancelled", true);

  await page.goto(`${WEB}/user-property`);
  await card("Garden Villa").getByRole("button", { name: "Buy" }).click();
  await swal();
  await swalConfirmThen("Request sent");
  await swalOk();
  await logout();

  await check("bob logs in", (await login("bob@test.com", "pass-word-1")).includes("Login successful"));
  await page.waitForURL(`${WEB}/user-property`);
  await card("Garden Villa").getByRole("button", { name: "Buy" }).click();
  await swal();
  await check("bob can request the same property", await swalConfirmThen("Request sent"));
  await swalOk();
  await logout();

  // --- Admin decides
  await check("admin logs in", (await login("admin@test.com", "TestAdmin123")).includes("Login successful"));
  await page.waitForURL(`${WEB}/admin-dashboard`);
  const requestsCard = page.locator(".amenity-card", { hasText: "Pending Requests" });
  await requestsCard.locator("text=needs review").waitFor({ timeout: 20000 });
  await check("dashboard shows 2 pending requests", (await requestsCard.locator(".counter-number").innerText()) === "2");
  await page.goto(`${WEB}/admin-list`);
  await card("Garden Villa").locator("text=2 pending requests").waitFor({ timeout: 20000 });
  await check("admin property card shows the pending count", true);

  await page.click("nav >> text=Requests");
  await page.waitForURL(`${WEB}/admin-requests`);
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 2);
  await check("pending tab lists both requests", true);
  await page.screenshot({ path: `${SHOTS}/p4-admin-requests.png` });

  await page.locator("tbody tr", { hasText: "Bob" }).getByRole("button", { name: "Reject" }).click();
  await page.waitForSelector(".swal2-textarea");
  await page.fill(".swal2-textarea", "Budget not verified");
  await check("reject with a reason", await swalConfirmThen("Request rejected"));
  await swalOk();
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 1);

  await page.locator("tbody tr", { hasText: "Alice" }).getByRole("button", { name: "Approve" }).click();
  await check("approve asks for confirmation", (await swal()).includes("Other pending requests"));
  await check("approve sells the property", await swalConfirmThen("now sold"));
  await swalOk();
  await page.locator("text=No requests here.").waitFor({ timeout: 20000 });
  await check("pending tab is empty afterwards", true);
  await page.getByRole("button", { name: "All" }).click();
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 3);
  const allText = await page.textContent("tbody");
  await check("All tab shows approved, rejected and cancelled", ["Approved", "Rejected", "Cancelled"].every((label) => allText.includes(label)), allText);
  await logout();

  // --- Results for the users
  await login("bob@test.com", "pass-word-1");
  await page.waitForURL(`${WEB}/user-property`);
  await card("Garden Villa").getByRole("button", { name: "Sold" }).waitFor({ timeout: 20000 });
  await check("property shows Sold to others", true);
  await page.goto(`${WEB}/user-requests`);
  const bobRow = page.locator("tbody tr", { hasText: "Garden Villa" });
  await bobRow.locator(".badge:has-text('Rejected')").waitFor({ timeout: 20000 });
  await check("bob sees the rejection reason", (await bobRow.textContent()).includes("Budget not verified"));
  await page.screenshot({ path: `${SHOTS}/p4-user-requests.png` });
  await logout();

  await login("alice@test.com", "pass-word-1");
  await page.waitForURL(`${WEB}/user-property`);
  await page.click("nav >> text=My Properties");
  await page.waitForSelector("tbody tr");
  await check("alice owns the villa", (await page.textContent("tbody")).includes("Garden Villa") && (await page.textContent("tbody")).includes("Bought"));
  await page.click(".footer >> text=Wish List");
  await check("footer Wish List link works", await page.waitForURL(`${WEB}/user-wishlist`).then(() => true, () => false));

  const unexpected = consoleProblems;
  await check("no unexpected browser console errors", unexpected.length === 0, unexpected.join("\n"));
});
