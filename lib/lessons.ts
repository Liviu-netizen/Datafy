import "server-only";

import { getDb } from "./db";

type LessonRow = {
  day: number;
  title: string;
  micro_goal: string;
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
  questions: Question[];
};

type QuestionSeed = {
  type: "multiple_choice" | "fix_the_mistake";
  prompt: string;
  options: string[];
  correctIndex: number;
  feedbackCorrect: string;
  feedbackIncorrect: string;
  sortOrder: number;
};

type Scenario = Record<string, string>;

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

const buildLessons = () => {
  const lessons: {
    day: number;
    title: string;
    microGoal: string;
    questions: QuestionSeed[];
  }[] = [];

  let dayCounter = 1;
  weekPlans.forEach((week, weekIndex) => {
    week.dayTitles.forEach((title, dayIndex) => {
      const scenario = week.scenarios[dayIndex % week.scenarios.length];
      const questions = buildQuestions(weekIndex, scenario).map((question, index) => ({
        ...question,
        sortOrder: index + 1,
      })) as QuestionSeed[];
      lessons.push({
        day: dayCounter,
        title: `Day ${dayCounter}: ${title}`,
        microGoal: week.microGoals[dayIndex],
        questions,
      });
      dayCounter += 1;
    });
  });

  return lessons;
};

const ensureSeeded = async () => {
  if (seeded) {
    return;
  }

  const db = await getDb();
  const countResult = await db`SELECT COUNT(*)::int AS count FROM lessons`;
  const count = Number(countResult.rows[0]?.count ?? 0);
  if (count > 0) {
    seeded = true;
    return;
  }

  const lessons = buildLessons();
  for (const lesson of lessons) {
    await db`
      INSERT INTO lessons (day, title, micro_goal)
      VALUES (${lesson.day}, ${lesson.title}, ${lesson.microGoal})
    `;
    for (const question of lesson.questions) {
      await db`
        INSERT INTO questions (
          lesson_day,
          sort_order,
          type,
          prompt,
          options,
          correct_index,
          feedback_correct,
          feedback_incorrect
        )
        VALUES (
          ${lesson.day},
          ${question.sortOrder ?? 0},
          ${question.type},
          ${question.prompt},
          ${JSON.stringify(question.options)}::jsonb,
          ${question.correctIndex},
          ${question.feedbackCorrect},
          ${question.feedbackIncorrect}
        )
      `;
    }
  }

  seeded = true;
};

export const getLessonForDay = async (day: number): Promise<Lesson | null> => {
  await ensureSeeded();
  const db = await getDb();
  const lessonResult = await db`
    SELECT day, title, micro_goal
    FROM lessons
    WHERE day = ${day}
    LIMIT 1
  `;
  const lessonRow = lessonResult.rows[0] as LessonRow | undefined;
  if (!lessonRow) {
    return null;
  }

  const questionResult = await db`
    SELECT id, lesson_day, sort_order, type, prompt, options, correct_index, feedback_correct, feedback_incorrect
    FROM questions
    WHERE lesson_day = ${day}
    ORDER BY sort_order ASC, id ASC
  `;

  const questions = questionResult.rows.map((row) => {
    const questionRow = row as QuestionRow;
    return {
      id: Number(questionRow.id),
      lessonDay: Number(questionRow.lesson_day),
      sortOrder: Number(questionRow.sort_order),
      type: questionRow.type === "fix_the_mistake" ? "fix_the_mistake" : "multiple_choice",
      prompt: String(questionRow.prompt),
      options: toOptions(questionRow.options),
      correctIndex: Number(questionRow.correct_index),
      feedbackCorrect: String(questionRow.feedback_correct),
      feedbackIncorrect: String(questionRow.feedback_incorrect),
    } satisfies Question;
  });

  return {
    day: Number(lessonRow.day),
    title: String(lessonRow.title),
    microGoal: String(lessonRow.micro_goal),
    questions,
  };
};

export const getAnswersForDay = async (userId: number, day: number) => {
  await ensureSeeded();
  const db = await getDb();
  const result = await db`
    SELECT ua.question_id, ua.selected_index, ua.is_correct
    FROM user_answers ua
    INNER JOIN questions q ON q.id = ua.question_id
    WHERE ua.user_id = ${userId} AND q.lesson_day = ${day}
  `;
  const map = new Map<number, AnswerRow>();
  result.rows.forEach((row) => {
    const answer = row as AnswerRow;
    map.set(Number(answer.question_id), {
      question_id: Number(answer.question_id),
      selected_index: Number(answer.selected_index),
      is_correct: Boolean(answer.is_correct),
    });
  });
  return map;
};

export const getQuestionById = async (questionId: number) => {
  await ensureSeeded();
  const db = await getDb();
  const result = await db`
    SELECT id, lesson_day, sort_order, type, prompt, options, correct_index, feedback_correct, feedback_incorrect
    FROM questions
    WHERE id = ${questionId}
    LIMIT 1
  `;
  const row = result.rows[0] as QuestionRow | undefined;
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    lessonDay: Number(row.lesson_day),
    sortOrder: Number(row.sort_order),
    type: row.type === "fix_the_mistake" ? "fix_the_mistake" : "multiple_choice",
    prompt: String(row.prompt),
    options: toOptions(row.options),
    correctIndex: Number(row.correct_index),
    feedbackCorrect: String(row.feedback_correct),
    feedbackIncorrect: String(row.feedback_incorrect),
  } satisfies Question;
};

export const recordAnswer = async (
  userId: number,
  questionId: number,
  selectedIndex: number
) => {
  const question = await getQuestionById(questionId);
  if (!question) {
    return null;
  }

  const isCorrect = selectedIndex === question.correctIndex;
  const db = await getDb();
  await db`
    INSERT INTO user_answers (user_id, question_id, selected_index, is_correct)
    VALUES (${userId}, ${questionId}, ${selectedIndex}, ${isCorrect})
    ON CONFLICT (user_id, question_id) DO NOTHING
  `;
  return { question, isCorrect };
};

export const getAnswerForQuestion = async (userId: number, questionId: number) => {
  await ensureSeeded();
  const db = await getDb();
  const result = await db`
    SELECT question_id, selected_index, is_correct
    FROM user_answers
    WHERE user_id = ${userId} AND question_id = ${questionId}
    LIMIT 1
  `;
  const row = result.rows[0] as AnswerRow | undefined;
  if (!row) {
    return null;
  }
  return {
    questionId: Number(row.question_id),
    selectedIndex: Number(row.selected_index),
    isCorrect: Boolean(row.is_correct),
  };
};

export const getAnsweredCount = async (userId: number, day: number) => {
  await ensureSeeded();
  const db = await getDb();
  const result = await db`
    SELECT COUNT(*)::int AS count
    FROM user_answers ua
    INNER JOIN questions q ON q.id = ua.question_id
    WHERE ua.user_id = ${userId} AND q.lesson_day = ${day}
  `;
  return Number(result.rows[0]?.count ?? 0);
};

