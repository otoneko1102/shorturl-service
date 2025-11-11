import "dotenv/config"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { HTTPException } from "hono/http-exception"
import * as punycode from "punycode"
import { nanoid } from "nanoid"
import * as captcha from "svg-captcha"
import axios from "axios"
import { randomUUID } from "crypto"

import db from "./database.js"
import isUserBanned from "./isUserBanned.js"

import config from "../lib/config.js"
import { bannedDomains, isStrict } from "../lib/bannedDomains.js"
import { bannedAlias } from "../lib/bannedAlias.js"
import { bannedWords } from "../lib/bannedWords.js"

import errorMessages from "./errorMessages.js"

domainRegex = /^((?:[a-z0-9][a-z0-9-]*[a-z0-9]*|xn--[a-z0-9-]+)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/

app = new Hono()
PORT = parseInt process.env.PORT or "2045", 10
DOMAIN = process.env.DOMAIN

API_KEY = process.env.API_KEY

captchaStore = new Map()
CAPTCHA_EXPIRATION = 5 * 60 * 1000

setInterval (->
  now = Date.now()
  for entry of captchaStore.entries()
    [token, { timestamp }] = entry
    if now - timestamp > CAPTCHA_EXPIRATION
      captchaStore.delete token
), 60 * 1000

app.onError (err, c) ->
  console.error err

  if err instanceof HTTPException
    errorCode = err.message or "INTERNAL_SERVER_ERROR"
    friendlyMessage = errorMessages[errorCode] or errorMessages.unknown

    return c.json
      error:
        code: errorCode
        message: friendlyMessage
    , err.status

  return c.json
    error:
      code: "INTERNAL_SERVER_ERROR"
      message: errorMessages["INTERNAL_SERVER_ERROR"]
  , 500

generateDummyOptions = (correctAnswer, count) ->
  dummies = new Set()
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  length = correctAnswer.length

  while dummies.size < count
    dummy = ""
    for n in [0...length]
      index = Math.floor Math.random() * chars.length
      dummy += chars.charAt index
    if dummy isnt correctAnswer and not dummies.has dummy
      dummies.add dummy
  return Array.from dummies

shuffleArray = (array) ->
  for i in [array.length - 1..0] by -1
    j = Math.floor Math.random() * (i + 1)
    [array[i], array[j]] = [array[j], array[i]]
  return array

app.get "/api/captcha", (c) ->
  captchaReq =
    size: 6
    noise: 3
    color: true
    background: "#f9f9f9"
  captchaData = captcha.create captchaReq
  token = randomUUID()

  dummyOptions = generateDummyOptions captchaData.text, 3

  options = shuffleArray [captchaData.text, ...dummyOptions]

  captchaStoreData =
    answer: captchaData.text
    timestamp: Date.now()
  captchaStore.set token, captchaStoreData

  result =
    token: token
    image: captchaData.data
    options: options
  return c.json result

app.post "/api/create", (c) ->
  isInvalid = false
  isFailed = false
  body = await c.req.json()
  if body.url
    if bannedWords.some((word) -> body.url.includes word)
      throw new HTTPException 400, message: "URL_BANNED"

    try
      obj = new URL body.url
      hostname = punycode.toASCII obj.hostname
      obj.hostname = hostname
      body.url = obj.href

      if body.url.endsWith "/"
        body.url = body.url.slice 0, -1
    catch
      isInvalid = true

  { url, alias, captchaToken, captchaAnswer, token, key } = body

  if not key and (not captchaToken or not captchaAnswer)
    throw new HTTPException 400, message: "CAPTCHA_MISSING"
  else if captchaToken and captchaAnswer
    storedCaptcha = captchaStore.get captchaToken
    captchaStore.delete captchaToken

    unless storedCaptcha
      throw new HTTPException 403, message: "CAPTCHA_INVALID_TOKEN"

    if Date.now() - storedCaptcha.timestamp > CAPTCHA_EXPIRATION
      throw new HTTPException 403, message: "CAPTCHA_EXPIRED"

    if storedCaptcha.answer.toLowerCase() isnt captchaAnswer.toLowerCase()
      isFailed = true

    unless token
      throw new HTTPException 403, message: "CAPTCHA_INVALID_TOKEN"

    response = await axios.post config.CAPTCHA_API, token: token
    data = response?.data or null

    if 200 <= response.status and response.status < 300 and data
      hashedIp = data.user_data.ip
      success = data.pass and data.risk_rate isnt "bot"
      scoreChange = if (not isFailed and success) then 1 else 0

      stmt = db.prepare """
        INSERT INTO users (id, score, count)
        VALUES (?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          score = score + excluded.score,
          count = count + 1,
          created_at = CURRENT_TIMESTAMP
      """
      stmt.run hashedIp, scoreChange

      if isUserBanned hashedIp
        throw new HTTPException 403, message: "YOU_ARE_BANNED"
      unless success
        throw new HTTPException 403, message: "CAPTCHA_FAILED"

    else
      throw new HTTPException 500, message: "INTERNAL_SERVER_ERROR"

    if isFailed
      throw new HTTPException 403, message: "CAPTCHA_FAILED"
  else if API_KEY
    unless key
      throw new HTTPException 400, message: "API_MISSING"

    if key and key isnt API_KEY
      throw new HTTPException 403, message: "API_INVALID_KEY"
  else
    throw new HTTPException 400, message: "ACCESS_MISSING"

  unless url
    throw new HTTPException 400, message: "URL_REQUIRED"
  parsedUrl = null
  try
    parsedUrl = new URL url
  catch error
    throw new HTTPException 400, message: "URL_INVALID_FORMAT"
  if isInvalid or not domainRegex.test parsedUrl.hostname
    throw new HTTPException 400, message: "URL_INVALID_FORMAT"
  if parsedUrl.hostname is DOMAIN
    throw new HTTPException 400, message: "URL_BANNED"
  isBannedDomain = false
  if isStrict
    # Exact match
    isBannedDomain = bannedDomains.includes parsedUrl.hostname
  else
    # Partial match
    isBannedDomain = bannedDomains.some (bannedDomain) ->
      ".#{parsedUrl.hostname}".endsWith ".#{bannedDomain}"
  if isBannedDomain
    throw new HTTPException 400, message: "URL_BANNED"

  if alias
    unless /^[a-zA-Z0-9-_]+$/.test alias
      throw new HTTPException 400, message: "ALIAS_INVALID_CHARACTERS"
    if alias.toLowerCase() is "api"
      throw new HTTPException 400, message: "ALIAS_BANNED"
    isBannedAlias = false
    isBannedAlias = bannedAlias.includes alias.toLowerCase()
    if isBannedAlias
      throw new HTTPException 400, message: "ALIAS_BANNED"

    stmt = db.prepare "SELECT id FROM urls WHERE id = ?"
    existing = stmt.get alias
    if existing
      throw new HTTPException 409, message: "ALIAS_ALREADY_EXISTS"
  else
    stmt = db.prepare "SELECT id FROM urls WHERE original_url = ?"
    existingUrl = stmt.get url
    if existingUrl
      shortUrl = "https://#{DOMAIN}/#{existingUrl.id}"
      return c.json url: shortUrl

  id = alias or nanoid 7

  try
    stmt = db.prepare "INSERT INTO urls (id, original_url) VALUES (?, ?)"
    stmt.run id, url
    shortUrl = "https://#{DOMAIN}/#{id}"
    return c.json url: shortUrl
  catch error
    throw new HTTPException 500, message: "DATABASE_INSERT_FAILED"

app.get "*", (c) ->
  requestUrl = new URL c.req.url
  path = requestUrl.pathname

  id = path.substring 1

  if (id.startsWith "api") or id is ""
    return c.notFound()

  row = db.prepare "SELECT original_url FROM urls WHERE id = ?"
    .get id
  if row
    finalUrlObject = new URL row.original_url

    if requestUrl.search
      requestSearchParams = new URLSearchParams requestUrl.search
      requestSearchParams.forEach (value, key) ->
        finalUrlObject.searchParams.append key, value

    if requestUrl.hash
      finalUrlObject.hash = requestUrl.hash

    return c.redirect finalUrlObject.toString(), 301

  return c.redirect "/", 302

console.log "Backend is running on http://localhost:#{PORT}"

serveOption =
  fetch: app.fetch
  port: PORT
serve serveOption
