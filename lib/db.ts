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
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_completed_date DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_days (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day INTEGER NOT NULL,
      completed_date DATE NOT NULL,
      PRIMARY KEY (user_id, day)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lessons (
      day INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      micro_goal TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_steps (
      id SERIAL PRIMARY KEY,
      lesson_day INTEGER NOT NULL REFERENCES lessons(day) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      body TEXT,
      example TEXT,
      prompt TEXT,
      choices JSONB,
      correct_index INTEGER,
      explanation TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      lesson_day INTEGER NOT NULL REFERENCES lessons(day) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_index INTEGER NOT NULL,
      feedback_correct TEXT NOT NULL,
      feedback_incorrect TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_answers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_index INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, question_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_step_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      step_id INTEGER NOT NULL REFERENCES lesson_steps(id) ON DELETE CASCADE,
      selected_index INTEGER,
      is_correct BOOLEAN,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, step_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_skill_checks (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_check_id TEXT NOT NULL,
      selected_index INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, skill_check_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_days_user_id_idx ON user_days(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS questions_lesson_day_idx ON questions(lesson_day)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_answers_user_id_idx ON user_answers(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS lesson_steps_lesson_day_idx ON lesson_steps(lesson_day)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_step_progress_user_id_idx
      ON user_step_progress(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_skill_checks_user_id_idx
      ON user_skill_checks(user_id)
  `;

  schemaReady = true;
};

export const getDb = async () => {
  await ensureSchema();
  return sql;
};
