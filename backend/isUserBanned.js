import "dotenv/config";
import db from "./database.js";

function isUserBanned(hashedIp) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const entry = stmt.get(hashedIp);

  if (entry) {
    const isBanned = entry.count - entry.score >= parseInt(process.env.BAN_SCORE, 10);
    return isBanned;
  } else {
    return true;
  }
}

export default isUserBanned;
