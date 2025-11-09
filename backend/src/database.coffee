import "dotenv/config"
import Database from "better-sqlite3"
import path from "path"
import { fileURLToPath } from "url"

__filename = fileURLToPath import.meta.url
__dirname = path.dirname __filename

dbPath = path.resolve __dirname, process.env.DATABASE_PATH or "../lib/database.db"

db = new Database dbPath

db.exec """
  CREATE TABLE IF NOT EXISTS urls (
    id TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    score INTEGER NOT NULL DEFAULT 0,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
"""

console.log "Database connected at: #{dbPath}"

export default db;
