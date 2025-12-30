import "./server-only";
import { getDb } from "./db";

const TOTAL_DAYS = 84;
const XP_PER_DAY = 10;

type ProgressRow = {
  user_id: number;
  start_date: string;
  xp: number;
  streak: number;
  last_completed_date?: string | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");
const toDateStringLocal = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const todayString = () => toDateStringLocal(new Date());

const normalizeDateValue = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return toDateStringLocal(value);
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toDateStringLocal(parsed);
  }
  return trimmed;
};

const normalizeDateValueString = (value?: string | Date | null) =>
  normalizeDateValue(value) ?? todayString();

const parseDateString = (value: string) => {
  const normalized = normalizeDateValue(value) ?? todayString();
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const ensureProgressRow = async (userId: number) => {
  const db = await getDb();
  const existing = await db`
    SELECT user_id, start_date, xp, streak, last_completed_date
    FROM user_progress
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (existing.rows[0]) {
    const row = existing.rows[0] as ProgressRow;
    const startDate = normalizeDateValueString(row.start_date);
    const lastCompleted = normalizeDateValue(row.last_completed_date);
    return {
      user_id: Number(row.user_id),
      start_date: startDate,
      xp: Number(row.xp),
      streak: Number(row.streak),
      last_completed_date: lastCompleted,
    };
  }

  const startDate = todayString();
  await db`
    INSERT INTO user_progress (user_id, start_date)
    VALUES (${userId}, ${startDate})
    ON CONFLICT (user_id) DO NOTHING
  `;

  const inserted = await db`
    SELECT user_id, start_date, xp, streak, last_completed_date
    FROM user_progress
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = inserted.rows[0] as ProgressRow;
  const insertedStartDate = normalizeDateValueString(row.start_date);
  const lastCompleted = normalizeDateValue(row.last_completed_date);
  return {
    user_id: Number(row.user_id),
    start_date: insertedStartDate,
    xp: Number(row.xp),
    streak: Number(row.streak),
    last_completed_date: lastCompleted,
  };
};

const getYesterdayString = (today: string) => {
  const date = parseDateString(today);
  date.setDate(date.getDate() - 1);
  return toDateStringLocal(date);
};

const hasUserDay = async (userId: number, dayNumber: number) => {
  const db = await getDb();
  const result = await db`
    SELECT day
    FROM user_days
    WHERE user_id = ${userId} AND day = ${dayNumber}
    LIMIT 1
  `;
  return Boolean(result.rows[0]);
};

const getLessonProgressCounts = async (userId: number, dayNumber: number) => {
  const db = await getDb();
  const result = await db`
    SELECT
      (SELECT COUNT(*) FROM lesson_steps WHERE lesson_day = ${dayNumber}) AS total_steps,
      (SELECT COUNT(*)
         FROM user_step_progress sp
         INNER JOIN lesson_steps ls ON ls.id = sp.step_id
         WHERE sp.user_id = ${userId} AND ls.lesson_day = ${dayNumber}
      ) AS completed_steps
  `;
  const row = result.rows[0] as {
    total_steps: string | number;
    completed_steps: string | number;
  };
  return {
    total: Number(row.total_steps),
    completed: Number(row.completed_steps),
  };
};

export const isLessonStepsComplete = async (
  userId: number,
  dayNumber: number
) => {
  const counts = await getLessonProgressCounts(userId, dayNumber);
  return counts.total > 0 && counts.completed >= counts.total;
};

const recordLessonCompletion = async (
  userId: number,
  dayNumber: number,
  progress: ProgressRow,
  today: string
) => {
  if (await hasUserDay(userId, dayNumber)) {
    return { status: "already" as const };
  }

  const yesterday = getYesterdayString(today);
  const lastDate = normalizeDateValueString(progress.last_completed_date);
  const streak = lastDate === yesterday ? progress.streak + 1 : 1;
  const xp = progress.xp + XP_PER_DAY;

  const db = await getDb();
  await db`
    INSERT INTO user_days (user_id, day, completed_date)
    VALUES (${userId}, ${dayNumber}, ${today})
  `;
  await db`
    UPDATE user_progress
    SET xp = ${xp},
        streak = ${streak},
        last_completed_date = ${today},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  return { status: "completed" as const };
};

const getMaxPassedCheckpointDay = async (userId: number) => {
  const db = await getDb();
  const result = await db`
    SELECT COALESCE(MAX(ct.day_number), 0) AS max_day
    FROM checkpoint_attempts ca
    INNER JOIN checkpoint_tests ct
      ON ct.id = ca.checkpoint_test_id
    WHERE ca.user_id = ${userId} AND ca.passed = true
  `;
  const maxDay = Number(result.rows[0]?.max_day ?? 0);
  return Number.isFinite(maxDay) ? maxDay : 0;
};

export const getCompletedDays = async (userId: number) => {
  const db = await getDb();
  const result = await db`
    SELECT day
    FROM user_days
    WHERE user_id = ${userId}
    ORDER BY day
  `;
  return result.rows.map((row) => Number(row.day));
};

const resetStreakIfMissed = async (progress: ProgressRow, today: string) => {
  if (!progress.last_completed_date) {
    return progress;
  }

  const yesterday = getYesterdayString(today);
  const lastDate = normalizeDateValueString(progress.last_completed_date);
  const isStreakValid = lastDate === today || lastDate === yesterday;

  if (!isStreakValid && progress.streak !== 0) {
    const db = await getDb();
    await db`
      UPDATE user_progress
      SET streak = 0, updated_at = NOW()
      WHERE user_id = ${progress.user_id}
    `;
    return { ...progress, streak: 0 };
  }

  return progress;
};

export const getDashboardData = async (userId: number) => {
  const today = todayString();
  const progress = await ensureProgressRow(userId);
  const normalized = await resetStreakIfMissed(progress, today);
  const maxPassedCheckpoint = await getMaxPassedCheckpointDay(userId);
  const dayNumber = Math.min(maxPassedCheckpoint + 1, TOTAL_DAYS);
  const completedAll = maxPassedCheckpoint >= TOTAL_DAYS;
  const hasDay = await hasUserDay(userId, dayNumber);
  const progressComplete = !completedAll && (await isLessonStepsComplete(userId, dayNumber));
  const lessonCompleted = !completedAll && (hasDay || progressComplete);
  if (!completedAll && progressComplete && !hasDay) {
    await recordLessonCompletion(userId, dayNumber, normalized, today);
  }
  const checkpointPassed = maxPassedCheckpoint >= dayNumber;

  return {
    dayNumber,
    totalDays: TOTAL_DAYS,
    xp: normalized.xp,
    streak: normalized.streak,
    today,
    lessonCompleted,
    checkpointPassed,
    canComplete: !completedAll && !lessonCompleted,
    canTakeCheckpoint: !completedAll && lessonCompleted && !checkpointPassed,
    completedAll,
  };
};

export const completeToday = async (userId: number) => {
  const today = todayString();
  const progress = await ensureProgressRow(userId);
  const maxPassedCheckpoint = await getMaxPassedCheckpointDay(userId);
  const dayNumber = Math.min(maxPassedCheckpoint + 1, TOTAL_DAYS);

  if (dayNumber > TOTAL_DAYS) {
    return { status: "finished" as const };
  }

  return recordLessonCompletion(userId, dayNumber, progress, today);
};
