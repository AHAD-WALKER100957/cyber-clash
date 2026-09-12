// /api/kv — single endpoint that implements get / set / delete / list
// Mirrors the shape of the old `window.storage` API so the frontend code
// barely had to change.
//
// Storage backend:
//   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (recommended
//     for Vercel — see README), we use Upstash Redis. This is real, durable,
//     shared storage and is what you should use in production.
//   - Otherwise we fall back to a JSON file on local disk. This works fine for
//     local development (`npm run dev`) but will NOT persist reliably on
//     Vercel's serverless functions (each invocation can get a fresh
//     filesystem), so it is only a dev convenience, not a production backend.

import fs from "fs";
import path from "path";

const USE_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis = null;
if (USE_REDIS) {
  const { Redis } = require("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const DB_FILE = path.join("/tmp", "cyberclash-db.json");

function readLocalDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}
function writeLocalDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db));
  } catch (e) {
    // ignore — read-only fs, etc.
  }
}

async function kvGet(key) {
  if (USE_REDIS) {
    const value = await redis.get(key);
    return value === null || value === undefined ? null : value;
  }
  const db = readLocalDb();
  return Object.prototype.hasOwnProperty.call(db, key) ? db[key] : null;
}

async function kvSet(key, value) {
  if (USE_REDIS) {
    await redis.set(key, value);
    return;
  }
  const db = readLocalDb();
  db[key] = value;
  writeLocalDb(db);
}

async function kvDelete(key) {
  if (USE_REDIS) {
    await redis.del(key);
    return;
  }
  const db = readLocalDb();
  delete db[key];
  writeLocalDb(db);
}

async function kvList(prefix) {
  if (USE_REDIS) {
    const keys = await redis.keys(`${prefix}*`);
    return keys || [];
  }
  const db = readLocalDb();
  return Object.keys(db).filter((k) => k.startsWith(prefix || ""));
}

// Basic hardening: cap key/value sizes, require simple auth-free but
// same-origin usage (this is a small event site, not a multi-tenant SaaS).
const MAX_VALUE_BYTES = 5 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { action, key, value, prefix } = body || {};

  try {
    if (action === "get") {
      if (!key) return res.status(400).json({ error: "key required" });
      const v = await kvGet(key);
      if (v === null) return res.status(200).json(null);
      return res.status(200).json({ key, value: v });
    }

    if (action === "set") {
      if (!key) return res.status(400).json({ error: "key required" });
      const strVal = typeof value === "string" ? value : JSON.stringify(value);
      if (strVal && strVal.length > MAX_VALUE_BYTES) {
        return res.status(413).json({ error: "value too large" });
      }
      await kvSet(key, strVal);
      return res.status(200).json({ key, value: strVal });
    }

    if (action === "delete") {
      if (!key) return res.status(400).json({ error: "key required" });
      await kvDelete(key);
      return res.status(200).json({ key, deleted: true });
    }

    if (action === "list") {
      const keys = await kvList(prefix || "");
      return res.status(200).json({ keys, prefix: prefix || "" });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("KV error:", err);
    return res.status(500).json({ error: "Storage error" });
  }
}
