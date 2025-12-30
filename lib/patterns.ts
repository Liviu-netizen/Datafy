import "./server-only";

import { getDb } from "./db";
import { ensureContentSeeded } from "./lessons";
import { Visual } from "./visual";

type PatternRow = {
  id: string;
  day_number: number;
  title: string;
  description: string;
  content_json: unknown;
};

type PatternSection =
  | {
      type: "text";
      title?: string;
      body: string;
      bullets?: string[];
    }
  | {
      type: "visual";
      title?: string;
      visual: Visual;
    };

type PatternContent = {
  intro: string;
  sections: PatternSection[];
  takeaway: string;
};

type Pattern = {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  content: PatternContent;
};

const toPatternContent = (value: unknown): PatternContent => {
  if (!value) {
    return { intro: "", sections: [], takeaway: "" };
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PatternContent;
    } catch {
      return { intro: "", sections: [], takeaway: "" };
    }
  }
  if (typeof value === "object") {
    return value as PatternContent;
  }
  return { intro: "", sections: [], takeaway: "" };
};

const mapPattern = (row: PatternRow): Pattern => ({
  id: String(row.id),
  dayNumber: Number(row.day_number),
  title: String(row.title),
  description: String(row.description),
  content: toPatternContent(row.content_json),
});

export const getPatternById = async (id: string) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, day_number, title, description, content_json
    FROM patterns
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = result.rows[0] as PatternRow | undefined;
  return row ? mapPattern(row) : null;
};

export const getPatternsForDay = async (userId: number, dayNumber: number) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT p.id,
      p.day_number,
      p.title,
      p.description,
      p.content_json,
      up.completed_at
    FROM patterns p
    LEFT JOIN user_pattern_completions up
      ON up.pattern_id = p.id AND up.user_id = ${userId}
    WHERE p.day_number = ${dayNumber}
    ORDER BY p.id
  `;
  return result.rows.map((row) => {
    const mapped = mapPattern(row as PatternRow);
    return {
      ...mapped,
      completed: Boolean((row as { completed_at?: string | null }).completed_at),
    };
  });
};

export const isPatternCompleted = async (userId: number, patternId: string) => {
  const db = await getDb();
  const result = await db`
    SELECT completed_at
    FROM user_pattern_completions
    WHERE user_id = ${userId} AND pattern_id = ${patternId}
    LIMIT 1
  `;
  return Boolean(result.rows[0]);
};

export const markPatternCompleted = async (userId: number, patternId: string) => {
  const db = await getDb();
  await db`
    INSERT INTO user_pattern_completions (user_id, pattern_id)
    VALUES (${userId}, ${patternId})
    ON CONFLICT (user_id, pattern_id) DO NOTHING
  `;
};
