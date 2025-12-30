import "server-only";
import { getDb } from "./db";
import { ensureProgressRow } from "./progress";

export type SkillCheck = {
  id: string;
  title: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
};

const SKILL_CHECKS: SkillCheck[] = [
  {
    id: "misleading-chart",
    title: "Spot the misleading chart",
    prompt:
      "A chart starts its y-axis at 90% to show a 2% increase. What would you tell your manager?",
    choices: [
      "The growth is massive; highlight the spike.",
      "The scale is misleading; show the y-axis from zero.",
      "Remove the axis to keep the chart clean.",
      "Use a 3D chart to emphasize the change.",
    ],
    correctIndex: 1,
    explanation:
      "A cropped axis exaggerates change. Use a zero baseline for honest context.",
    xpReward: 5,
  },
  {
    id: "right-metric",
    title: "Choose the right metric",
    prompt:
      "You want to track if users are getting value from a daily habit app. Which metric is best?",
    choices: [
      "Total downloads",
      "Daily active users",
      "Number of push notifications sent",
      "App store rating only",
    ],
    correctIndex: 1,
    explanation:
      "Daily active users reflects ongoing usage and value more than downloads.",
    xpReward: 5,
  },
  {
    id: "clean-category",
    title: "Clean messy categories",
    prompt:
      "A column mixes 'NY', 'New York', and 'new york'. What is the best first step?",
    choices: [
      "Create a standard mapping and normalize values.",
      "Delete the column to avoid confusion.",
      "Sort the column descending.",
      "Convert numbers to text.",
    ],
    correctIndex: 0,
    explanation:
      "Standardize labels first so counts and groups are accurate.",
    xpReward: 5,
  },
];

export const getSkillCheckById = (id: string) =>
  SKILL_CHECKS.find((check) => check.id === id) ?? null;

export const getSkillChecksForUser = async (userId: number) => {
  const db = await getDb();
  const result = await db`
    SELECT skill_check_id, is_correct
    FROM user_skill_checks
    WHERE user_id = ${userId}
  `;
  const completed = new Map<string, boolean>();
  for (const row of result.rows) {
    completed.set(String(row.skill_check_id), Boolean(row.is_correct));
  }

  return SKILL_CHECKS.map((check) => ({
    ...check,
    completed: completed.has(check.id),
    completedCorrect: completed.get(check.id) ?? false,
  }));
};

export const recordSkillCheckAnswer = async (
  userId: number,
  checkId: string,
  selectedIndex: number
) => {
  const check = getSkillCheckById(checkId);
  if (
    !check ||
    Number.isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= check.choices.length
  ) {
    return { ok: false, correct: false, xpAwarded: 0 };
  }

  await ensureProgressRow(userId);
  const isCorrect = selectedIndex === check.correctIndex;
  const db = await getDb();
  const existing = await db`
    SELECT is_correct
    FROM user_skill_checks
    WHERE user_id = ${userId} AND skill_check_id = ${check.id}
    LIMIT 1
  `;
  const previouslyCorrect = Boolean(existing.rows[0]?.is_correct);

  await db`
    INSERT INTO user_skill_checks (user_id, skill_check_id, selected_index, is_correct)
    VALUES (${userId}, ${check.id}, ${selectedIndex}, ${isCorrect})
    ON CONFLICT (user_id, skill_check_id) DO UPDATE
      SET selected_index = EXCLUDED.selected_index,
          is_correct = EXCLUDED.is_correct,
          completed_at = NOW()
  `;

  let xpAwarded = 0;
  if (isCorrect && !previouslyCorrect) {
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
