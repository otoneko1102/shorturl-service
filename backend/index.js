import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";
import * as captcha from "svg-captcha";
import { randomUUID } from "crypto";

import db from "./database.js";

import { bannedDomains, isStrict } from "./lib/bannedDomains.js";
import { bannedAlias } from "./lib/bannedAlias.js";
import errorMessages from "./lib/errorMessages.js";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "2045", 10);
const DOMAIN = process.env.DOMAIN || "oto.im";

const API_KEY = process.env.API_KEY;

const captchaStore = new Map();
const CAPTCHA_EXPIRATION = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, { timestamp }] of captchaStore.entries()) {
    if (now - timestamp > CAPTCHA_EXPIRATION) {
      captchaStore.delete(token);
    }
  }
}, 60 * 1000);

app.onError((err, c) => {
  console.error(err);

  if (err instanceof HTTPException) {
    const errorCode = err.message || "INTERNAL_SERVER_ERROR";
    const friendlyMessage = errorMessages[errorCode] || errorMessages.unknown;

    return c.json(
      {
        error: {
          code: errorCode,
          message: friendlyMessage,
        },
      },
      err.status
    );
  }

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessages["INTERNAL_SERVER_ERROR"],
      },
    },
    500
  );
});

app.get("/api/captcha", (c) => {
  const captchaData = captcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: "#f9f9f9",
  });
  const token = randomUUID();
  captchaStore.set(token, {
    answer: captchaData.text,
    timestamp: Date.now(),
  });
  return c.json({ token: token, image: captchaData.data });
});

app.post("/api/create", async (c) => {
  const { url, alias, captchaToken, captchaAnswer, key } = await c.req.json();

  if (!key && (!captchaToken || !captchaAnswer)) {
    throw new HTTPException(400, { message: "CAPTCHA_MISSING" });
  } else if (captchaToken && captchaAnswer) {
    const storedCaptcha = captchaStore.get(captchaToken);
    captchaStore.delete(captchaToken);

    if (!storedCaptcha) {
      throw new HTTPException(403, { message: "CAPTCHA_INVALID_TOKEN" });
    }

    if (Date.now() - storedCaptcha.timestamp > CAPTCHA_EXPIRATION) {
      throw new HTTPException(403, { message: "CAPTCHA_EXPIRED" });
    }

    if (storedCaptcha.answer.toLowerCase() !== captchaAnswer.toLowerCase()) {
      throw new HTTPException(403, { message: "CAPTCHA_FAILED" });
    }
  } else if (API_KEY) {
    if (!key) {
      throw new HTTPException(400, { message: "API_MISSING" });
    }

    if (key && key !== API_KEY) {
      throw new HTTPException(403, { message: "API_INVALID_KEY" });
    }
  } else {
    throw new HTTPException(400, { message: "ACCESS_MISSING" });
  }

  if (!url) {
    throw new HTTPException(400, { message: "URL_REQUIRED" });
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new HTTPException(400, { message: "URL_INVALID_FORMAT" });
  }
  if (parsedUrl.hostname === DOMAIN) {
    throw new HTTPException(400, { message: "URL_BANNED" });
  }
  let isBannedDomain = false;
  if (isStrict) {
    // Exact match
    isBannedDomain = bannedDomains.includes(parsedUrl.hostname);
  } else {
    // Partial match
    isBannedDomain = bannedDomains.some((bannedDomain) =>
      `.${parsedUrl.hostname}`.endsWith(`.${bannedDomain}`)
    );
  }
  if (isBannedDomain) {
    throw new HTTPException(400, { message: "URL_BANNED" });
  }

  if (alias) {
    if (!/^[a-zA-Z0-9-_]+$/.test(alias)) {
      throw new HTTPException(400, { message: "ALIAS_INVALID_CHARACTERS" });
    }
    if (alias.toLowerCase() === "api") {
      throw new HTTPException(400, { message: "ALIAS_BANNED" });
    }
    let isBannedAlias = false;
    isBannedAlias = bannedAlias.includes(alias.toLowerCase());
    if (isBannedAlias) {
      throw new HTTPException(400, { message: "ALIAS_BANNED" });
    }

    const stmt = db.prepare("SELECT id FROM urls WHERE id = ?");
    const existing = stmt.get(alias);
    if (existing) {
      throw new HTTPException(409, { message: "ALIAS_ALREADY_EXISTS" });
    }
  } else {
    const stmt = db.prepare("SELECT id FROM urls WHERE original_url = ?");
    const existingUrl = stmt.get(url);
    if (existingUrl) {
      const shortUrl = `https://${DOMAIN}/${existingUrl.id}`;
      return c.json({ url: shortUrl });
    }
  }

  const id = alias || nanoid(7);

  try {
    const stmt = db.prepare(
      "INSERT INTO urls (id, original_url) VALUES (?, ?)"
    );
    stmt.run(id, url);
    const shortUrl = `https://${DOMAIN}/${id}`;
    return c.json({ url: shortUrl });
  } catch (err) {
    throw new HTTPException(500, { message: "DATABASE_INSERT_FAILED" });
  }
});

app.get("*", (c) => {
  const id = c.req.path.substring(1);
  if (id.startsWith("api") || id === "") {
    return c.notFound();
  }
  const row = db.prepare("SELECT original_url FROM urls WHERE id = ?").get(id);
  if (row) {
    return c.redirect(row.original_url, 301);
  }
  return c.notFound();
});

console.log(`Backend is running on http://localhost:${PORT}`);
serve({
  fetch: app.fetch,
  port: PORT,
});
