import "server-only";

import { getDb } from "./db";

const TOTAL_DAYS = 84;
const XP_PER_DAY = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

const parseDateString = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const daysBetween = (start: string, end: string) => {
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
};

const ensureProgressRow = async (userId: number) => {
  const db = await getDb();
  const existing = await db`
    SELECT user_id, start_date, xp, streak, last_completed_date
    FROM user_progress
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (existing.rows[0]) {
    const row = existing.rows[0] as ProgressRow;
    return {
      user_id: Number(row.user_id),
      start_date: String(row.start_date),
      xp: Number(row.xp),
      streak: Number(row.streak),
      last_completed_date: row.last_completed_date ? String(row.last_completed_date) : null,
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
  return {
    user_id: Number(row.user_id),
    start_date: String(row.start_date),
    xp: Number(row.xp),
    streak: Number(row.streak),
    last_completed_date: row.last_completed_date ? String(row.last_completed_date) : null,
  };
};

const getDayNumber = (startDate: string, today: string) =>
  daysBetween(startDate, today) + 1;

const getYesterdayString = (today: string) => {
  const date = parseDateString(today);
  date.setDate(date.getDate() - 1);
  return toDateStringLocal(date);
};

const isTodayCompleted = async (userId: number, dayNumber: number) => {
  const db = await getDb();
  const result = await db`
    SELECT day
    FROM user_days
    WHERE user_id = ${userId} AND day = ${dayNumber}
    LIMIT 1
  `;
  return Boolean(result.rows[0]);
};

const resetStreakIfMissed = async (progress: ProgressRow, today: string) => {
  if (!progress.last_completed_date) {
    return progress;
  }

  const yesterday = getYesterdayString(today);
  const lastDate = progress.last_completed_date;
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
  const dayNumber = getDayNumber(normalized.start_date, today);
  const cappedDay = Math.min(dayNumber, TOTAL_DAYS);
  const completedAll = dayNumber > TOTAL_DAYS;
  const todayCompleted = !completedAll && (await isTodayCompleted(userId, dayNumber));

  return {
    dayNumber: cappedDay,
    totalDays: TOTAL_DAYS,
    xp: normalized.xp,
    streak: normalized.streak,
    today,
    todayCompleted,
    canComplete: !completedAll && !todayCompleted,
    completedAll,
  };
};

export const completeToday = async (userId: number) => {
  const today = todayString();
  const progress = await ensureProgressRow(userId);
  const dayNumber = getDayNumber(progress.start_date, today);

  if (dayNumber > TOTAL_DAYS) {
    return { status: "finished" as const };
  }

  if (await isTodayCompleted(userId, dayNumber)) {
    return { status: "already" as const };
  }

  const yesterday = getYesterdayString(today);
  const lastDate = progress.last_completed_date ?? null;
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
