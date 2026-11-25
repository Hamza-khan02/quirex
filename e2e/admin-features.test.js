import { test } from "node:test";
import { startApp, checker, SHOTS } from "./helpers.js";

test("contact, admin dashboard, enquiries, editing, blocking and buying", async (t) => {
  const check = checker(t);
  const { page, apiCall, image, consoleProblems, WEB } = await startApp(t, "admin");

  // Seed: one user, two properties.
  const adminToken = (await apiCall("POST", "/api/login", { json: { email: "admin@test.com", password: "TestAdmin123" } })).data.token;
  await apiCall("POST", "/api/user-register", { form: { name: "Alice", email: "alice@test.com", password: "alice-pass-1", contact: "123", address: "Street 1", profile: image() } });
  await apiCall("POST", "/api/add-property", { token: adminToken, form: { title: "Villa", price: "500", area: "3", description: "A bright villa with a garden.", location: "Delhi", pic: image() } });
  await apiCall("POST", "/api/add-property", { token: adminToken, form: { title: "Flat", price: "200", area: "2", description: "A compact city flat.", location: "Pune", pic: image() } });

  const swal = async () => {
    await page.waitForSelector(".swal2-popup", { state: "visible", timeout: 20000 });
    return (await page.textContent(".swal2-html-container")) || "";
  };
  const swalOk = async () => {
    await page.click(".swal2-confirm");
    await page.waitForSelector(".swal2-container", { state: "detached", timeout: 20000 });
  };
  // A confirmation dialog followed straight away by a result dialog reuses the
  // same popup, so wait for the result text instead of the popup closing.
  const swalConfirmThen = async (expected) => {
    await page.click(".swal2-confirm");
    await page.waitForFunction((t) => document.querySelector(".swal2-html-container")?.textContent.includes(t), expected, { timeout: 20000 });
    return true;
  };
  const fill = async (values) => { for (const [name, value] of Object.entries(values)) await page.fill(`[name="${name}"]`, value); };
  const submit = () => page.click('form input[type="submit"]');
  const login = async (email, password) => {
    await page.goto(`${WEB}/login`);
    await fill({ email, password });
    await submit();
    const text = await swal();
    await swalOk();
    return text;
  };

  // --- Visitor
  await page.goto(WEB);
  await page.click("text=Make An Enquiry");
  await check("slider 'Make An Enquiry' opens /contact", page.url() === `${WEB}/contact`, page.url());
  await fill({ name: "Visitor", email: "visitor@test.com", message: "I would like to know more about your listings." });
  await submit();
  await check("visitor contact form sends", (await swal()).includes("Thank you"));
  await swalOk();
  await check("message box cleared after sending", (await page.inputValue('[name="message"]')) === "");

  await page.goto(`${WEB}/about`);
  await check("about page renders", await page.isVisible("text=Making Property Simple For Everyone"));
  await page.screenshot({ path: `${SHOTS}/about.png`, fullPage: true });

  await page.goto(`${WEB}/property`);
  const villaCard = page.locator(".card", { hasText: "Villa" });
  await villaCard.getByRole("button", { name: "Login to Buy" }).waitFor({ timeout: 20000 });
  await check("visitor sees 'Login to Buy'", true);
  await villaCard.locator(".card-title a").click();
  await page.waitForURL(/\/property\/[a-f\d]{24}$/);
  await page.waitForSelector("h2:has-text('Villa')");
  await check("detail page shows location and description", await page.isVisible("text=Delhi") && await page.isVisible("text=A bright villa with a garden."));
  await page.screenshot({ path: `${SHOTS}/detail.png`, fullPage: true });
  await page.click("text=Enquire About This Property");
  await page.waitForSelector("text=Enquiry about:");
  await check("contact page shows the property", (await page.textContent(".alert")).includes("Villa"));
  await fill({ name: "Carol", email: "carol@test.com", message: "Is the villa still available to visit?" });
  await submit();
  await check("property enquiry sends", (await swal()).includes("Thank you"));
  await swalOk();

  await page.goto(`${WEB}/admin-dashboard`);
  await check("dashboard redirects visitors to /login", await page.waitForURL(`${WEB}/login`, { timeout: 5000 }).then(() => true, () => false), page.url());

  // --- Admin
  await check("admin login works", (await login("admin@test.com", "TestAdmin123")).includes("Login successful"));
  await page.waitForURL(`${WEB}/admin-dashboard`);
  await check("admin lands on dashboard", true);
  const enquiryCard = page.locator(".amenity-card", { hasText: "Enquiries" });
  await enquiryCard.locator("text=2 new").waitFor({ timeout: 20000 });
  await check("dashboard: 2 enquiries, 2 new", (await enquiryCard.textContent()).includes("2"));
  await check("dashboard: 2 properties", (await page.locator(".amenity-card", { hasText: "Total Properties" }).textContent()).includes("2"));
  await check("dashboard: recent enquiry listed", await page.isVisible("text=Is the villa still available to visit?"));
  await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: true });

  await page.click("nav >> text=Contact");
  await page.waitForURL(`${WEB}/admin-contact`);
  // Wait for this page's own heading so the dashboard's table is gone.
  await page.locator("h1:has-text('Contact Enquiries')").waitFor();
  const carolRow = page.locator("tbody tr", { hasText: "Carol" });
  await carolRow.getByRole("link", { name: "Villa" }).waitFor();
  await check("admin enquiries table has 2 rows", (await page.locator("tbody tr").count()) === 2);
  await check("enquiry links to its property", await carolRow.getByRole("link", { name: "Villa" }).isVisible());
  await carolRow.getByRole("button", { name: "Mark read" }).click();
  await carolRow.locator(".badge:has-text('Read')").waitFor({ timeout: 20000 });
  await check("mark read updates the badge", true);
  await page.screenshot({ path: `${SHOTS}/enquiries.png`, fullPage: true });

  await page.goto(`${WEB}/admin-list`);
  await page.locator(".card", { hasText: "Villa" }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin-edit\//);
  await page.waitForSelector('[name="title"]');
  await check("edit form is prefilled", (await page.inputValue('[name="title"]')) === "Villa" && (await page.inputValue('[name="price"]')) === "500");
  await page.fill('[name="price"]', "999");
  await submit();
  await check("edit saves", (await swal()).includes("updated"));
  await swalOk();
  await page.waitForURL(`${WEB}/admin-list`);
  await page.waitForSelector("text=$999");
  await check("list shows the new price", true);

  await page.goto(`${WEB}/admin-user`);
  const aliceRow = page.locator("tr", { hasText: "alice@test.com" });
  await aliceRow.getByRole("button", { name: "Block" }).click();
  await swal();
  await check("block reports success", await swalConfirmThen("User blocked."));
  await swalOk();
  await aliceRow.locator(".badge:has-text('Blocked')").waitFor({ timeout: 20000 });
  await check("user row shows Blocked", true);

  await page.click("text=LogOut");
  await page.waitForURL(`${WEB}/login`);

  // --- Blocked, then unblocked user
  await check("blocked user cannot log in", (await login("alice@test.com", "alice-pass-1")).toLowerCase().includes("blocked"));
  await apiCall("POST", "/api/admin-toggle-block", { token: adminToken, json: { _id: (await apiCall("GET", "/api/admin-user-list", { token: adminToken })).data[0]._id, isBlocked: false } });
  await check("unblocked user logs in", (await login("alice@test.com", "alice-pass-1")).includes("Login successful"));
  await page.waitForURL(`${WEB}/user-property`);
  const flatCard = page.locator(".card", { hasText: "Flat" });
  await flatCard.getByRole("button", { name: "Buy" }).click();
  await check("buy asks for confirmation", (await swal()).includes("Flat"));
  await check("buy sends a request", await swalConfirmThen("Request sent"));
  await swalOk();
  await flatCard.getByRole("button", { name: "Request Sent" }).waitFor({ timeout: 20000 });
  await check("card shows Request Sent", await flatCard.getByRole("button", { name: "Request Sent" }).isDisabled());
  const pendingFlat = (await apiCall("GET", "/api/admin-request-list?status=pending", { token: adminToken })).data;
  await apiCall("POST", "/api/admin-approve-request", { token: adminToken, json: { _id: pendingFlat[0]._id } });
  await page.reload();
  await flatCard.getByRole("button", { name: "Sold" }).waitFor({ timeout: 20000 });
  await check("card switches to Sold after approval", await flatCard.getByRole("button", { name: "Sold" }).isDisabled());
  await page.goto(`${WEB}/user-bought`);
  await page.waitForSelector("tbody tr");
  await check("bought list shows Flat", (await page.textContent("tbody")).includes("Flat"));

  await page.click(".footer >> text=About");
  await check("footer link uses the router", page.url() === `${WEB}/about`);

  // The blocked user's login attempt logs one expected 403.
  const unexpected = consoleProblems.filter((problem) => !problem.includes("status of 403"));
  await check("no unexpected browser console errors", unexpected.length === 0, unexpected.join("\n"));
});
