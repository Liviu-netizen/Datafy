import "./server-only";
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
    ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS recap_bullets JSONB,
    ADD COLUMN IF NOT EXISTS real_world_line TEXT
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
    ALTER TABLE lesson_steps
    ADD COLUMN IF NOT EXISTS visual_json JSONB
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
    CREATE TABLE IF NOT EXISTS skill_checks (
      id TEXT PRIMARY KEY,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      type TEXT NOT NULL,
      choices_json JSONB NOT NULL,
      answer_json JSONB NOT NULL,
      explanation TEXT NOT NULL,
      xp_reward INTEGER NOT NULL DEFAULT 5
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_skill_check_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_check_id TEXT NOT NULL REFERENCES skill_checks(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, skill_check_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content_json JSONB NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_pattern_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pattern_id TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, pattern_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS checkpoint_tests (
      id TEXT PRIMARY KEY,
      day_number INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      pass_percent INTEGER NOT NULL DEFAULT 70,
      xp_reward INTEGER NOT NULL DEFAULT 15
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS checkpoint_questions (
      id TEXT PRIMARY KEY,
      checkpoint_test_id TEXT NOT NULL REFERENCES checkpoint_tests(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      choices_json JSONB NOT NULL,
      answer_json JSONB NOT NULL,
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS checkpoint_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checkpoint_test_id TEXT NOT NULL REFERENCES checkpoint_tests(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS checkpoint_answers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checkpoint_test_id TEXT NOT NULL REFERENCES checkpoint_tests(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES checkpoint_questions(id) ON DELETE CASCADE,
      selected_index INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, question_id)
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
    CREATE INDEX IF NOT EXISTS skill_checks_day_number_idx
      ON skill_checks(day_number)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_skill_check_completions_user_id_idx
      ON user_skill_check_completions(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS patterns_day_number_idx ON patterns(day_number)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS user_pattern_completions_user_id_idx
      ON user_pattern_completions(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS checkpoint_questions_test_id_idx
      ON checkpoint_questions(checkpoint_test_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS checkpoint_attempts_user_id_idx
      ON checkpoint_attempts(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS checkpoint_answers_user_id_idx
      ON checkpoint_answers(user_id)
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
    CREATE UNIQUE INDEX IF NOT EXISTS lesson_steps_day_sort_idx
      ON lesson_steps(lesson_day, sort_order)
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
