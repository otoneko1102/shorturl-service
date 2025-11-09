import "dotenv/config"
import db from "./database.js"

isUserBanned = (hashedIp) ->
  stmt = db.prepare "SELECT * FROM users WHERE id = ?"
  entry = stmt.get hashedIp

  if entry
    isBanned = entry.count - entry.score >= parseInt process.env.BAN_SCORE or 10, 10
    return isBanned
  else
    return true

export default isUserBanned
