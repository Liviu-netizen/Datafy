import "./server-only";

import { getDb } from "./db";
import { ensureContentSeeded } from "./lessons";
import { ensureProgressRow } from "./progress";

type CheckpointTestRow = {
  id: string;
  day_number: number;
  title: string;
  pass_percent: number;
  xp_reward: number;
};

type CheckpointQuestionRow = {
  id: string;
  checkpoint_test_id: string;
  type: string;
  prompt: string;
  choices_json: unknown;
  answer_json: unknown;
  explanation: string;
  difficulty: string;
};

type CheckpointQuestion = {
  id: string;
  checkpointTestId: string;
  type: "mcq" | "fix";
  prompt: string;
  choices: string[];
  answer: { correctIndex: number };
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

type CheckpointTest = {
  id: string;
  dayNumber: number;
  title: string;
  passPercent: number;
  xpReward: number;
  questions: CheckpointQuestion[];
};

type CheckpointProgress = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
};

type CheckpointAttempt = {
  score: number;
  passed: boolean;
  createdAt: string;
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

const mapQuestion = (row: CheckpointQuestionRow): CheckpointQuestion => ({
  id: String(row.id),
  checkpointTestId: String(row.checkpoint_test_id),
  type: row.type === "fix" ? "fix" : "mcq",
  prompt: String(row.prompt),
  choices: toStringArray(row.choices_json),
  answer: toAnswer(row.answer_json),
  explanation: String(row.explanation),
  difficulty: row.difficulty === "hard" ? "hard" : row.difficulty === "medium" ? "medium" : "easy",
});

const mapTest = (row: CheckpointTestRow, questions: CheckpointQuestion[]): CheckpointTest => ({
  id: String(row.id),
  dayNumber: Number(row.day_number),
  title: String(row.title),
  passPercent: Number(row.pass_percent),
  xpReward: Number(row.xp_reward),
  questions,
});

export const getCheckpointTestForDay = async (dayNumber: number) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, day_number, title, pass_percent, xp_reward
    FROM checkpoint_tests
    WHERE day_number = ${dayNumber}
    LIMIT 1
  `;
  const row = result.rows[0] as CheckpointTestRow | undefined;
  if (!row) {
    return null;
  }
  const questionResult = await db`
    SELECT id, checkpoint_test_id, type, prompt, choices_json, answer_json, explanation, difficulty
    FROM checkpoint_questions
    WHERE checkpoint_test_id = ${row.id}
    ORDER BY id
  `;
  const questions = questionResult.rows.map((item) => mapQuestion(item as CheckpointQuestionRow));
  return mapTest(row, questions);
};

export const getCheckpointTestById = async (testId: string) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, day_number, title, pass_percent, xp_reward
    FROM checkpoint_tests
    WHERE id = ${testId}
    LIMIT 1
  `;
  const row = result.rows[0] as CheckpointTestRow | undefined;
  if (!row) {
    return null;
  }
  const questionResult = await db`
    SELECT id, checkpoint_test_id, type, prompt, choices_json, answer_json, explanation, difficulty
    FROM checkpoint_questions
    WHERE checkpoint_test_id = ${row.id}
    ORDER BY id
  `;
  const questions = questionResult.rows.map((item) => mapQuestion(item as CheckpointQuestionRow));
  return mapTest(row, questions);
};

export const getCheckpointProgress = async (userId: number, testId: string) => {
  const db = await getDb();
  const result = await db`
    SELECT question_id, selected_index, is_correct
    FROM checkpoint_answers
    WHERE user_id = ${userId} AND checkpoint_test_id = ${testId}
  `;
  const map = new Map<string, CheckpointProgress>();
  result.rows.forEach((row) => {
    const progress = row as {
      question_id: string;
      selected_index: number;
      is_correct: boolean;
    };
    map.set(String(progress.question_id), {
      questionId: String(progress.question_id),
      selectedIndex: Number(progress.selected_index),
      isCorrect: Boolean(progress.is_correct),
    });
  });
  return map;
};

export const hasPassedCheckpoint = async (userId: number, testId: string) => {
  const db = await getDb();
  const result = await db`
    SELECT id
    FROM checkpoint_attempts
    WHERE user_id = ${userId} AND checkpoint_test_id = ${testId} AND passed = true
    LIMIT 1
  `;
  return Boolean(result.rows[0]);
};

export const getLatestCheckpointAttempt = async (
  userId: number,
  testId: string
): Promise<CheckpointAttempt | null> => {
  const db = await getDb();
  const result = await db`
    SELECT score, passed, created_at
    FROM checkpoint_attempts
    WHERE user_id = ${userId} AND checkpoint_test_id = ${testId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const row = result.rows[0] as { score: number; passed: boolean; created_at: string } | undefined;
  if (!row) {
    return null;
  }
  return {
    score: Number(row.score),
    passed: Boolean(row.passed),
    createdAt: String(row.created_at),
  };
};

export const recordCheckpointAnswer = async (
  userId: number,
  question: CheckpointQuestion,
  selectedIndex: number
) => {
  if (
    Number.isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= question.choices.length
  ) {
    return { ok: false, correct: false };
  }
  const isCorrect = selectedIndex === question.answer.correctIndex;
  const db = await getDb();
  await db`
    INSERT INTO checkpoint_answers (user_id, checkpoint_test_id, question_id, selected_index, is_correct)
    VALUES (${userId}, ${question.checkpointTestId}, ${question.id}, ${selectedIndex}, ${isCorrect})
    ON CONFLICT (user_id, question_id) DO UPDATE
      SET selected_index = EXCLUDED.selected_index,
          is_correct = EXCLUDED.is_correct,
          answered_at = NOW()
  `;
  return { ok: true, correct: isCorrect };
};

export const finalizeCheckpointAttempt = async (userId: number, test: CheckpointTest) => {
  await ensureProgressRow(userId);
  const db = await getDb();
  const alreadyPassed = await hasPassedCheckpoint(userId, test.id);
  const answers = await db`
    SELECT question_id, is_correct
    FROM checkpoint_answers
    WHERE user_id = ${userId} AND checkpoint_test_id = ${test.id}
  `;
  const correctCount = answers.rows.filter((row) => Boolean((row as { is_correct: boolean }).is_correct)).length;
  const totalQuestions = test.questions.length;
  const score = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= test.passPercent;

  let xpAwarded = 0;
  if (passed && !alreadyPassed) {
    xpAwarded = test.xpReward;
    await db`
      UPDATE user_progress
      SET xp = xp + ${xpAwarded},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  }

  await db`
    INSERT INTO checkpoint_attempts (user_id, checkpoint_test_id, score, passed)
    VALUES (${userId}, ${test.id}, ${score}, ${passed})
  `;

  return { score, passed, totalQuestions, correctCount, xpAwarded };
};

export const resetCheckpointAnswers = async (userId: number, testId: string) => {
  const db = await getDb();
  await db`
    DELETE FROM checkpoint_answers
    WHERE user_id = ${userId} AND checkpoint_test_id = ${testId}
  `;
};
