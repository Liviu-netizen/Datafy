import "./server-only";

import { getDb } from "./db";
import { ensureContentSeeded } from "./lessons";
import { ensureProgressRow } from "./progress";

type SkillCheckRow = {
  id: string;
  day_number: number;
  title: string;
  prompt: string;
  type: string;
  choices_json: unknown;
  answer_json: unknown;
  explanation: string;
  xp_reward: number;
};

type SkillCheck = {
  id: string;
  dayNumber: number;
  title: string;
  prompt: string;
  type: "mcq" | "fix";
  choices: string[];
  answer: { correctIndex: number };
  explanation: string;
  xpReward: number;
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }
  }
  return [];
};

const toAnswer = (value: unknown) => {
  if (!value) {
    return { correctIndex: 0 };
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as { correctIndex: number };
    } catch {
      return { correctIndex: 0 };
    }
  }
  if (typeof value === "object") {
    return value as { correctIndex: number };
  }
  return { correctIndex: 0 };
};

const mapSkillCheck = (row: SkillCheckRow): SkillCheck => ({
  id: String(row.id),
  dayNumber: Number(row.day_number),
  title: String(row.title),
  prompt: String(row.prompt),
  type: row.type === "fix" ? "fix" : "mcq",
  choices: toStringArray(row.choices_json),
  answer: toAnswer(row.answer_json),
  explanation: String(row.explanation),
  xpReward: Number(row.xp_reward),
});

export const getSkillCheckById = async (id: string) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, day_number, title, prompt, type, choices_json, answer_json, explanation, xp_reward
    FROM skill_checks
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = result.rows[0] as SkillCheckRow | undefined;
  return row ? mapSkillCheck(row) : null;
};

export const getSkillCheckCompletion = async (userId: number, checkId: string) => {
  const db = await getDb();
  const result = await db`
    SELECT completed_at
    FROM user_skill_check_completions
    WHERE user_id = ${userId} AND skill_check_id = ${checkId}
    LIMIT 1
  `;
  return Boolean(result.rows[0]);
};

export const getSkillChecksForDay = async (userId: number, dayNumber: number) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT sc.id,
      sc.day_number,
      sc.title,
      sc.prompt,
      sc.type,
      sc.choices_json,
      sc.answer_json,
      sc.explanation,
      sc.xp_reward,
      usc.completed_at
    FROM skill_checks sc
    LEFT JOIN user_skill_check_completions usc
      ON usc.skill_check_id = sc.id AND usc.user_id = ${userId}
    WHERE sc.day_number = ${dayNumber}
    ORDER BY sc.id
  `;
  return result.rows.map((row) => {
    const mapped = mapSkillCheck(row as SkillCheckRow);
    return {
      ...mapped,
      completed: Boolean((row as { completed_at?: string | null }).completed_at),
    };
  });
};

export const recordSkillCheckAnswer = async (
  userId: number,
  checkId: string,
  selectedIndex: number
) => {
  const check = await getSkillCheckById(checkId);
  if (
    !check ||
    Number.isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= check.choices.length
  ) {
    return { ok: false, correct: false, xpAwarded: 0 };
  }

  await ensureProgressRow(userId);
  const isCorrect = selectedIndex === check.answer.correctIndex;
  const db = await getDb();

  await db`
    INSERT INTO user_skill_checks (user_id, skill_check_id, selected_index, is_correct)
    VALUES (${userId}, ${check.id}, ${selectedIndex}, ${isCorrect})
    ON CONFLICT (user_id, skill_check_id) DO UPDATE
      SET selected_index = EXCLUDED.selected_index,
          is_correct = EXCLUDED.is_correct,
          completed_at = NOW()
  `;

  const existing = await db`
    SELECT completed_at
    FROM user_skill_check_completions
    WHERE user_id = ${userId} AND skill_check_id = ${check.id}
    LIMIT 1
  `;
  const alreadyCompleted = Boolean(existing.rows[0]);

  let xpAwarded = 0;
  if (isCorrect && !alreadyCompleted) {
    await db`
      INSERT INTO user_skill_check_completions (user_id, skill_check_id)
      VALUES (${userId}, ${check.id})
      ON CONFLICT (user_id, skill_check_id) DO NOTHING
    `;
    xpAwarded = check.xpReward;
    await db`
      UPDATE user_progress
      SET xp = xp + ${xpAwarded},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  }

  return { ok: true, correct: isCorrect, xpAwarded };
};
