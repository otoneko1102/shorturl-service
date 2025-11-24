import "dotenv/config"
import db from "./database.js"

isUserBanned = (id) ->
  stmt = db.prepare "SELECT * FROM users WHERE id = ?"
  entry = stmt.get id

  if entry
    isBanned = entry.count - entry.score >= parseInt process.env.BAN_SCORE or 10, 10
    return isBanned
  else
    return true

export default isUserBanned
