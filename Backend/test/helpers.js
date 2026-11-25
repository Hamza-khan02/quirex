// Shared setup for the API tests. Each test file gets its own database
// (quirex_test_<name>), a temporary upload folder and its own API server, so
// files can run in parallel and never touch real data.
import { spawn, execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

export const BACKEND_DIR = fileURLToPath(new URL("..", import.meta.url));
export const ADMIN = { email: "admin@test.com", password: "TestAdmin123" };

const PIXEL = fs.readFileSync(new URL("./fixtures/pixel.png", import.meta.url));
// Local MongoDB by default; CI points this at its MongoDB service.
const MONGO_URL = (process.env.TEST_MONGODB_URL || "mongodb://127.0.0.1:27017").replace(/\/$/, "");

// A file upload as a browser would send it.
export const image = (name = "photo.png", bytes = PIXEL, type = "image/png") =>
  new File([bytes], name, { type });

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

// Records each check as its own subtest: a failure is reported by name and
// the rest of the scenario keeps running.
export const checker = (t) => (name, condition, details = "") =>
  t.test(name, () => assert.ok(condition, details ? String(details) : `Expected: ${name}`));

export const request = async (base, method, url, { json, form, token, raw, headers = {} } = {}) => {
  const allHeaders = { ...headers };
  if (token) allHeaders.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    allHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  if (raw !== undefined) {
    allHeaders["Content-Type"] = "application/json";
    body = raw;
  }
  if (form) {
    body = new FormData();
    for (const [key, value] of Object.entries(form)) body.append(key, value);
  }
  const res = await fetch(base + url, { method, headers: allHeaders, body });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, body: data, headers: res.headers };
};

const launchServer = async (env) => {
  const port = await freePort();
  const child = spawn(process.execPath, ["index.js"], {
    cwd: BACKEND_DIR,
    env: { ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const server = { child, port, base: `http://127.0.0.1:${port}`, log: "" };
  child.stdout.on("data", (chunk) => (server.log += chunk));
  child.stderr.on("data", (chunk) => (server.log += chunk));

  const deadline = Date.now() + 20000;
  while (!server.log.includes("Server running")) {
    if (child.exitCode !== null || Date.now() > deadline) {
      child.kill();
      throw new Error(`The API server did not start:\n${server.log}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return server;
};

// Prepares a fresh environment for one test file and removes it afterwards:
// database quirex_test_<name> with the admin account, a temporary upload
// folder and a running API server.
//   beforeStart(db)  insert data before the server boots (e.g. old formats)
//   serverEnv        extra environment variables for the server
export const startTestEnv = async (t, name, { beforeStart, serverEnv = {} } = {}) => {
  const dbName = `quirex_test_${name}`;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), `quirex-${name}-`));
  const env = {
    ...process.env,
    NODE_ENV: "test",
    MONGODB_URI: `${MONGO_URL}/${dbName}`,
    JWT_SECRET: "test-secret",
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    CLIENT_URL: "http://localhost:5173",
    RATE_LIMIT_MAX: "1000",
    TRUST_PROXY: "0",
    UPLOAD_DIR: uploadDir,
    ...serverEnv,
  };

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection;
  const servers = [];
  t.after(async () => {
    for (const server of servers) server.child.kill();
    await db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  await db.dropDatabase();
  execFileSync(process.execPath, ["scripts/createAdmin.js"], { cwd: BACKEND_DIR, env, stdio: "ignore" });
  await beforeStart?.(db);

  const ctx = {
    db,
    env,
    uploadDir,
    servers,
    server: null,
    current: null,
    // Base URL of the server that `call` talks to.
    get base() {
      return ctx.current.base;
    },
    async startServer(extraEnv = {}) {
      const server = await launchServer({ ...env, ...extraEnv });
      servers.push(server);
      return server;
    },
    use(server) {
      ctx.current = server;
    },
    call: (method, url, options) => request(ctx.current.base, method, url, options),
  };
  ctx.server = await ctx.startServer();
  ctx.use(ctx.server);
  return ctx;
};
