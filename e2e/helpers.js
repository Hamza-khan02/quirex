// Shared setup for the browser tests. Each test file starts the API on a test
// database (quirex_test_e2e_<name>) with a temporary upload folder, builds and
// serves the frontend, and opens a headless browser. Everything is removed
// afterwards.
import { spawn, execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BACKEND = path.join(ROOT, "Backend");
const FRONTEND = path.join(ROOT, "frontend");
// mongoose comes from the backend's dependencies.
const mongoose = createRequire(path.join(BACKEND, "package.json"))("mongoose");

export const IMAGE_PATH = path.join(FRONTEND, "public", "img", "9.png");
export const SHOTS = path.join(ROOT, "e2e", "test-results");
const MONGO_URL = (process.env.TEST_MONGODB_URL || "mongodb://127.0.0.1:27017").replace(/\/$/, "");
// Windows ships with Edge, so use it there; elsewhere use Playwright's
// Chromium (`npx playwright-core install chromium`).
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined);

export const ADMIN = { email: "admin@test.com", password: "TestAdmin123" };

// Records each check as its own subtest: a failure is reported by name and
// the rest of the scenario keeps running.
export const checker = (t) => (name, condition, details = "") =>
  t.test(name, () => assert.ok(condition, details ? String(details) : `Expected: ${name}`));

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

const waitUntil = async (condition, what, ms = 60000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      if (await condition()) return;
    } catch {
      // Not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${what()}`);
};

const spawnLogged = (args, cwd, env) => {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.log = "";
  child.stdout.on("data", (chunk) => (child.log += chunk));
  child.stderr.on("data", (chunk) => (child.log += chunk));
  return child;
};

export const startApp = async (t, name) => {
  const [apiPort, webPort] = [await freePort(), await freePort()];
  const API = `http://localhost:${apiPort}`;
  const WEB = `http://localhost:${webPort}`;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), `quirex-e2e-${name}-`));
  const env = {
    ...process.env,
    NODE_ENV: "test",
    MONGODB_URI: `${MONGO_URL}/quirex_test_e2e_${name}`,
    PORT: String(apiPort),
    JWT_SECRET: "test-secret",
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    CLIENT_URL: WEB,
    RATE_LIMIT_MAX: "1000",
    TRUST_PROXY: "0",
    UPLOAD_DIR: uploadDir,
  };

  await mongoose.connect(env.MONGODB_URI);
  const procs = [];
  let browser;
  t.after(async () => {
    await browser?.close();
    for (const proc of procs) proc.kill();
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  await mongoose.connection.dropDatabase();
  execFileSync(process.execPath, ["scripts/createAdmin.js"], { cwd: BACKEND, env, stdio: "ignore" });

  const backend = spawnLogged(["index.js"], BACKEND, env);
  procs.push(backend);

  // Test the production build (as users get it) rather than the dev server,
  // which re-optimizes dependencies and reloads pages on a fresh machine.
  const vite = path.join(FRONTEND, "node_modules", "vite", "bin", "vite.js");
  const distDir = path.join(uploadDir, "dist");
  execFileSync(process.execPath, [vite, "build", "--outDir", distDir, "--emptyOutDir", "--logLevel", "error"], {
    cwd: FRONTEND,
    env: { ...process.env, VITE_API_BASE_URL: API, VITE_IMAGE_BASE_URL: API },
    stdio: "ignore",
  });
  const preview = spawnLogged([vite, "preview", "--outDir", distDir, "--port", String(webPort), "--strictPort"], FRONTEND, process.env);
  procs.push(preview);

  await waitUntil(() => backend.log.includes("Server running"), () => `the API server:\n${backend.log}`);
  await waitUntil(async () => (await fetch(WEB)).ok, () => `the frontend preview server:\n${preview.log}`);

  browser = await chromium.launch({ channel: CHANNEL, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  // CI machines are slower than a laptop; allow more time for each step.
  page.setDefaultTimeout(20000);
  const consoleProblems = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));
  fs.mkdirSync(SHOTS, { recursive: true });

  const apiCall = async (method, url, { json, form, token } = {}) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let body;
    if (json) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    }
    if (form) {
      body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
    }
    return (await fetch(API + url, { method, headers, body })).json();
  };
  const png = fs.readFileSync(IMAGE_PATH);
  const image = () => new File([png], "house.png", { type: "image/png" });

  return { page, API, WEB, apiCall, image, consoleProblems, backend };
};
