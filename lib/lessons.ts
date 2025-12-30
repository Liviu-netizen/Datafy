import "./server-only";

import { getDb } from "./db";
import { parseVisual, Visual } from "./visual";

type LessonRow = {
  day: number;
  title: string;
  micro_goal: string;
  recap_bullets: unknown;
  real_world_line: string | null;
};

type QuestionRow = {
  id: number;
  lesson_day: number;
  sort_order: number;
  type: string;
  prompt: string;
  options: unknown;
  correct_index: number;
  feedback_correct: string;
  feedback_incorrect: string;
};

type AnswerRow = {
  question_id: number;
  selected_index: number;
  is_correct: boolean;
};

type LessonStepRow = {
  id: number;
  lesson_day: number;
  sort_order: number;
  type: string;
  title: string | null;
  body: string | null;
  example: string | null;
  prompt: string | null;
  choices: unknown;
  correct_index: number | null;
  explanation: string | null;
  visual_json: unknown;
};

type StepProgressRow = {
  step_id: number;
  selected_index: number | null;
  is_correct: boolean | null;
};

type Question = {
  id: number;
  lessonDay: number;
  sortOrder: number;
  type: "multiple_choice" | "fix_the_mistake";
  prompt: string;
  options: string[];
  correctIndex: number;
  feedbackCorrect: string;
  feedbackIncorrect: string;
};

type Lesson = {
  day: number;
  title: string;
  microGoal: string;
  recapBullets: string[];
  realWorldLine: string;
  steps: LessonStep[];
};

type QuestionSeed = {
  type: "multiple_choice" | "fix_the_mistake";
  prompt: string;
  options: string[];
  correctIndex: number;
  feedbackCorrect: string;
  feedbackIncorrect: string;
};

type LessonStep = {
  id: number;
  lessonDay: number;
  sortOrder: number;
  type: "intuition" | "learn" | "visual" | "mcq" | "fix";
  title?: string | null;
  body?: string | null;
  example?: string | null;
  prompt?: string | null;
  choices?: string[];
  correctIndex?: number | null;
  explanation?: string | null;
  visual?: Visual | null;
};

type LessonStepSeed = {
  type: "intuition" | "learn" | "visual" | "mcq" | "fix";
  title?: string;
  body?: string;
  example?: string;
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
  visual?: Visual;
};

type Scenario = Record<string, string>;

type WeekScaffold = {
  intuition: LessonStepSeed;
  learn: LessonStepSeed[];
  recap?: LessonStepSeed;
};

const CONTENT_SEED_VERSION = 1;
let seeded = false;

const weekPlans = [
  {
    week: 1,
    dayTitles: [
      "Good questions vs bad questions",
      "Metrics that drive action",
      "Correlation vs causation",
      "Read charts without lying",
      "Define a clear decision",
      "Choose a baseline",
      "Summarize for a manager",
    ],
    microGoals: [
      "Write a question that leads to a clear next step.",
      "Choose a metric that changes behavior, not just attention.",
      "Avoid claiming cause when you only see a pattern.",
      "Spot misleading chart choices and fix them.",
      "Tie analysis to one business decision.",
      "Compare results to a fair baseline.",
      "Summarize insights in one clear message.",
    ],
    scenarios: [
      {
        product: "subscription app",
        metric: "trial activation rate",
        vanityMetric: "app installs",
        segment: "new users",
      },
      {
        product: "online store",
        metric: "checkout conversion",
        vanityMetric: "website visits",
        segment: "mobile shoppers",
      },
      {
        product: "delivery service",
        metric: "on-time rate",
        vanityMetric: "order volume",
        segment: "evening orders",
      },
      {
        product: "learning platform",
        metric: "lesson completion rate",
        vanityMetric: "sign-ups",
        segment: "free users",
      },
      {
        product: "support team",
        metric: "first response time",
        vanityMetric: "tickets created",
        segment: "enterprise accounts",
      },
      {
        product: "marketing campaign",
        metric: "lead-to-demo rate",
        vanityMetric: "ad impressions",
        segment: "paid search",
      },
      {
        product: "B2B SaaS",
        metric: "weekly active accounts",
        vanityMetric: "email opens",
        segment: "new trials",
      },
    ],
  },
  {
    week: 2,
    dayTitles: [
      "Clean messy rows",
      "Fix text issues",
      "Fix dates",
      "IF basics",
      "COUNTIF and SUMIF",
      "Remove duplicates safely",
      "Cleanup checklist",
    ],
    microGoals: [
      "Find and remove obvious data issues before analysis.",
      "Standardize text so categories match.",
      "Convert text dates into usable dates.",
      "Use IF to label rows for analysis.",
      "Use COUNTIF/SUMIF to summarize quickly.",
      "Remove duplicates without losing valid rows.",
      "Build a repeatable cleanup flow.",
    ],
    scenarios: [
      { file: "orders.csv", column: "Customer Name", dateColumn: "Order Date", metric: "Revenue" },
      { file: "leads.xlsx", column: "Company", dateColumn: "Lead Date", metric: "Qualified Leads" },
      { file: "tickets.xlsx", column: "Category", dateColumn: "Created Date", metric: "Resolved Tickets" },
      { file: "subscriptions.csv", column: "Plan", dateColumn: "Start Date", metric: "Active Plans" },
      { file: "returns.csv", column: "Reason", dateColumn: "Return Date", metric: "Return Rate" },
      { file: "campaigns.csv", column: "Channel", dateColumn: "Send Date", metric: "Clicks" },
      { file: "inventory.csv", column: "SKU", dateColumn: "Restock Date", metric: "Units" },
    ],
  },
  {
    week: 3,
    dayTitles: [
      "Pivot tables: first build",
      "Sort and filter",
      "Pivot chart",
      "Slicers and filters",
      "Simple KPI dashboard",
      "Highlight key changes",
      "Tell the story",
    ],
    microGoals: [
      "Create a pivot table that answers a basic question.",
      "Use sorting and filters to surface top drivers.",
      "Turn a pivot into a readable chart.",
      "Add slicers to make the analysis interactive.",
      "Lay out a simple KPI dashboard.",
      "Spot a change worth calling out.",
      "Explain the insight in plain business terms.",
    ],
    scenarios: [
      { dataset: "sales data", dimension: "region", metric: "revenue" },
      { dataset: "support tickets", dimension: "issue type", metric: "ticket count" },
      { dataset: "subscriptions", dimension: "plan", metric: "active accounts" },
      { dataset: "marketing data", dimension: "channel", metric: "leads" },
      { dataset: "product usage", dimension: "feature", metric: "weekly users" },
      { dataset: "shipping data", dimension: "carrier", metric: "on-time deliveries" },
      { dataset: "retail data", dimension: "store", metric: "units sold" },
    ],
  },
  {
    week: 4,
    dayTitles: [
      "Project kickoff",
      "Clean the data",
      "Build core metrics",
      "Summarize with pivot",
      "Find a trend",
      "Draft the dashboard",
      "Present the insight",
    ],
    microGoals: [
      "Define the project question and success metric.",
      "Remove errors that block analysis.",
      "Create the core calculated fields.",
      "Summarize results with a pivot table.",
      "Spot a trend worth sharing.",
      "Lay out a clean Excel dashboard.",
      "Deliver a clear business recommendation.",
    ],
    scenarios: [
      { project: "retail weekly sales", metric: "weekly revenue", dimension: "store" },
      { project: "subscription churn", metric: "churn rate", dimension: "plan" },
      { project: "marketing leads", metric: "lead conversion", dimension: "channel" },
      { project: "support workload", metric: "tickets per agent", dimension: "team" },
      { project: "delivery performance", metric: "on-time rate", dimension: "carrier" },
      { project: "product usage", metric: "feature adoption", dimension: "feature" },
      { project: "inventory health", metric: "stockouts", dimension: "category" },
    ],
  },
  {
    week: 5,
    dayTitles: [
      "Select the right columns",
      "Filter with WHERE",
      "AND / OR logic",
      "IN, BETWEEN, LIKE",
      "Order and limit",
      "Handle NULLs",
      "Basic report query",
    ],
    microGoals: [
      "Write a basic SELECT statement for a business question.",
      "Filter rows to the right time and segment.",
      "Combine filters correctly.",
      "Use IN/BETWEEN/LIKE for common filters.",
      "Sort results for quick review.",
      "Handle missing data safely.",
      "Build a clean query for a simple report.",
    ],
    scenarios: [
      { table: "orders", metric: "revenue", segment: "paid customers" },
      { table: "tickets", metric: "tickets", segment: "priority = high" },
      { table: "subscriptions", metric: "active accounts", segment: "plan = pro" },
      { table: "sessions", metric: "sessions", segment: "country = US" },
      { table: "leads", metric: "leads", segment: "channel = email" },
      { table: "shipments", metric: "deliveries", segment: "carrier = FastShip" },
      { table: "users", metric: "sign-ups", segment: "source = referral" },
    ],
  },
  {
    week: 6,
    dayTitles: [
      "Group by basics",
      "HAVING vs WHERE",
      "Join two tables",
      "Join with filters",
      "Aggregate after joins",
      "Avoid double counts",
      "SQL summary",
    ],
    microGoals: [
      "Summarize data with GROUP BY.",
      "Filter aggregates with HAVING.",
      "Join tables for a fuller view.",
      "Combine joins and filters safely.",
      "Aggregate metrics after joining.",
      "Prevent double counting in joins.",
      "Deliver a clear SQL summary.",
    ],
    scenarios: [
      { left: "orders", right: "customers", metric: "revenue", dimension: "customer" },
      { left: "tickets", right: "agents", metric: "tickets", dimension: "agent" },
      { left: "subscriptions", right: "plans", metric: "active accounts", dimension: "plan" },
      { left: "sessions", right: "users", metric: "sessions", dimension: "user" },
      { left: "shipments", right: "carriers", metric: "on-time rate", dimension: "carrier" },
      { left: "leads", right: "campaigns", metric: "leads", dimension: "campaign" },
      { left: "orders", right: "products", metric: "units", dimension: "category" },
    ],
  },
  {
    week: 7,
    dayTitles: [
      "Pick the right chart",
      "Build a KPI board",
      "Use filters",
      "Visual hierarchy",
      "Tell a clean story",
      "Highlight changes",
      "Dashboard check",
    ],
    microGoals: [
      "Match chart type to the question.",
      "Create clear KPI cards.",
      "Add filters for common segments.",
      "Guide attention with layout and color.",
      "Remove clutter and focus the story.",
      "Highlight the biggest movement.",
      "Review the dashboard for clarity.",
    ],
    scenarios: [
      { dashboard: "sales overview", metric: "revenue", segment: "region" },
      { dashboard: "support health", metric: "response time", segment: "team" },
      { dashboard: "marketing performance", metric: "lead conversion", segment: "channel" },
      { dashboard: "product usage", metric: "active users", segment: "plan" },
      { dashboard: "delivery performance", metric: "on-time rate", segment: "carrier" },
      { dashboard: "finance snapshot", metric: "gross margin", segment: "category" },
      { dashboard: "growth report", metric: "new accounts", segment: "source" },
    ],
  },
  {
    week: 8,
    dayTitles: [
      "Define dashboard goal",
      "Prepare the dataset",
      "Model relationships",
      "Build KPI cards",
      "Build trend view",
      "Add segment filters",
      "Final dashboard review",
    ],
    microGoals: [
      "State the single question the dashboard answers.",
      "Clean the data before modeling.",
      "Set relationships so metrics are accurate.",
      "Create KPI cards that match the goal.",
      "Add a clear trend chart.",
      "Add filters for key segments.",
      "Validate the dashboard before sharing.",
    ],
    scenarios: [
      { project: "sales pipeline", metric: "won deals", segment: "region" },
      { project: "subscription health", metric: "churn rate", segment: "plan" },
      { project: "support load", metric: "open tickets", segment: "priority" },
      { project: "marketing ROI", metric: "qualified leads", segment: "channel" },
      { project: "product adoption", metric: "feature usage", segment: "plan" },
      { project: "delivery SLA", metric: "late deliveries", segment: "carrier" },
      { project: "inventory risk", metric: "stockouts", segment: "category" },
    ],
  },
  {
    week: 9,
    dayTitles: [
      "Load a CSV",
      "Inspect columns",
      "Clean column names",
      "Handle missing data",
      "Filter rows",
      "Create new columns",
      "Export clean data",
    ],
    microGoals: [
      "Load data with pandas.",
      "Inspect columns and data types.",
      "Standardize column names.",
      "Handle missing values safely.",
      "Filter rows for analysis.",
      "Create a simple calculated column.",
      "Export clean data for sharing.",
    ],
    scenarios: [
      { file: "orders.csv", metric: "revenue", column: "Order Status" },
      { file: "tickets.csv", metric: "tickets", column: "Priority" },
      { file: "subscriptions.csv", metric: "active", column: "Plan" },
      { file: "sessions.csv", metric: "sessions", column: "Country" },
      { file: "leads.csv", metric: "leads", column: "Channel" },
      { file: "shipments.csv", metric: "deliveries", column: "Carrier" },
      { file: "products.csv", metric: "units", column: "Category" },
    ],
  },
  {
    week: 10,
    dayTitles: [
      "Group and summarize",
      "Trend over time",
      "Segment by category",
      "Top and bottom",
      "Simple pivot",
      "Merge datasets",
      "Write a summary",
    ],
    microGoals: [
      "Summarize data with groupby.",
      "Build a simple time trend.",
      "Compare segments clearly.",
      "Find top and bottom performers.",
      "Create a pivot-style summary.",
      "Merge two datasets safely.",
      "Write a business summary from results.",
    ],
    scenarios: [
      { metric: "revenue", dimension: "region" },
      { metric: "tickets", dimension: "issue type" },
      { metric: "active users", dimension: "plan" },
      { metric: "conversion rate", dimension: "channel" },
      { metric: "on-time rate", dimension: "carrier" },
      { metric: "refunds", dimension: "reason" },
      { metric: "feature usage", dimension: "feature" },
    ],
  },
  {
    week: 11,
    dayTitles: [
      "Define a cohort",
      "Cohort comparison",
      "Retention logic",
      "A/B test logic",
      "Guardrail metrics",
      "Sanity checks",
      "Recommendation",
    ],
    microGoals: [
      "Group users by a shared start date.",
      "Compare cohorts fairly.",
      "Interpret retention without heavy math.",
      "Understand basic A/B test logic.",
      "Use guardrail metrics to avoid harm.",
      "Validate results before sharing.",
      "Recommend a next step based on evidence.",
    ],
    scenarios: [
      { product: "subscription app", metric: "week 2 retention" },
      { product: "learning app", metric: "lesson completion" },
      { product: "marketplace", metric: "repeat buyers" },
      { product: "support tool", metric: "ticket resolution" },
      { product: "delivery app", metric: "on-time rate" },
      { product: "ecommerce site", metric: "checkout conversion" },
      { product: "B2B SaaS", metric: "active accounts" },
    ],
  },
  {
    week: 12,
    dayTitles: [
      "Clarify the case",
      "Pick the right metric",
      "Clean and analyze",
      "Explain the chart",
      "Executive summary",
      "Interview drills",
      "Final review",
    ],
    microGoals: [
      "Ask clarifying questions before you analyze.",
      "Choose the metric that matches the goal.",
      "Clean data and answer the prompt.",
      "Explain a chart in plain language.",
      "Write a short executive summary.",
      "Practice common interview prompts.",
      "Review your full analysis flow.",
    ],
    scenarios: [
      { case: "subscription churn", metric: "churn rate" },
      { case: "sales decline", metric: "weekly revenue" },
      { case: "support backlog", metric: "open tickets" },
      { case: "marketing ROI", metric: "qualified leads" },
      { case: "product adoption", metric: "feature usage" },
      { case: "delivery delays", metric: "late deliveries" },
      { case: "inventory risk", metric: "stockouts" },
    ],
  },
];

const week1MicroGoals = [
  "Turn a vague question into one clear next step.",
  "Pick a number that guides action, not just attention.",
  "Tell the difference between a pattern and a cause.",
  "Spot chart choices that exaggerate a change.",
  "Connect a question to a single decision.",
  "Compare results to a fair starting point.",
  "Sum up the story in one short update.",
];

const week2MicroGoals = [
  "Clean a spreadsheet list so it is ready to use.",
  "Make names and labels match exactly.",
  "Standardize dates so they sort correctly.",
  "Use IF to label rows with a simple rule.",
  "Use COUNTIF and SUMIF to total with a rule.",
  "Remove duplicates without losing real records.",
  "Use a simple cleanup checklist before sharing.",
];

const toOptions = (value: unknown) => {
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

const toExplanation = (value: string) =>
  value.replace(/^Correct\.?\s*/i, "").replace(/^Not quite\.?\s*/i, "").trim();

const managerQuestion = (scenario: Scenario, focus: string) => ({
  type: "multiple_choice" as const,
  prompt: `What would you tell your manager? (${focus})`,
  options: [
    `I found a clear change in ${scenario.metric || "the key metric"} and recommend a specific next step.`,
    "The data is interesting, but I do not know what to do next.",
    "Everything looks fine, so we should stop tracking this.",
    "The numbers moved, but I did not check what action to take.",
  ],
  correctIndex: 0,
  feedbackCorrect: "Correct. Lead with the insight and the action.",
  feedbackIncorrect: "Not quite. Share the insight and a clear next step.",
});

const buildWeek1Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `Which question is most actionable for the ${scenario.product}?`,
    options: [
      "Do users like the product?",
      `Which step causes the biggest drop in ${scenario.metric}?`,
      `How many ${scenario.vanityMetric} did we get?`,
      "Is the market competitive?",
    ],
    correctIndex: 1,
    feedbackCorrect: "Correct. It points to a specific action.",
    feedbackIncorrect: "Not quite. Choose the option tied to a clear action.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: "We are winning because ${scenario.vanityMetric} went up."`,
    options: [
      `Check whether ${scenario.metric} improved too.`,
      "Report installs only and skip other metrics.",
      "Ignore the drop in retention.",
      "Change the chart colors.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Tie the story to a meaningful metric.",
    feedbackIncorrect: "Not quite. Validate impact on the real metric.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `After a new banner, ${scenario.metric} rose. What is the safest statement?`,
    options: [
      "The banner caused the lift.",
      "The lift happened, but we need more evidence before claiming cause.",
      "Metrics only move for one reason.",
      "The change is too small to matter.",
    ],
    correctIndex: 1,
    feedbackCorrect: "Correct. Correlation is not proof of cause.",
    feedbackIncorrect: "Not quite. Avoid claiming cause without evidence.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: A chart starts at 90 and makes a small change look huge.",
    options: [
      "Use a full axis or call out the scale clearly.",
      "Remove the axis labels.",
      "Only show the last day.",
      "Replace the chart with a table of raw data.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Keep the scale honest.",
    feedbackIncorrect: "Not quite. Fix the scale so it is not misleading.",
  },
  managerQuestion(scenario, "data thinking"),
];

const buildWeek2Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `You open ${scenario.file}. What should you do first?`,
    options: [
      "Build a chart immediately.",
      "Check for missing rows, duplicates, and column types.",
      "Hide columns you do not like.",
      "Send the file to your manager.",
    ],
    correctIndex: 1,
    feedbackCorrect: "Correct. Clean structure first.",
    feedbackIncorrect: "Not quite. Start with basic cleanup checks.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: ${scenario.column} has extra spaces, and counts look wrong.`,
    options: [
      `Use TRIM on ${scenario.column}, then count.`,
      "Sort the column A to Z only.",
      "Change the font size.",
      "Hide the rows with spaces.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Trim spaces before counting.",
    feedbackIncorrect: "Not quite. Remove extra spaces first.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `Which Excel function fits: "Sum ${scenario.metric} where Status = 'Paid'"?`,
    options: ["SUMIF", "COUNTIF", "IFERROR", "VLOOKUP"],
    correctIndex: 0,
    feedbackCorrect: "Correct. SUMIF matches a condition.",
    feedbackIncorrect: "Not quite. Use SUMIF for conditional sums.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `${scenario.dateColumn} is stored as text and sorting is wrong. What is the fix?`,
    options: [
      "Convert text to real dates (Text to Columns or DATEVALUE).",
      "Sort A to Z again.",
      "Change the cell color.",
      "Move the column to the end.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Convert to a real date.",
    feedbackIncorrect: "Not quite. Fix the date type first.",
  },
  managerQuestion(scenario, "Excel cleanup"),
];

const buildWeek3Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `You need ${scenario.metric} by ${scenario.dimension}. What should you use?`,
    options: ["Pivot table", "Merge cells", "Spell check", "Freeze panes"],
    correctIndex: 0,
    feedbackCorrect: "Correct. Pivot tables summarize fast.",
    feedbackIncorrect: "Not quite. Use a pivot table for summaries.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: Your pivot shows Count but you need Sum.",
    options: [
      "Change the value field summary to Sum.",
      "Sort the pivot A to Z.",
      "Add a slicer only.",
      "Convert the sheet to PDF.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Adjust the value field settings.",
    feedbackIncorrect: "Not quite. Switch Count to Sum.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `Which step quickly finds the top ${scenario.dimension} for ${scenario.metric}?`,
    options: [
      "Sort descending by the metric.",
      "Hide every other row.",
      "Use a random filter.",
      "Alphabetize by name.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Sort by the metric.",
    feedbackIncorrect: "Not quite. Sort descending by the metric.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: A chart has 40 categories and is unreadable.",
    options: [
      "Filter to top categories and group the rest as Other.",
      "Make the chart wider.",
      "Use brighter colors only.",
      "Remove labels entirely.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Reduce clutter with a top list.",
    feedbackIncorrect: "Not quite. Reduce categories to improve clarity.",
  },
  managerQuestion(scenario, "Excel analysis"),
];

const buildWeek4Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `Project: ${scenario.project}. What is the best first step?`,
    options: [
      "Define the business question and success metric.",
      "Pick colors for the dashboard.",
      "Write a long report.",
      "Share raw data immediately.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Start with the question and metric.",
    feedbackIncorrect: "Not quite. Define the question first.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You calculate a metric before removing duplicate rows.",
    options: [
      "Remove duplicates, then recalculate.",
      "Ignore duplicates for speed.",
      "Sort the data only.",
      "Change the metric definition.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Clean before calculating.",
    feedbackIncorrect: "Not quite. Clean duplicates first.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `Which pivot layout best summarizes ${scenario.metric} by ${scenario.dimension}?`,
    options: [
      `${scenario.dimension} in rows, ${scenario.metric} as values.`,
      `${scenario.metric} in rows, ${scenario.dimension} as values.`,
      "Keep all fields in one column.",
      "Do not use a pivot.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Dimension in rows, metric in values.",
    feedbackIncorrect: "Not quite. Use dimension rows and metric values.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: The chart shows totals but hides the trend.",
    options: [
      "Use a line chart over time for the trend.",
      "Switch to a 3D pie chart.",
      "Remove the time field.",
      "Sort alphabetically.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Show the trend over time.",
    feedbackIncorrect: "Not quite. Use a time trend chart.",
  },
  managerQuestion(scenario, "Excel project"),
];

const buildWeek5Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `Which query selects ${scenario.metric} from ${scenario.table}?`,
    options: [
      `SELECT ${scenario.metric} FROM ${scenario.table};`,
      `GET ${scenario.metric} IN ${scenario.table};`,
      `PICK ${scenario.metric} OF ${scenario.table};`,
      `SHOW ${scenario.metric} WITH ${scenario.table};`,
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Use SELECT ... FROM.",
    feedbackIncorrect: "Not quite. Use SELECT ... FROM.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: The query pulls all rows, but you only need ${scenario.segment}.`,
    options: [
      `Add a WHERE filter for ${scenario.segment}.`,
      "Remove the FROM clause.",
      "Add a GROUP BY without a filter.",
      "Order by a random column.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Filter with WHERE.",
    feedbackIncorrect: "Not quite. Add a WHERE filter.",
  },
  {
    type: "multiple_choice" as const,
    prompt: "You need rows that match two conditions. What do you use?",
    options: ["AND", "OR", "LIKE", "LIMIT"],
    correctIndex: 0,
    feedbackCorrect: "Correct. AND combines conditions.",
    feedbackIncorrect: "Not quite. Use AND for both conditions.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: The query should match emails ending with .edu.",
    options: [
      "Use WHERE email LIKE '%.edu'.",
      "Use WHERE email IN '.edu'.",
      "Use WHERE email BETWEEN '.e' AND '.u'.",
      "Use WHERE email = '*.edu'.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. LIKE handles patterns.",
    feedbackIncorrect: "Not quite. Use LIKE with a wildcard.",
  },
  managerQuestion(scenario, "SQL basics"),
];

const buildWeek6Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `You need ${scenario.metric} by ${scenario.dimension}. Which clause is required?`,
    options: ["GROUP BY", "ORDER BY", "LIMIT", "OFFSET"],
    correctIndex: 0,
    feedbackCorrect: "Correct. GROUP BY creates the summary.",
    feedbackIncorrect: "Not quite. Use GROUP BY.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You filter SUM(revenue) using WHERE instead of HAVING.",
    options: [
      "Move the aggregate filter to HAVING.",
      "Remove GROUP BY.",
      "Use DISTINCT instead of SUM.",
      "Filter after exporting to Excel.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. HAVING filters aggregates.",
    feedbackIncorrect: "Not quite. Use HAVING for aggregates.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `You want all ${scenario.left} even if there is no match in ${scenario.right}. Which join?`,
    options: ["LEFT JOIN", "INNER JOIN", "RIGHT JOIN", "FULL JOIN"],
    correctIndex: 0,
    feedbackCorrect: "Correct. LEFT JOIN keeps all left rows.",
    feedbackIncorrect: "Not quite. Use LEFT JOIN.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: Revenue doubled after a join because each order matches multiple rows.",
    options: [
      "Aggregate the detail table before joining.",
      "Add more columns to SELECT.",
      "Remove the join condition.",
      "Order by revenue.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Aggregate before joining to avoid double counts.",
    feedbackIncorrect: "Not quite. Aggregate before joining.",
  },
  managerQuestion(scenario, "SQL aggregation"),
];
const buildWeek7Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `Which chart best shows ${scenario.metric} over time?`,
    options: ["Line chart", "Pie chart", "Scatter plot", "Gauge only"],
    correctIndex: 0,
    feedbackCorrect: "Correct. Line charts show trends.",
    feedbackIncorrect: "Not quite. Use a line chart for trends.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: The ${scenario.dashboard} dashboard has 18 charts and no focus.`,
    options: [
      "Keep a few KPIs and the main trend, remove extras.",
      "Add more colors to all charts.",
      "Use 3D charts for everything.",
      "Hide all labels.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Reduce clutter and focus on the goal.",
    feedbackIncorrect: "Not quite. Keep only key visuals.",
  },
  {
    type: "multiple_choice" as const,
    prompt: "A KPI should be defined as:",
    options: [
      "A metric tied to a business goal.",
      "Any number that looks good.",
      "A chart with many colors.",
      "A table with all rows.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. KPIs track goals.",
    feedbackIncorrect: "Not quite. KPIs must tie to a goal.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: There is no filter for ${scenario.segment}, so users cannot drill in.`,
    options: [
      `Add a ${scenario.segment} filter or slicer.`,
      "Remove the metric.",
      "Hide the chart title.",
      "Switch to a table only.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Add the filter for exploration.",
    feedbackIncorrect: "Not quite. Add the missing filter.",
  },
  managerQuestion(scenario, "BI basics"),
];

const buildWeek8Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `For the ${scenario.project} dashboard, what should be defined first?`,
    options: [
      "The single business question the dashboard answers.",
      "All possible charts.",
      "The final colors.",
      "The largest font size.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Start with the goal.",
    feedbackIncorrect: "Not quite. Define the dashboard goal first.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: The dataset still has duplicates and missing values.",
    options: [
      "Clean the data before building visuals.",
      "Build the dashboard anyway.",
      "Hide the bad rows with a filter.",
      "Replace all missing values with zero without review.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Clean the data first.",
    feedbackIncorrect: "Not quite. Clean before visualizing.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `What should KPI cards show for ${scenario.project}?`,
    options: [
      `The headline metrics like ${scenario.metric}.`,
      "Every column in the dataset.",
      "Only chart titles.",
      "A random sample of rows.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. KPI cards show the headline metrics.",
    feedbackIncorrect: "Not quite. Use headline metrics only.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: The trend chart uses a different date range than the KPIs.",
    options: [
      "Align the date ranges across all visuals.",
      "Remove the KPIs.",
      "Change the chart type.",
      "Only show one month.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Keep date ranges consistent.",
    feedbackIncorrect: "Not quite. Align the date ranges.",
  },
  managerQuestion(scenario, "BI project"),
];

const buildWeek9Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: "Which pandas function loads a CSV file?",
    options: ["pd.read_csv()", "pd.open()", "pd.load()", "pd.select()"],
    correctIndex: 0,
    feedbackCorrect: "Correct. read_csv loads a CSV.",
    feedbackIncorrect: "Not quite. Use pd.read_csv().",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: Column names have spaces and mixed cases.",
    options: [
      "Use df.columns = df.columns.str.strip().str.lower()",
      "Rename one column only.",
      "Sort the dataframe.",
      "Drop the column names.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Standardize column names.",
    feedbackIncorrect: "Not quite. Clean the column names.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `How do you filter rows where ${scenario.column} equals "High"?`,
    options: [
      `df[df["${scenario.column}"] == "High"]`,
      `df.filter("${scenario.column} = High")`,
      `df.where("${scenario.column}" = "High")`,
      `df.only("${scenario.column}", "High")`,
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Use a boolean mask.",
    feedbackIncorrect: "Not quite. Use df[condition].",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You need a new column for revenue after discount.",
    options: [
      'Use df["net_revenue"] = df["revenue"] - df["discount"].',
      "Use df.net_revenue() with no inputs.",
      "Delete the discount column.",
      "Change the column order.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Create the column with a simple calculation.",
    feedbackIncorrect: "Not quite. Create the new column directly.",
  },
  managerQuestion(scenario, "Python basics"),
];

const buildWeek10Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `Which pandas pattern summarizes ${scenario.metric} by ${scenario.dimension}?`,
    options: [
      `df.groupby("${scenario.dimension}")["${scenario.metric}"].sum()`,
      `df.sort("${scenario.metric}")`,
      `df.drop("${scenario.dimension}")`,
      `df.rename("${scenario.metric}")`,
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. groupby creates the summary.",
    feedbackIncorrect: "Not quite. Use groupby with a summary.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You created a trend but forgot to sort by date.",
    options: [
      "Sort by date before plotting or summarizing.",
      "Sort by a random column.",
      "Hide the date column.",
      "Use only the latest day.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Sort by date first.",
    feedbackIncorrect: "Not quite. Sort by date.",
  },
  {
    type: "multiple_choice" as const,
    prompt: `You need the top 5 ${scenario.dimension} by ${scenario.metric}. What is the last step?`,
    options: [
      "Sort descending and take head(5).",
      "Sort ascending and take tail(5).",
      "Drop duplicates.",
      "Fill missing values.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Sort descending then head(5).",
    feedbackIncorrect: "Not quite. Sort descending and take top 5.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You merged two tables using the wrong key.",
    options: [
      "Merge on the shared unique ID column.",
      "Merge on row order.",
      "Merge on a column with duplicates only.",
      "Skip the merge and paste manually.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Use the correct unique key.",
    feedbackIncorrect: "Not quite. Merge on the correct key.",
  },
  managerQuestion(scenario, "Python analysis"),
];
const buildWeek11Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: "A cohort is best defined by:",
    options: [
      "A shared start event, like signup month.",
      "A random sample of users.",
      "The largest segment only.",
      "Anyone active today.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Use a shared start event.",
    feedbackIncorrect: "Not quite. Cohorts are based on a start event.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You compare cohorts using different time windows.",
    options: [
      "Use the same time window for each cohort.",
      "Only show the biggest cohort.",
      "Remove the time columns.",
      "Use different metrics for each cohort.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Compare like with like.",
    feedbackIncorrect: "Not quite. Use the same time window.",
  },
  {
    type: "multiple_choice" as const,
    prompt: "In an A/B test, what must be true before calling a winner?",
    options: [
      "Both groups were run at the same time with the same rules.",
      "One group was much larger and ran longer.",
      "Only clicks improved.",
      "You prefer one design.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Keep the test fair and consistent.",
    feedbackIncorrect: "Not quite. Both groups must be comparable.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: `Fix the mistake: ${scenario.metric} improved, but customer complaints spiked.`,
    options: [
      "Check a guardrail metric before recommending rollout.",
      "Ignore complaints because the main metric improved.",
      "Ship the change immediately.",
      "Stop tracking the guardrail metric.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Guardrails prevent harm.",
    feedbackIncorrect: "Not quite. Validate guardrails first.",
  },
  managerQuestion(scenario, "advanced analysis"),
];

const buildWeek12Questions = (scenario: Scenario) => [
  {
    type: "multiple_choice" as const,
    prompt: `In a case about ${scenario.case}, what should you ask first?`,
    options: [
      "What business decision will this analysis support?",
      "What is your favorite chart type?",
      "Can I skip data cleaning?",
      "Should I code everything?",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Start with the decision.",
    feedbackIncorrect: "Not quite. Clarify the decision first.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: Your insight is too technical for a business audience.",
    options: [
      "State the impact in business terms and the recommended action.",
      "Add more formulas.",
      "Show every row of data.",
      "Use jargon to sound advanced.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Keep it business-focused.",
    feedbackIncorrect: "Not quite. Use business language and action.",
  },
  {
    type: "multiple_choice" as const,
    prompt: "Which structure is best for an interview answer?",
    options: [
      "Context, insight, action.",
      "Tool list, code, appendix.",
      "Random facts.",
      "Only the chart title.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Keep the story clear.",
    feedbackIncorrect: "Not quite. Use context, insight, action.",
  },
  {
    type: "fix_the_mistake" as const,
    prompt: "Fix the mistake: You jump to a conclusion before checking data quality.",
    options: [
      "Verify data quality before finalizing the conclusion.",
      "Skip validation to save time.",
      "Only check one row.",
      "Use a different chart.",
    ],
    correctIndex: 0,
    feedbackCorrect: "Correct. Validate before concluding.",
    feedbackIncorrect: "Not quite. Check data quality first.",
  },
  managerQuestion(scenario, "job readiness"),
];

const buildQuestions = (weekIndex: number, scenario: Scenario) => {
  switch (weekIndex) {
    case 0:
      return buildWeek1Questions(scenario);
    case 1:
      return buildWeek2Questions(scenario);
    case 2:
      return buildWeek3Questions(scenario);
    case 3:
      return buildWeek4Questions(scenario);
    case 4:
      return buildWeek5Questions(scenario);
    case 5:
      return buildWeek6Questions(scenario);
    case 6:
      return buildWeek7Questions(scenario);
    case 7:
      return buildWeek8Questions(scenario);
    case 8:
      return buildWeek9Questions(scenario);
    case 9:
      return buildWeek10Questions(scenario);
    case 10:
      return buildWeek11Questions(scenario);
    case 11:
      return buildWeek12Questions(scenario);
    default:
      return [];
  }
};

const buildQuestionSteps = (questions: QuestionSeed[]): LessonStepSeed[] =>
  questions.map((question) => ({
    type: question.type === "fix_the_mistake" ? ("fix" as const) : ("mcq" as const),
    prompt: question.prompt,
    choices: question.options,
    correctIndex: question.correctIndex,
    explanation: toExplanation(question.feedbackCorrect || question.feedbackIncorrect),
  }));

const buildTableVisual = (dayNumber: number, scenario: Scenario): Visual => {
  const headerLeft =
    scenario.dimension ||
    scenario.segment ||
    scenario.channel ||
    scenario.plan ||
    scenario.category ||
    scenario.feature ||
    "Group";
  const headerRight = scenario.metric || "Result";
  const base = 40 + dayNumber * 2;
  return {
    type: "table",
    headers: [headerLeft, headerRight],
    rows: [
      [`${headerLeft} A`, String(base + 12)],
      [`${headerLeft} B`, String(base + 4)],
      [`${headerLeft} C`, String(base + 18)],
    ],
    highlights: [{ r: 2, c: 1, label: "highest" }],
    note: "Example snapshot",
  };
};

const buildVisualStep = (dayNumber: number, scenario: Scenario): LessonStepSeed => ({
  type: "visual" as const,
  title: "Example snapshot",
  visual: buildTableVisual(dayNumber, scenario),
});

const recapBulletsByWeek: string[][] = [
  [
    "Start with one clear question.",
    "Tie the question to a decision.",
    "Share one next step.",
  ],
  [
    "Clean labels before counting.",
    "Standardize dates and text.",
    "Keep a clean copy to reuse.",
  ],
  [
    "Summarize with a pivot.",
    "Sort to see the top drivers.",
    "Keep visuals simple and clear.",
  ],
  [
    "Define the goal first.",
    "Build the core calculation.",
    "Share one clear takeaway.",
  ],
  [
    "Select only needed columns.",
    "Filter to the right segment.",
    "Order results for review.",
  ],
  [
    "Group before you summarize.",
    "Join on the right keys.",
    "Avoid double counting.",
  ],
  [
    "Pick the right chart.",
    "Use clean hierarchy.",
    "Highlight one key change.",
  ],
  [
    "Start with the dashboard goal.",
    "Model data cleanly.",
    "Validate before sharing.",
  ],
  [
    "Load files correctly.",
    "Clean columns first.",
    "Handle missing values.",
  ],
  [
    "Group to compare segments.",
    "Check trends over time.",
    "Summarize with one clear line.",
  ],
  [
    "Compare like with like.",
    "Watch guardrail signals.",
    "Recommend the next step.",
  ],
  [
    "Clarify the decision.",
    "Explain in plain language.",
    "Practice the story.",
  ],
];

const managerLineByWeek = [
  (scenario: Scenario) =>
    `What you'd tell your manager: ${scenario.metric} moved for ${scenario.segment || "one group"}, so we should check the step where users drop.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The sheet is clean, so ${scenario.metric} counts are now reliable.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The pivot shows ${scenario.metric} is highest for ${scenario.dimension || "one group"}.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The project highlights ${scenario.metric} by ${scenario.dimension || "segment"}; next is to act on the top driver.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The query isolates ${scenario.segment || "the target segment"} and shows ${scenario.metric} clearly.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: After joining ${scenario.left} and ${scenario.right}, ${scenario.metric} stands out by ${scenario.dimension || "group"}.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The dashboard makes ${scenario.metric} by ${scenario.segment || "segment"} easy to track.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The ${scenario.project} view keeps ${scenario.metric} front and center with clean filters.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: The CSV is clean, so ${scenario.metric} by ${scenario.column || "category"} is trustworthy.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: Grouping shows ${scenario.metric} differs by ${scenario.dimension || "segment"}; we should focus on the top group.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: Cohort comparisons show ${scenario.metric} shifted; we should test the next change carefully.`,
  (scenario: Scenario) =>
    `What you'd tell your manager: For ${scenario.case}, the key driver is ${scenario.metric}; my recommendation is a focused follow-up.`,
];

const buildRecapData = (weekIndex: number, scenario: Scenario) => {
  const bullets =
    recapBulletsByWeek[weekIndex] ?? recapBulletsByWeek[recapBulletsByWeek.length - 1];
  const realWorldLine =
    managerLineByWeek[weekIndex]?.(scenario) ??
    "What you'd tell your manager: The key change is clear, and we have a next step.";
  const body = `${bullets.map((bullet) => `- ${bullet}`).join("\n")}\n${realWorldLine}`;
  return {
    recapBullets: bullets,
    realWorldLine,
    step: {
      type: "learn" as const,
      title: "Recap",
      body,
    },
  };
};

const week1Scaffolds: Array<(scenario: Scenario) => WeekScaffold> = [
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "You are planning a road trip. \"Will we have fun?\" is too big. \"Which stop makes the trip too long?\" tells you what to change. A clear question points to one fix.",
    },
    learn: [
      {
        type: "learn",
        title: "Focus on one step",
        body: `For a ${scenario.product}, pick a single moment to inspect, like sign-up or first use. That keeps the work small and specific.`,
      },
      {
        type: "learn",
        title: "Make the decision obvious",
        body:
          "Ask a question that ends with a choice: keep the current flow, change one step, or test a new one.",
      },
    ],
    recap: {
      type: "learn",
      title: "Recap",
      body:
        "Good questions lead to a clear decision and a single place to look. What would you tell your manager?",
    },
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "A cafe looks busy from the street, but the owner cares about paid orders. The right number tells you if the cafe is healthy.",
    },
    learn: [
      {
        type: "learn",
        title: "What a metric means",
        body: `A metric is a number that shows health. For a ${scenario.product}, ${scenario.metric} shows if visitors move forward.`,
      },
      {
        type: "learn",
        title: "Vanity vs action",
        body: `Big counts like ${scenario.vanityMetric} can rise while ${scenario.metric} stays flat. Choose the number that would change what the team does tomorrow.`,
      },
    ],
    recap: {
      type: "learn",
      title: "Recap",
      body:
        "Choose a number tied to outcomes, not just attention. What would you tell your manager?",
    },
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "Umbrellas and rain show up together. The umbrellas did not cause the rain. They just arrive at the same time.",
    },
    learn: [
      {
        type: "learn",
        title: "Pattern vs cause",
        body:
          "When two things move together, you have a pattern. That pattern is called correlation.",
      },
      {
        type: "learn",
        title: "Prove the cause",
        body: `If ${scenario.metric} changed after a new idea, say it might be related unless you can point to a test you controlled.`,
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "Zoom in on a small scratch and it looks huge. The view you choose changes the story.",
    },
    learn: [
      {
        type: "learn",
        title: "Scale matters",
        body: `Charts can exaggerate changes in ${scenario.metric} by cropping the scale or skipping labels.`,
      },
      {
        type: "learn",
        title: "Tell the honest story",
        body:
          "Use clear labels and a fair range so a small change looks small and a big change looks big.",
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "At dinner, \"what should we eat?\" is vague. \"Do we want pasta or salad?\" leads to a choice.",
    },
    learn: [
      {
        type: "learn",
        title: "Start with the decision",
        body: `For a ${scenario.product}, decide what you might change first, like a message, a flow step, or a feature.`,
      },
      {
        type: "learn",
        title: "Write the question",
        body:
          "Phrase the question so it directly informs that decision. If you cannot name the decision, rewrite the question.",
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "Before you paint a wall, you look at the old color. That starting point helps you judge the change.",
    },
    learn: [
      {
        type: "learn",
        title: "Define a baseline",
        body: `A baseline is the starting point you compare against, like ${scenario.metric} last week.`,
      },
      {
        type: "learn",
        title: "Make it fair",
        body:
          "Compare similar periods, like weekdays to weekdays, so your comparison is honest.",
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "You text a friend: what happened, why it matters, what next. Short and clear.",
    },
    learn: [
      {
        type: "learn",
        title: "One-sentence update",
        body: `Start with the outcome in plain words. Example: \"${scenario.metric} changed for ${scenario.segment}.\"`,
      },
      {
        type: "learn",
        title: "Add the action",
        body:
          "End with what you recommend the team do next. Keep it one step.",
      },
    ],
  }),
];

const week2Scaffolds: Array<(scenario: Scenario) => WeekScaffold> = [
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "Your shopping list has crossed-out items, duplicates, and messy notes. You clean it before going to the store.",
    },
    learn: [
      {
        type: "learn",
        title: "What data is",
        body: `Data is just the rows in a spreadsheet. In ${scenario.file}, each row is one record.`,
      },
      {
        type: "learn",
        title: "Cleaning basics",
        body: `Start by checking ${scenario.column} for blanks or typos so your totals are reliable.`,
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "The same person is saved as \"Sam\", \"SAM\", and \"Sammy\". It looks like three people.",
    },
    learn: [
      {
        type: "learn",
        title: "Make text match",
        body: `Standardize ${scenario.column} so labels match exactly. That keeps counts accurate.`,
      },
      {
        type: "learn",
        title: "Use simple fixes",
        body:
          "Trim spaces, fix casing, and replace common variants before you summarize.",
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "Three friends write the same date in three different ways. You cannot sort them.",
    },
    learn: [
      {
        type: "learn",
        title: "Pick one format",
        body: `Choose one date format for ${scenario.dateColumn}, like YYYY-MM-DD.`,
      },
      {
        type: "learn",
        title: "Convert text to dates",
        body:
          "In Excel, convert text dates so they sort and filter correctly.",
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "A bouncer checks IDs: if age is 21+, allow entry. If not, deny.",
    },
    learn: [
      {
        type: "learn",
        title: "IF is a rule",
        body:
          "IF lets you label rows using a simple rule: if the condition is true, use one label, otherwise use another.",
      },
      {
        type: "learn",
        title: "Concrete example",
        body: `Example: if ${scenario.metric} is over target, label it \"ok\"; otherwise \"needs work\".`,
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "You count red socks, then add up only the red socks' prices.",
    },
    learn: [
      {
        type: "learn",
        title: "COUNTIF counts with a rule",
        body: `COUNTIF counts rows that match a condition, like ${scenario.metric} = \"high\".`,
      },
      {
        type: "learn",
        title: "SUMIF totals with a rule",
        body: `SUMIF adds values for rows that match the condition, like summing ${scenario.metric} for one category.`,
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "A receipt is scanned twice, doubling the total. You need to keep just one.",
    },
    learn: [
      {
        type: "learn",
        title: "Why duplicates hurt",
        body: `Duplicates make totals like ${scenario.metric} too high, so decisions are wrong.`,
      },
      {
        type: "learn",
        title: "Remove safely",
        body: `Check the key column in ${scenario.file} (like an ID) so you remove true duplicates only.`,
      },
    ],
  }),
  (scenario: Scenario) => ({
    intuition: {
      type: "intuition",
      title: "Picture this",
      body:
        "A pilot runs a checklist before takeoff. It prevents easy mistakes.",
    },
    learn: [
      {
        type: "learn",
        title: "Quick checklist",
        body: `Scan ${scenario.file} for blanks, weird dates, and mismatched labels before you continue.`,
      },
      {
        type: "learn",
        title: "Save a clean copy",
        body:
          "Keep a cleaned version so you can always go back.",
      },
    ],
  }),
];

const buildWeek1LessonSteps = (
  dayIndex: number,
  scenario: Scenario,
  dayNumber: number
): LessonStepSeed[] => {
  const scaffold = week1Scaffolds[dayIndex]?.(scenario);
  if (!scaffold) {
    return buildQuestionSteps(buildWeek1Questions(scenario));
  }
  const questions = buildWeek1Questions(scenario);
  return [
    scaffold.intuition,
    ...scaffold.learn,
    buildVisualStep(dayNumber, scenario),
    ...buildQuestionSteps(questions),
  ];
};

const buildWeek2LessonSteps = (
  dayIndex: number,
  scenario: Scenario,
  dayNumber: number
): LessonStepSeed[] => {
  const scaffold = week2Scaffolds[dayIndex]?.(scenario);
  if (!scaffold) {
    return buildQuestionSteps(buildWeek2Questions(scenario));
  }
  const questions = buildWeek2Questions(scenario);
  return [
    scaffold.intuition,
    ...scaffold.learn,
    buildVisualStep(dayNumber, scenario),
    ...buildQuestionSteps(questions),
  ];
};

const buildScenarioPrompt = (scenario: Scenario) => {
  if (scenario.metric && scenario.dimension) {
    return `Which ${scenario.dimension} drives ${scenario.metric}?`;
  }
  if (scenario.metric && scenario.segment) {
    return `How does ${scenario.segment} affect ${scenario.metric}?`;
  }
  if (scenario.metric && scenario.channel) {
    return `Which ${scenario.channel} performs best for ${scenario.metric}?`;
  }
  if (scenario.metric && scenario.table) {
    return `What is ${scenario.metric} in ${scenario.table}?`;
  }
  return "What changed, and what should we do next?";
};

const defaultIntuitionByWeek = [
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You are trying to pick the best route home. You compare a few options and choose the one that saves time.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You sort a messy drawer into neat groups before you decide what to keep.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You separate receipts by store to see where most money goes.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You plan a party by listing the steps in order before doing any work.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "At a cafe, you only order the items you actually want, not everything on the menu.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You group similar items together to see the biggest categories fast.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "Your car dashboard shows speed, fuel, and warnings at a glance.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You build a presentation board by choosing only the most important points.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You use a tool to tidy a long list quickly, so you can work with it.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You compare shelves in a pantry to see which one empties fastest.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You compare two teams after giving them the same starting resources.",
  }),
  () => ({
    type: "intuition" as const,
    title: "Picture this",
    body:
      "You practice telling a short story so people understand it right away.",
  }),
];

const buildDefaultLessonSteps = (
  weekIndex: number,
  dayNumber: number,
  microGoal: string,
  scenario: Scenario
): LessonStepSeed[] => {
  const intuition: LessonStepSeed =
    defaultIntuitionByWeek[weekIndex]?.() ?? {
      type: "intuition" as const,
      title: "Picture this",
      body: "You arrange items into simple groups so the important ones stand out.",
    };
  const prompt = buildScenarioPrompt(scenario);
  const learnIntro: LessonStepSeed = {
    type: "learn" as const,
    title: "What you will do",
    body: microGoal,
    example: `Example: ${prompt}`,
  };
  const learnWhy: LessonStepSeed = {
    type: "learn" as const,
    title: "Why it matters",
    body: `This skill helps you answer questions like: ${prompt}`,
  };
  return [intuition, learnIntro, learnWhy, buildVisualStep(dayNumber, scenario)];
};

type LessonSeed = {
  day: number;
  title: string;
  microGoal: string;
  recapBullets: string[];
  realWorldLine: string;
  steps: LessonStepSeed[];
};

type SkillCheckSeed = {
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

type PatternSeed = {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  content: PatternContent;
};

type CheckpointQuestionSeed = {
  id: string;
  checkpointTestId: string;
  type: "mcq" | "fix";
  prompt: string;
  choices: string[];
  answer: { correctIndex: number };
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

type CheckpointTestSeed = {
  id: string;
  dayNumber: number;
  title: string;
  passPercent: number;
  xpReward: number;
  questions: CheckpointQuestionSeed[];
};

type ProgramContent = {
  lessons: LessonSeed[];
  skillChecks: SkillCheckSeed[];
  patterns: PatternSeed[];
  checkpointTests: CheckpointTestSeed[];
};

const buildLessons = (): LessonSeed[] => {
  const lessons: LessonSeed[] = [];

  let dayCounter = 1;
  weekPlans.forEach((week, weekIndex) => {
    week.dayTitles.forEach((title, dayIndex) => {
      const scenario = week.scenarios[dayIndex % week.scenarios.length];
      let steps: LessonStepSeed[];
      if (weekIndex === 0) {
        steps = buildWeek1LessonSteps(dayIndex, scenario, dayCounter);
      } else if (weekIndex === 1) {
        steps = buildWeek2LessonSteps(dayIndex, scenario, dayCounter);
      } else {
        steps = [
          ...buildDefaultLessonSteps(
            weekIndex,
            dayCounter,
            week.microGoals[dayIndex],
            scenario
          ),
          ...buildQuestionSteps(buildQuestions(weekIndex, scenario)),
        ];
      }

      const microGoal =
        weekIndex === 0
          ? week1MicroGoals[dayIndex]
          : weekIndex === 1
          ? week2MicroGoals[dayIndex]
          : week.microGoals[dayIndex];

      const recap = buildRecapData(weekIndex, scenario);
      steps = [...steps, recap.step];

      lessons.push({
        day: dayCounter,
        title: `Day ${dayCounter}: ${title}`,
        microGoal,
        recapBullets: recap.recapBullets,
        realWorldLine: recap.realWorldLine,
        steps,
      });
      dayCounter += 1;
    });
  });

  return lessons;
};

const makeSkillCheck = (
  dayNumber: number,
  index: number,
  data: Omit<SkillCheckSeed, "id" | "dayNumber" | "xpReward"> & { xpReward?: number }
): SkillCheckSeed => ({
  id: `day-${dayNumber}-skill-${index}`,
  dayNumber,
  xpReward: data.xpReward ?? 5,
  title: data.title,
  prompt: data.prompt,
  type: data.type,
  choices: data.choices,
  answer: data.answer,
  explanation: data.explanation,
});

const buildSkillChecksForDay = (
  dayNumber: number,
  weekIndex: number,
  scenario: Scenario
): SkillCheckSeed[] => {
  let checks: SkillCheckSeed[] = [];
  switch (weekIndex) {
    case 0:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Pick the sharper question",
          prompt: `You run a ${scenario.product}. Which question is easiest to act on?`,
          type: "mcq",
          choices: [
            `Which step causes the biggest drop in ${scenario.metric}?`,
            "Do users like the product?",
            `How many ${scenario.vanityMetric} did we get?`,
            "Is the market competitive?",
          ],
          answer: { correctIndex: 0 },
          explanation: "Actionable questions point to a specific step.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Highlight the right number",
          prompt: "In a weekly update, which number should lead?",
          type: "mcq",
          choices: [
            scenario.metric || "Activation rate",
            scenario.vanityMetric || "App installs",
            "Total followers",
            "Press mentions",
          ],
          answer: { correctIndex: 0 },
          explanation: "Lead with the number tied to outcomes.",
        }),
      ];
      break;
    case 1:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "First cleanup move",
          prompt: `In ${scenario.file}, ${scenario.column} has extra spaces. What is the first fix?`,
          type: "fix",
          choices: [
            "Trim spaces and standardize casing.",
            "Sort the column by length.",
            "Delete the entire column.",
            "Hide the column.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Standardize labels before counting.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Pick the right formula",
          prompt: `Which formula counts rows where ${scenario.metric} is "High"?`,
          type: "mcq",
          choices: ["COUNTIF", "SUMIF", "AVERAGE", "IF"],
          answer: { correctIndex: 0 },
          explanation: "COUNTIF counts rows that match a condition.",
        }),
      ];
      break;
    case 2:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Best Excel tool",
          prompt: `You need ${scenario.metric} by ${scenario.dimension}. What is the fastest Excel tool?`,
          type: "mcq",
          choices: ["Pivot table", "Manual sorting", "Freeze panes", "Text to columns"],
          answer: { correctIndex: 0 },
          explanation: "Pivot tables summarize quickly.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Find the top driver",
          prompt: `To surface the biggest ${scenario.dimension}, what should you do?`,
          type: "fix",
          choices: [
            "Sort the summary column descending.",
            "Hide the smallest values.",
            "Delete half the rows.",
            "Change the chart color.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Sorting shows the top drivers.",
        }),
      ];
      break;
    case 3:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Project kickoff step",
          prompt: `For ${scenario.project}, what comes first?`,
          type: "mcq",
          choices: [
            "Define the goal and success metric.",
            "Pick chart colors.",
            "Share a draft slide.",
            "Hide missing values.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Start with the goal before building.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Share the insight",
          prompt: "Which update is best to share?",
          type: "mcq",
          choices: [
            "One clear change and the next action.",
            "Every row in the sheet.",
            "A list of formulas only.",
            "No recommendation.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Keep it short and actionable.",
        }),
      ];
      break;
    case 4:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Filter rows",
          prompt: "Which SQL clause filters rows?",
          type: "mcq",
          choices: ["WHERE", "GROUP BY", "ORDER BY", "LIMIT"],
          answer: { correctIndex: 0 },
          explanation: "WHERE filters rows.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Target segment",
          prompt: `Which clause limits results to ${scenario.segment}?`,
          type: "mcq",
          choices: ["WHERE", "SELECT", "FROM", "JOIN"],
          answer: { correctIndex: 0 },
          explanation: "WHERE sets the filter condition.",
        }),
      ];
      break;
    case 5:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Group the results",
          prompt: `To summarize ${scenario.metric} by ${scenario.dimension}, which clause is required?`,
          type: "mcq",
          choices: ["GROUP BY", "ORDER BY", "WHERE", "LIMIT"],
          answer: { correctIndex: 0 },
          explanation: "GROUP BY defines the aggregation group.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Filter after grouping",
          prompt: "Which clause filters aggregated results?",
          type: "mcq",
          choices: ["HAVING", "WHERE", "JOIN", "SELECT"],
          answer: { correctIndex: 0 },
          explanation: "HAVING filters after aggregation.",
        }),
      ];
      break;
    case 6:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Pick the chart",
          prompt: `To compare ${scenario.metric} across ${scenario.segment}, what chart fits best?`,
          type: "mcq",
          choices: ["Bar chart", "Pie chart", "Scatter plot", "Single KPI card"],
          answer: { correctIndex: 0 },
          explanation: "Bar charts compare categories clearly.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "KPI card focus",
          prompt: "A KPI card should show:",
          type: "mcq",
          choices: [
            "One headline number.",
            "All filters and tables.",
            "Raw row data.",
            "Every chart on the page.",
          ],
          answer: { correctIndex: 0 },
          explanation: "KPI cards spotlight one number.",
        }),
      ];
      break;
    case 7:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Dashboard goal",
          prompt: `Before building a ${scenario.project} dashboard, do what?`,
          type: "mcq",
          choices: [
            "Write the single question it answers.",
            "Choose colors.",
            "Add every chart type.",
            "Export CSVs.",
          ],
          answer: { correctIndex: 0 },
          explanation: "The goal drives the layout.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Keep filters clean",
          prompt: "Filters should be added for:",
          type: "mcq",
          choices: [
            "Common segments people ask about.",
            "Every column in the dataset.",
            "Random categories.",
            "Hidden fields only.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Filters should match frequent questions.",
        }),
      ];
      break;
    case 8:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Load a CSV",
          prompt: `How do you load ${scenario.file} in pandas?`,
          type: "mcq",
          choices: ["pd.read_csv()", "pd.load()", "pd.open()", "pd.import_csv()"],
          answer: { correctIndex: 0 },
          explanation: "read_csv loads a CSV file.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Clean column names",
          prompt: "Which step standardizes column names?",
          type: "fix",
          choices: [
            "df.columns = df.columns.str.strip().str.lower()",
            "df.sort_values()",
            "df.dropna()",
            "df.describe()",
          ],
          answer: { correctIndex: 0 },
          explanation: "Strip and lower names before analysis.",
        }),
      ];
      break;
    case 9:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Group in pandas",
          prompt: `Which pattern summarizes ${scenario.metric} by ${scenario.dimension}?`,
          type: "mcq",
          choices: [
            `df.groupby("${scenario.dimension}")["${scenario.metric}"].sum()`,
            "df.sort_values()",
            "df.dropna()",
            "df.rename()",
          ],
          answer: { correctIndex: 0 },
          explanation: "Use groupby with a summary.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Trend check",
          prompt: "What is the first step before plotting a trend?",
          type: "mcq",
          choices: [
            "Sort by date.",
            "Drop the date column.",
            "Shuffle the data.",
            "Convert to text only.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Sort before plotting time series.",
        }),
      ];
      break;
    case 10:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Define a cohort",
          prompt: "A cohort is grouped by:",
          type: "mcq",
          choices: [
            "A shared start date.",
            "A random sample.",
            "Only top spenders.",
            "Anyone active today.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Cohorts share a start event.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Guardrail check",
          prompt: "A guardrail metric exists to:",
          type: "mcq",
          choices: [
            "Catch unintended harm.",
            "Make charts prettier.",
            "Replace all KPIs.",
            "Slow down reporting.",
          ],
          answer: { correctIndex: 0 },
          explanation: "Guardrails protect users and the business.",
        }),
      ];
      break;
    case 11:
      checks = [
        makeSkillCheck(dayNumber, 1, {
          title: "Clarify the case",
          prompt: "In a case interview, ask first:",
          type: "mcq",
          choices: [
            "What decision will this support?",
            "Which chart do you prefer?",
            "Can we skip cleaning?",
            "What is the font size?",
          ],
          answer: { correctIndex: 0 },
          explanation: "Start with the decision.",
        }),
        makeSkillCheck(dayNumber, 2, {
          title: "Story structure",
          prompt: "The best structure is:",
          type: "mcq",
          choices: ["Context, insight, action.", "Tools, code, appendix.", "Random facts.", "Only the chart title."],
          answer: { correctIndex: 0 },
          explanation: "Keep the story short and clear.",
        }),
      ];
      break;
    default:
      checks = [];
      break;
  }

  if (checks.length < 3) {
    checks.push(
      makeSkillCheck(dayNumber, checks.length + 1, {
        title: "Manager-ready line",
        prompt: `Which update best helps your manager act on ${scenario.metric || "the key result"}?`,
        type: "mcq",
        choices: [
          "State the change, the driver, and one next step.",
          "Share the full raw table.",
          "List only tools used.",
          "Hold the update until next month.",
        ],
        answer: { correctIndex: 0 },
        explanation: "Short, action-ready updates work best.",
      })
    );
  }

  return checks;
};
const buildPatternsForDay = (
  dayNumber: number,
  weekIndex: number,
  scenario: Scenario,
  title: string
): PatternSeed[] => {
  const managerLine =
    managerLineByWeek[weekIndex]?.(scenario) ??
    "What you'd tell your manager: The update is clear and actionable.";
  const goodBadTable: Visual = {
    type: "table",
    headers: ["Version", "What it says"],
    rows: [
      ["Bad", "Overloaded and unclear."],
      ["Good", "One message with a clear next step."],
    ],
    note: "Quick comparison",
  };
  const managerTable: Visual = {
    type: "table",
    headers: ["Line", "Example"],
    rows: [
      ["Context", `${scenario.metric || "Key metric"} this week`],
      ["Impact", `${scenario.segment || "Main segment"} moved the most`],
      ["Next step", "Review the top driver and adjust"],
    ],
  };

  return [
    {
      id: `day-${dayNumber}-pattern-1`,
      dayNumber,
      title: `Good vs bad: ${title}`,
      description: "Quick example of clean storytelling.",
      content: {
        intro: "Use this as a template when presenting the day.",
        sections: [
          { type: "visual", title: "Example", visual: goodBadTable },
          {
            type: "text",
            title: "Why it works",
            body: "The good version focuses on one message and one action.",
          },
        ],
        takeaway: managerLine,
      },
    },
    {
      id: `day-${dayNumber}-pattern-2`,
      dayNumber,
      title: "Manager update template",
      description: "Ready-to-use update with a simple structure.",
      content: {
        intro: "Keep the update short and decision-ready.",
        sections: [
          { type: "visual", title: "Template", visual: managerTable },
          {
            type: "text",
            title: "Tip",
            body: "Replace each line with a single sentence.",
          },
        ],
        takeaway: managerLine,
      },
    },
  ];
};

type CheckpointQuestionBase = Omit<CheckpointQuestionSeed, "id" | "checkpointTestId">;

const checkpointMcq = (
  prompt: string,
  choices: string[],
  correctIndex: number,
  explanation: string,
  difficulty: "easy" | "medium" | "hard"
): CheckpointQuestionBase => ({
  type: "mcq" as const,
  prompt,
  choices,
  answer: { correctIndex },
  explanation,
  difficulty,
});

const checkpointFix = (
  prompt: string,
  choices: string[],
  correctIndex: number,
  explanation: string,
  difficulty: "easy" | "medium" | "hard"
): CheckpointQuestionBase => ({
  type: "fix" as const,
  prompt,
  choices,
  answer: { correctIndex },
  explanation,
  difficulty,
});

const buildCheckpointQuestionBank = (
  weekIndex: number,
  scenario: Scenario
): CheckpointQuestionBase[] => {
  switch (weekIndex) {
    case 0:
      return [
        checkpointMcq(
          `Which question helps improve ${scenario.product}?`,
          [
            `Which step slows ${scenario.metric}?`,
            "Is the product popular?",
            `How many ${scenario.vanityMetric} happened?`,
            "What does the CEO think?",
          ],
          0,
          "Pick a question that points to one step you can change.",
          "easy"
        ),
        checkpointFix(
          "Fix the update: \"Installs went up, so we are winning.\"",
          [
            `Check if ${scenario.metric} moved too before claiming success.`,
            "Only share installs.",
            "Hide the report.",
            "Change the colors.",
          ],
          0,
          "Confirm the outcome number, not only attention metrics.",
          "easy"
        ),
        checkpointMcq(
          `You saw ${scenario.metric} rise after a change. What is safest?`,
          [
            "The change caused the lift.",
            "The lift happened, but we need more proof before claiming cause.",
            "The lift is fake.",
            "We should stop tracking it.",
          ],
          1,
          "Correlation alone is not proof of cause.",
          "medium"
        ),
        checkpointMcq(
          "Which baseline is most fair?",
          ["Last week or last month.", "Only the best day.", "A random day.", "No baseline."],
          0,
          "Compare to a normal period.",
          "medium"
        ),
        checkpointFix(
          "Fix the chart: the axis starts at 90 for a small change.",
          [
            "Start at zero or call out the tight scale clearly.",
            "Remove the axis.",
            "Hide the labels.",
            "Use 3D bars.",
          ],
          0,
          "Avoid exaggerating movement.",
          "medium"
        ),
        checkpointMcq(
          "A good manager update includes:",
          [
            "The change, the driver, and one next step.",
            "Only raw rows.",
            "Every chart you made.",
            "No action at all.",
          ],
          0,
          "Keep it action ready.",
          "hard"
        ),
      ];
    case 1:
      return [
        checkpointMcq(
          `In ${scenario.file}, what should you check first?`,
          [
            "Blanks, duplicates, and inconsistent labels.",
            "Chart colors.",
            "Font sizes.",
            "Column width.",
          ],
          0,
          "Clean structure comes first.",
          "easy"
        ),
        checkpointFix(
          `${scenario.column} has extra spaces and mixed case. Fix it by:`,
          [
            "Trim spaces and standardize case.",
            "Sorting only.",
            "Deleting the column.",
            "Hiding the rows.",
          ],
          0,
          "Normalize text so counts match.",
          "easy"
        ),
        checkpointMcq(
          `Which function sums ${scenario.metric} only when Status = "Paid"?`,
          ["SUMIF", "COUNTIF", "IF", "AVERAGE"],
          0,
          "SUMIF adds values that meet a rule.",
          "medium"
        ),
        checkpointFix(
          `${scenario.dateColumn} is text and sorts wrong. Fix by:`,
          [
            "Convert it to a real date type.",
            "Add a chart.",
            "Bold the column.",
            "Copy and paste values only.",
          ],
          0,
          "Date type controls sorting.",
          "medium"
        ),
        checkpointMcq(
          "Why remove duplicates carefully?",
          [
            "So you do not delete real, unique records.",
            "So the file looks shorter.",
            "So charts auto-update.",
            "So filters stop working.",
          ],
          0,
          "Protect real rows while removing exact duplicates.",
          "medium"
        ),
        checkpointMcq(
          "A safe cleanup flow ends with:",
          ["Saving a clean copy.", "Deleting the original file.", "Only sorting.", "Renaming columns randomly."],
          0,
          "Keep a clean version you can reuse.",
          "hard"
        ),
      ];
    case 2:
      return [
        checkpointMcq(
          `To summarize ${scenario.metric} by ${scenario.dimension}, use:`,
          ["Pivot table", "Merge cells", "Freeze panes", "Spell check"],
          0,
          "Pivots group and summarize fast.",
          "easy"
        ),
        checkpointFix(
          "Your pivot shows Count, but you need Sum. Fix by:",
          [
            "Change the value field to Sum.",
            "Sort descending.",
            "Hide blanks.",
            "Add a filter only.",
          ],
          0,
          "Adjust the value field summary.",
          "easy"
        ),
        checkpointMcq(
          "Sorting helps you:",
          ["Find top drivers quickly.", "Create duplicates.", "Remove labels.", "Hide trends."],
          0,
          "Sort to surface the biggest contributors.",
          "medium"
        ),
        checkpointMcq(
          "A pivot chart should:",
          ["Focus on one message.", "Show every tab at once.", "Use random colors.", "Hide labels."],
          0,
          "Keep the message clear.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: You filtered out needed categories.",
          [
            "Reset filters and verify all groups are included.",
            "Delete the pivot.",
            "Switch to a different sheet.",
            "Remove totals.",
          ],
          0,
          "Check filters before sharing.",
          "medium"
        ),
        checkpointMcq(
          "A simple dashboard should include:",
          ["A few KPIs and a clear trend.", "Every chart possible.", "Only raw rows.", "No titles."],
          0,
          "Keep it tight and readable.",
          "hard"
        ),
      ];
    case 3:
      return [
        checkpointMcq(
          `The first step in the ${scenario.project} project is:`,
          ["Define the decision and success number.", "Build charts first.", "Hide the data.", "Skip cleaning."],
          0,
          "Start with the goal.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: You calculated metrics before cleaning.",
          [
            "Clean obvious errors first, then calculate.",
            "Add more formulas.",
            "Ignore the errors.",
            "Share the report now.",
          ],
          0,
          "Clean data before calculations.",
          "easy"
        ),
        checkpointMcq(
          `Which summary best supports ${scenario.metric}?`,
          ["A pivot with totals by segment.", "Raw rows only.", "Hidden columns.", "A blank sheet."],
          0,
          "Summaries show the key totals.",
          "medium"
        ),
        checkpointMcq(
          "A trend is useful when it:",
          ["Shows change over time.", "Hides changes.", "Removes labels.", "Ignores dates."],
          0,
          "Trends show direction.",
          "medium"
        ),
        checkpointFix(
          "Fix the draft dashboard: It has no labels.",
          ["Add clear titles and axis labels.", "Add more colors only.", "Remove all charts.", "Use tiny fonts."],
          0,
          "Labels make charts readable.",
          "medium"
        ),
        checkpointMcq(
          "A good final slide includes:",
          ["The key insight and recommended action.", "Every calculation.", "Only screenshots.", "No conclusion."],
          0,
          "End with action.",
          "hard"
        ),
      ];
    case 4:
      return [
        checkpointMcq(
          `To pull ${scenario.metric} from ${scenario.table}, start with:`,
          ["SELECT", "UPDATE", "DROP", "INSERT"],
          0,
          "SELECT reads data.",
          "easy"
        ),
        checkpointFix(
          "Fix the query: You filtered after aggregating.",
          ["Use WHERE before GROUP BY.", "Use LIMIT only.", "Remove WHERE.", "Sort first."],
          0,
          "WHERE filters rows before grouping.",
          "easy"
        ),
        checkpointMcq(
          "Which clause filters rows?",
          ["WHERE", "GROUP BY", "ORDER BY", "JOIN"],
          0,
          "WHERE filters rows.",
          "medium"
        ),
        checkpointMcq(
          "To match multiple values, use:",
          ["IN", "LIKE", "JOIN", "LIMIT"],
          0,
          "IN is for lists.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: Results are unsorted.",
          ["Add ORDER BY for the main column.", "Add JOIN.", "Delete WHERE.", "Use DISTINCT only."],
          0,
          "ORDER BY sorts results.",
          "medium"
        ),
        checkpointMcq(
          "NULL values should be handled by:",
          ["Checking for NULL explicitly.", "Ignoring them always.", "Removing the table.", "Sorting first."],
          0,
          "Check NULLs to avoid surprises.",
          "hard"
        ),
      ];
    case 5:
      return [
        checkpointMcq(
          "GROUP BY is used to:",
          ["Summarize by category.", "Sort alphabetically.", "Delete rows.", "Rename columns."],
          0,
          "GROUP BY creates summaries.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: You used WHERE on an aggregate.",
          ["Use HAVING for aggregate filters.", "Remove GROUP BY.", "Add LIMIT.", "Sort by id."],
          0,
          "HAVING filters aggregated results.",
          "easy"
        ),
        checkpointMcq(
          "A join should connect tables on:",
          ["Matching keys.", "Random columns.", "Row number only.", "Text length."],
          0,
          "Join on shared keys.",
          "medium"
        ),
        checkpointMcq(
          "After a join, you should:",
          ["Check for duplicates.", "Assume counts are fine.", "Delete a column.", "Skip validation."],
          0,
          "Joins can duplicate rows.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: Aggregates are inflated after join.",
          ["Aggregate after the join with correct keys.", "Add more joins.", "Use SELECT *.", "Delete filters."],
          0,
          "Aggregate carefully after joining.",
          "medium"
        ),
        checkpointMcq(
          "To filter on totals, use:",
          ["HAVING", "WHERE", "ORDER BY", "LIMIT"],
          0,
          "HAVING filters aggregate results.",
          "hard"
        ),
      ];
    case 6:
      return [
        checkpointMcq(
          "A chart choice should match:",
          ["The question you are answering.", "Your favorite colors.", "Font size.", "Data source only."],
          0,
          "Pick charts for the question.",
          "easy"
        ),
        checkpointFix(
          "Fix the dashboard: It has too many KPIs.",
          ["Keep only the KPIs tied to the goal.", "Add more cards.", "Hide labels.", "Use random colors."],
          0,
          "Focus on the KPIs that matter.",
          "easy"
        ),
        checkpointMcq(
          "Filters help because they:",
          ["Let people see segments quickly.", "Hide the trend.", "Remove data.", "Change the source."],
          0,
          "Filters speed up exploration.",
          "medium"
        ),
        checkpointMcq(
          "Visual hierarchy means:",
          ["The most important info is easiest to see.", "Everything looks the same.", "All text is small.", "No titles."],
          0,
          "Guide attention to key info.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: The dashboard is cluttered.",
          ["Remove non-essential visuals.", "Add more charts.", "Shrink all text.", "Hide the axes."],
          0,
          "Remove clutter to focus.",
          "medium"
        ),
        checkpointMcq(
          "Before sharing, you should:",
          ["Confirm filters and totals.", "Turn off legends.", "Delete the data model.", "Hide titles."],
          0,
          "Validate before sharing.",
          "hard"
        ),
      ];
    case 7:
      return [
        checkpointMcq(
          "A dashboard project starts with:",
          ["A single goal question.", "Colors and fonts.", "Chart types only.", "No data prep."],
          0,
          "Start with the goal.",
          "easy"
        ),
        checkpointFix(
          "Fix the model: Relationships are missing.",
          ["Define relationships before building visuals.", "Add more charts.", "Hide tables.", "Use only CSVs."],
          0,
          "Relationships keep metrics correct.",
          "easy"
        ),
        checkpointMcq(
          "KPI cards should show:",
          ["Key numbers tied to the goal.", "Every table name.", "Random stats.", "No context."],
          0,
          "Keep KPI cards focused.",
          "medium"
        ),
        checkpointMcq(
          "A trend view should:",
          ["Show change over time clearly.", "Hide dates.", "Use only pie charts.", "Remove labels."],
          0,
          "Trends need time on the axis.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: Filters are missing.",
          ["Add filters for main segments.", "Delete all slicers.", "Hide legends.", "Use only one color."],
          0,
          "Filters make dashboards useful.",
          "medium"
        ),
        checkpointMcq(
          "Final review checks:",
          ["Totals, filters, and titles.", "Only colors.", "Only fonts.", "Nothing at all."],
          0,
          "Check the basics before sharing.",
          "hard"
        ),
      ];
    case 8:
      return [
        checkpointMcq(
          `To load ${scenario.file}, use:`,
          ["read_csv", "groupby", "merge", "plot"],
          0,
          "read_csv loads files.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: Column names have spaces.",
          ["Standardize names (lowercase, underscores).", "Add more columns.", "Hide headers.", "Drop all columns."],
          0,
          "Clean names before analysis.",
          "easy"
        ),
        checkpointMcq(
          "To inspect column types, use:",
          ["info()", "sum()", "merge()", "plot()"],
          0,
          "info() shows types and nulls.",
          "medium"
        ),
        checkpointMcq(
          "Missing values should be handled by:",
          ["Filling or removing based on the goal.", "Ignoring always.", "Deleting the file.", "Sorting only."],
          0,
          "Handle missing values on purpose.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: You filtered after exporting.",
          ["Filter before exporting clean data.", "Export raw data only.", "Delete the filter.", "Rename the file."],
          0,
          "Filter before export.",
          "medium"
        ),
        checkpointMcq(
          "A new column can be created by:",
          ["Combining or calculating from existing columns.", "Changing colors.", "Renaming the file.", "Sorting."],
          0,
          "Create derived columns with simple rules.",
          "hard"
        ),
      ];
    case 9:
      return [
        checkpointMcq(
          "groupby is used to:",
          ["Summarize by category.", "Sort columns.", "Drop rows.", "Change data types."],
          0,
          "groupby summarizes by group.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: You plotted before sorting by date.",
          ["Sort by date, then plot.", "Remove the date.", "Shuffle rows.", "Use only bar charts."],
          0,
          "Sort time series first.",
          "easy"
        ),
        checkpointMcq(
          "Segmentation helps you:",
          ["Compare groups clearly.", "Hide differences.", "Skip labels.", "Remove columns."],
          0,
          "Segments show differences.",
          "medium"
        ),
        checkpointMcq(
          "Top and bottom views help you:",
          ["Find best and worst performers.", "Remove all data.", "Ignore trends.", "Hide outliers."],
          0,
          "Rank to see extremes.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: You merged without checking keys.",
          ["Validate keys before merging.", "Merge on row number.", "Ignore duplicates.", "Drop both tables."],
          0,
          "Check keys first.",
          "medium"
        ),
        checkpointMcq(
          "A good summary line includes:",
          ["Metric, change, and action.", "Only tools used.", "Every row count.", "No context."],
          0,
          "Keep it action-ready.",
          "hard"
        ),
      ];
    case 10:
      return [
        checkpointMcq(
          "A cohort groups users by:",
          ["The same start event.", "Random picks.", "Only top spenders.", "One location only."],
          0,
          "Cohorts share a start.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: You compared cohorts from different start months.",
          ["Compare cohorts with the same timeline.", "Mix all cohorts.", "Drop the date.", "Hide the chart."],
          0,
          "Align cohorts by time since start.",
          "easy"
        ),
        checkpointMcq(
          "Retention means:",
          ["How many users return over time.", "Total downloads.", "Number of charts.", "Emails sent."],
          0,
          "Retention tracks repeat usage.",
          "medium"
        ),
        checkpointMcq(
          "In an A/B test, you should:",
          ["Keep the groups consistent.", "Change rules mid-test.", "Stop tracking guardrails.", "Pick a winner on day one."],
          0,
          "Consistency keeps tests fair.",
          "medium"
        ),
        checkpointFix(
          "Fix the mistake: You ignored a guardrail metric.",
          ["Check guardrails before deciding.", "Ignore it if the main metric is up.", "Delete the guardrail.", "Stop the test."],
          0,
          "Guardrails prevent harm.",
          "medium"
        ),
        checkpointMcq(
          "A final recommendation should:",
          ["State the next step clearly.", "List every tool.", "Hide results.", "Skip the action."],
          0,
          "Recommendations need an action.",
          "hard"
        ),
      ];
    case 11:
      return [
        checkpointMcq(
          "A good case kickoff question is:",
          ["What decision will this support?", "What colors do you prefer?", "Can we skip cleaning?", "What is the font size?"],
          0,
          "Start with the decision.",
          "easy"
        ),
        checkpointFix(
          "Fix the mistake: You jumped to charts without cleaning.",
          ["Check data quality first.", "Add more visuals.", "Hide the table.", "Ignore missing values."],
          0,
          "Clean before charting.",
          "easy"
        ),
        checkpointMcq(
          "When explaining a chart, lead with:",
          ["The key change and why it matters.", "Every axis detail.", "Your tool choice.", "The colors used."],
          0,
          "Lead with insight.",
          "medium"
        ),
        checkpointMcq(
          "An executive summary should be:",
          ["Short, clear, and actionable.", "Long and technical.", "Only charts.", "Only raw data."],
          0,
          "Keep it short and clear.",
          "medium"
        ),
        checkpointFix(
          "Fix the interview answer: It is tool-only.",
          ["Add context, insight, and action.", "List more tools.", "Shorten to one word.", "Remove the outcome."],
          0,
          "Stories beat tool lists.",
          "medium"
        ),
        checkpointMcq(
          "A strong closing line is:",
          ["I found the change, explained impact, and recommended a next step.", "I used many tools.", "The data was big.", "I made charts."],
          0,
          "End with impact and action.",
          "hard"
        ),
      ];
    default:
      return [
        checkpointMcq(
          "What is the best next step?",
          ["Take one clear action.", "Wait and hope.", "Ignore the change.", "Share no update."],
          0,
          "Lead with an action.",
          "easy"
        ),
      ];
  }
};

const buildCheckpointQuestionsForDay = (
  weekIndex: number,
  scenario: Scenario,
  testId: string
): CheckpointQuestionSeed[] => {
  const questions = buildCheckpointQuestionBank(weekIndex, scenario).slice(0, 8);
  return questions.map((question, index) => ({
    id: `${testId}-q${index + 1}`,
    checkpointTestId: testId,
    ...question,
  }));
};

const buildCheckpointTestForDay = (
  dayNumber: number,
  weekIndex: number,
  scenario: Scenario,
  title: string
): CheckpointTestSeed => {
  const id = `checkpoint-day-${dayNumber}`;
  return {
    id,
    dayNumber,
    title: `Checkpoint Day ${dayNumber}: ${title}`,
    passPercent: 70,
    xpReward: 15,
    questions: buildCheckpointQuestionsForDay(weekIndex, scenario, id),
  };
};

const buildProgramContent = (): ProgramContent => {
  const lessons = buildLessons();
  const skillChecks: SkillCheckSeed[] = [];
  const patterns: PatternSeed[] = [];
  const checkpointTests: CheckpointTestSeed[] = [];

  let dayCounter = 1;
  weekPlans.forEach((week, weekIndex) => {
    week.dayTitles.forEach((title, dayIndex) => {
      const scenario = week.scenarios[dayIndex % week.scenarios.length];
      skillChecks.push(...buildSkillChecksForDay(dayCounter, weekIndex, scenario));
      patterns.push(...buildPatternsForDay(dayCounter, weekIndex, scenario, title));
      checkpointTests.push(buildCheckpointTestForDay(dayCounter, weekIndex, scenario, title));
      dayCounter += 1;
    });
  });

  return { lessons, skillChecks, patterns, checkpointTests };
};

type ContentIssue = { day: number; issues: string[] };

const bannedPhrases = ["analyze the data", "use insights", "optimize metrics"];

export const lintProgramContent = (content: ProgramContent): ContentIssue[] => {
  const issues: ContentIssue[] = [];
  content.lessons.forEach((lesson) => {
    const lessonIssues: string[] = [];
    const hasTableVisual = lesson.steps.some(
      (step) => step.type === "visual" && step.visual?.type === "table"
    );
    if (!hasTableVisual) {
      lessonIssues.push("Missing table visual step.");
    }
    if (!lesson.realWorldLine.includes("What you'd tell your manager:")) {
      lessonIssues.push("Missing manager-style sentence.");
    }
    lesson.steps.forEach((step) => {
      if (step.type !== "intuition" && step.type !== "learn") {
        return;
      }
      const haystack = `${step.title ?? ""} ${step.body ?? ""}`.toLowerCase();
      if (bannedPhrases.some((phrase) => haystack.includes(phrase))) {
        const hasExample = Boolean(step.example && step.example.trim());
        if (!hasExample) {
          lessonIssues.push(`Vague phrase without example in "${step.title ?? "step"}".`);
        }
      }
    });
    if (lessonIssues.length) {
      issues.push({ day: lesson.day, issues: lessonIssues });
    }
  });
  return issues;
};

export const runContentChecks = (): ContentIssue[] => {
  const content = buildProgramContent();
  return lintProgramContent(content);
};

export const ensureContentSeeded = async () => {
  if (seeded) {
    return;
  }

  const db = await getDb();
  const seedResult = await db`
    SELECT version
    FROM content_seed
    WHERE version = ${CONTENT_SEED_VERSION}
    LIMIT 1
  `;

  const content = buildProgramContent();
  const expectedLessonSteps = content.lessons.reduce(
    (total, lesson) => total + lesson.steps.length,
    0
  );
  const expectedCheckpointQuestions = content.checkpointTests.reduce(
    (total, test) => total + test.questions.length,
    0
  );
  const countsResult = await db`
    SELECT
      (SELECT COUNT(*) FROM lessons) AS lessons,
      (SELECT COUNT(*) FROM lesson_steps) AS lesson_steps,
      (SELECT COUNT(*) FROM skill_checks) AS skill_checks,
      (SELECT COUNT(*) FROM patterns) AS patterns,
      (SELECT COUNT(*) FROM checkpoint_tests) AS checkpoint_tests,
      (SELECT COUNT(*) FROM checkpoint_questions) AS checkpoint_questions
  `;
  const countsRow = countsResult.rows[0] as {
    lessons: string | number;
    lesson_steps: string | number;
    skill_checks: string | number;
    patterns: string | number;
    checkpoint_tests: string | number;
    checkpoint_questions: string | number;
  };
  const hasAllContent =
    Number(countsRow.lessons) >= content.lessons.length &&
    Number(countsRow.lesson_steps) >= expectedLessonSteps &&
    Number(countsRow.skill_checks) >= content.skillChecks.length &&
    Number(countsRow.patterns) >= content.patterns.length &&
    Number(countsRow.checkpoint_tests) >= content.checkpointTests.length &&
    Number(countsRow.checkpoint_questions) >= expectedCheckpointQuestions;
  if (hasAllContent) {
    if (!seedResult.rows[0]) {
      await db`
        INSERT INTO content_seed (version)
        VALUES (${CONTENT_SEED_VERSION})
        ON CONFLICT (version) DO NOTHING
      `;
    }
    seeded = true;
    return;
  }

  const issues = lintProgramContent(content);
  if (issues.length) {
    const summary = issues
      .map((issue) => `Day ${issue.day}: ${issue.issues.join(" ")}`)
      .join(" | ");
    throw new Error(`Content check failed. ${summary}`);
  }

  for (const lesson of content.lessons) {
    const recapJson = JSON.stringify(lesson.recapBullets);
    await db`
      INSERT INTO lessons (day, title, micro_goal, recap_bullets, real_world_line)
      VALUES (
        ${lesson.day},
        ${lesson.title},
        ${lesson.microGoal},
        ${recapJson}::jsonb,
        ${lesson.realWorldLine}
      )
      ON CONFLICT (day) DO UPDATE
      SET title = EXCLUDED.title,
          micro_goal = EXCLUDED.micro_goal,
          recap_bullets = EXCLUDED.recap_bullets,
          real_world_line = EXCLUDED.real_world_line
    `;

    for (const [index, step] of lesson.steps.entries()) {
      const choicesJson = step.choices ? JSON.stringify(step.choices) : null;
      const visualJson = step.visual ? JSON.stringify(step.visual) : null;
      await db`
        INSERT INTO lesson_steps (
          lesson_day,
          sort_order,
          type,
          title,
          body,
          example,
          prompt,
          choices,
          correct_index,
          explanation,
          visual_json
        )
        VALUES (
          ${lesson.day},
          ${index + 1},
          ${step.type},
          ${step.title ?? null},
          ${step.body ?? null},
          ${step.example ?? null},
          ${step.prompt ?? null},
          ${choicesJson}::jsonb,
          ${step.correctIndex ?? null},
          ${step.explanation ?? null},
          ${visualJson}::jsonb
        )
        ON CONFLICT (lesson_day, sort_order) DO UPDATE
        SET type = EXCLUDED.type,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            example = EXCLUDED.example,
            prompt = EXCLUDED.prompt,
            choices = EXCLUDED.choices,
            correct_index = EXCLUDED.correct_index,
            explanation = EXCLUDED.explanation,
            visual_json = EXCLUDED.visual_json
      `;
    }
  }

  for (const check of content.skillChecks) {
    const choicesJson = JSON.stringify(check.choices);
    const answerJson = JSON.stringify(check.answer);
    await db`
      INSERT INTO skill_checks (
        id,
        day_number,
        title,
        prompt,
        type,
        choices_json,
        answer_json,
        explanation,
        xp_reward
      )
      VALUES (
        ${check.id},
        ${check.dayNumber},
        ${check.title},
        ${check.prompt},
        ${check.type},
        ${choicesJson}::jsonb,
        ${answerJson}::jsonb,
        ${check.explanation},
        ${check.xpReward}
      )
      ON CONFLICT (id) DO UPDATE
      SET day_number = EXCLUDED.day_number,
          title = EXCLUDED.title,
          prompt = EXCLUDED.prompt,
          type = EXCLUDED.type,
          choices_json = EXCLUDED.choices_json,
          answer_json = EXCLUDED.answer_json,
          explanation = EXCLUDED.explanation,
          xp_reward = EXCLUDED.xp_reward
    `;
  }

  for (const pattern of content.patterns) {
    const contentJson = JSON.stringify(pattern.content);
    await db`
      INSERT INTO patterns (id, day_number, title, description, content_json)
      VALUES (
        ${pattern.id},
        ${pattern.dayNumber},
        ${pattern.title},
        ${pattern.description},
        ${contentJson}::jsonb
      )
      ON CONFLICT (id) DO UPDATE
      SET day_number = EXCLUDED.day_number,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content_json = EXCLUDED.content_json
    `;
  }

  for (const test of content.checkpointTests) {
    await db`
      INSERT INTO checkpoint_tests (id, day_number, title, pass_percent, xp_reward)
      VALUES (${test.id}, ${test.dayNumber}, ${test.title}, ${test.passPercent}, ${test.xpReward})
      ON CONFLICT (id) DO UPDATE
      SET day_number = EXCLUDED.day_number,
          title = EXCLUDED.title,
          pass_percent = EXCLUDED.pass_percent,
          xp_reward = EXCLUDED.xp_reward
    `;

    for (const question of test.questions) {
      const choicesJson = JSON.stringify(question.choices);
      const answerJson = JSON.stringify(question.answer);
      await db`
        INSERT INTO checkpoint_questions (
          id,
          checkpoint_test_id,
          type,
          prompt,
          choices_json,
          answer_json,
          explanation,
          difficulty
        )
        VALUES (
          ${question.id},
          ${question.checkpointTestId},
          ${question.type},
          ${question.prompt},
          ${choicesJson}::jsonb,
          ${answerJson}::jsonb,
          ${question.explanation},
          ${question.difficulty}
        )
        ON CONFLICT (id) DO UPDATE
        SET checkpoint_test_id = EXCLUDED.checkpoint_test_id,
            type = EXCLUDED.type,
            prompt = EXCLUDED.prompt,
            choices_json = EXCLUDED.choices_json,
            answer_json = EXCLUDED.answer_json,
            explanation = EXCLUDED.explanation,
            difficulty = EXCLUDED.difficulty
      `;
    }
  }

  await db`
    INSERT INTO content_seed (version)
    VALUES (${CONTENT_SEED_VERSION})
    ON CONFLICT (version) DO NOTHING
  `;
  seeded = true;
};

export const getLessonForDay = async (day: number): Promise<Lesson | null> => {
  await ensureContentSeeded();
  const db = await getDb();
  const lessonResult = await db`
    SELECT day, title, micro_goal, recap_bullets, real_world_line
    FROM lessons
    WHERE day = ${day}
    LIMIT 1
  `;
  const lessonRow = lessonResult.rows[0] as LessonRow | undefined;
  if (!lessonRow) {
    return null;
  }

  const stepResult = await db`
    SELECT id, lesson_day, sort_order, type, title, body, example, prompt, choices, correct_index, explanation, visual_json
    FROM lesson_steps
    WHERE lesson_day = ${day}
    ORDER BY sort_order ASC, id ASC
  `;

  const steps = stepResult.rows.map((row) => {
    const stepRow = row as LessonStepRow;
    const stepType =
      stepRow.type === "intuition"
        ? "intuition"
        : stepRow.type === "learn"
        ? "learn"
        : stepRow.type === "visual"
        ? "visual"
        : stepRow.type === "fix"
        ? "fix"
        : "mcq";
    return {
      id: Number(stepRow.id),
      lessonDay: Number(stepRow.lesson_day),
      sortOrder: Number(stepRow.sort_order),
      type: stepType,
      title: stepRow.title,
      body: stepRow.body,
      example: stepRow.example,
      prompt: stepRow.prompt,
      choices: toOptions(stepRow.choices),
      correctIndex: stepRow.correct_index,
      explanation: stepRow.explanation,
      visual: parseVisual(stepRow.visual_json),
    } satisfies LessonStep;
  });

  return {
    day: Number(lessonRow.day),
    title: String(lessonRow.title),
    microGoal: String(lessonRow.micro_goal),
    recapBullets: toStringArray(lessonRow.recap_bullets),
    realWorldLine: String(lessonRow.real_world_line ?? ""),
    steps,
  };
};

export const getStepProgressForDay = async (userId: number, day: number) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT sp.step_id, sp.selected_index, sp.is_correct
    FROM user_step_progress sp
    INNER JOIN lesson_steps ls ON ls.id = sp.step_id
    WHERE sp.user_id = ${userId} AND ls.lesson_day = ${day}
  `;
  const map = new Map<number, StepProgressRow>();
  result.rows.forEach((row) => {
    const progress = row as StepProgressRow;
    map.set(Number(progress.step_id), {
      step_id: Number(progress.step_id),
      selected_index: progress.selected_index ?? null,
      is_correct: progress.is_correct ?? null,
    });
  });
  return map;
};

export const getStepById = async (stepId: number) => {
  await ensureContentSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, lesson_day, sort_order, type, title, body, example, prompt, choices, correct_index, explanation, visual_json
    FROM lesson_steps
    WHERE id = ${stepId}
    LIMIT 1
  `;
  const row = result.rows[0] as LessonStepRow | undefined;
  if (!row) {
    return null;
  }
  const stepType =
    row.type === "intuition"
      ? "intuition"
      : row.type === "learn"
      ? "learn"
      : row.type === "visual"
      ? "visual"
      : row.type === "fix"
      ? "fix"
      : "mcq";
  return {
    id: Number(row.id),
    lessonDay: Number(row.lesson_day),
    sortOrder: Number(row.sort_order),
    type: stepType,
    title: row.title,
    body: row.body,
    example: row.example,
    prompt: row.prompt,
    choices: toOptions(row.choices),
    correctIndex: row.correct_index,
    explanation: row.explanation,
    visual: parseVisual(row.visual_json),
  } satisfies LessonStep;
};

export const recordLearnStep = async (userId: number, stepId: number) => {
  const step = await getStepById(stepId);
  if (
    !step ||
    (step.type !== "learn" && step.type !== "intuition" && step.type !== "visual")
  ) {
    return null;
  }
  const db = await getDb();
  await db`
    INSERT INTO user_step_progress (user_id, step_id, selected_index, is_correct)
    VALUES (${userId}, ${stepId}, NULL, NULL)
    ON CONFLICT (user_id, step_id) DO NOTHING
  `;
  return step;
};

export const recordAnswer = async (userId: number, stepId: number, selectedIndex: number) => {
  const step = await getStepById(stepId);
  if (!step || step.type === "learn" || step.type === "intuition" || step.type === "visual") {
    return null;
  }
  const correctIndex = step.correctIndex ?? -1;
  const isCorrect = selectedIndex === correctIndex;
  const db = await getDb();
  await db`
    INSERT INTO user_step_progress (user_id, step_id, selected_index, is_correct)
    VALUES (${userId}, ${stepId}, ${selectedIndex}, ${isCorrect})
    ON CONFLICT (user_id, step_id) DO NOTHING
  `;
  return { step, isCorrect };
};



