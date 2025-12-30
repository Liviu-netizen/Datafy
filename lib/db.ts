import "server-only";

import { sql } from "@vercel/postgres";

let schemaReady = false;

const ensureSchema = async () => {
  if (schemaReady) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_completed_date DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_days (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day INTEGER NOT NULL,
      completed_date DATE NOT NULL,
      PRIMARY KEY (user_id, day)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS user_days_user_id_idx ON user_days(user_id);
  `;

  schemaReady = true;
};

export const getDb = async () => {
  await ensureSchema();
  return sql;
};
