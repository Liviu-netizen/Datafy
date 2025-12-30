import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLessonForDay, getStepProgressForDay } from "@/lib/lessons";
import { getCompletedDays, getDashboardData } from "@/lib/progress";
import { getSkillCheckById, getSkillChecksForUser } from "@/lib/skill-checks";
import {
  completeDay,
  continueLesson,
  logout,
  submitAnswer,
  submitSkillCheck,
} from "./actions";

export const runtime = "nodejs";

const getRank = (xp: number) => {
  const ranks = [
    { label: "Beginner Analyst", min: 0, max: 60 },
    { label: "Junior Analyst", min: 60, max: 160 },
    { label: "Analyst", min: 160, max: 320 },
    { label: "Senior Analyst", min: 320, max: 520 },
    { label: "Lead Analyst", min: 520, max: 800 },
  ];
  const current =
    ranks.find((rank) => xp >= rank.min && xp < rank.max) ??
    ranks[ranks.length - 1];
  const progress =
    current.max > current.min ? (xp - current.min) / (current.max - current.min) : 1;
  return {
    label: current.label,
    progress: Math.max(0, Math.min(progress, 1)),
    max: current.max,
  };
};

const exampleCards = [
  {
    id: "charts",
    title: "Good vs bad charts",
    blurb: "Honest axes, clear scales, no clutter.",
    points: [
      "Start axes at zero when possible.",
      "Label trends, not decorations.",
      "One message per chart.",
    ],
  },
  {
    id: "cleaning",
    title: "Clean vs messy data",
    blurb: "Small fixes make numbers trustworthy.",
    points: [
      "Normalize categories and casing.",
      "Remove duplicates before analysis.",
      "Check dates and missing values.",
    ],
  },
  {
    id: "manager",
    title: "What analysts send to managers",
    blurb: "Short, clear, action-ready updates.",
    points: [
      "Lead with the decision needed.",
      "State the metric and timeframe.",
      "Offer one clear recommendation.",
    ],
  },
];

type DashboardPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const dashboard = await getDashboardData(user.id);
  const completedDays = await getCompletedDays(user.id);
  const completedSet = new Set(completedDays);
  const rank = getRank(dashboard.xp);
  const progressPercent = Math.round(rank.progress * 100);

  const showParam = typeof searchParams?.show === "string" ? searchParams.show : "";
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : "";
  const showId = Number.isFinite(Number(showParam)) ? Number(showParam) : null;
  const viewParam = typeof searchParams?.view === "string" ? searchParams.view : "";
  const view = viewParam || (showId || errorParam ? "lesson" : "home");
  const dayParam = typeof searchParams?.day === "string" ? searchParams.day : "";
  const requestedDay = Number(dayParam);
  const stepParam = typeof searchParams?.step === "string" ? searchParams.step : "";
  const requestedStep = Number(stepParam);
  const checkParam = typeof searchParams?.check === "string" ? searchParams.check : "";
  const resultParam = typeof searchParams?.result === "string" ? searchParams.result : "";
  const exampleParam =
    typeof searchParams?.example === "string" ? searchParams.example : "";

  if (view === "lesson") {
    const lesson = await getLessonForDay(dashboard.dayNumber);
    if (!lesson) {
      redirect("/dashboard");
    }

    const progress = await getStepProgressForDay(user.id, lesson.day);
    const totalSteps = lesson.steps.length;
    const showStep = showId && progress.has(showId)
      ? lesson.steps.find((step) => step.id === showId)
      : null;
    const nextStep = lesson.steps.find((step) => !progress.has(step.id)) ?? null;
    const currentStep = showStep ?? nextStep;
    const currentIndex = currentStep
      ? lesson.steps.findIndex((step) => step.id === currentStep.id) + 1
      : totalSteps;
    const currentProgress = currentStep ? progress.get(currentStep.id) : null;
    const lessonComplete = progress.size >= totalSteps;

    return (
      <div className="mimo-shell dashboard-shell">
        <div className="dashboard-wrap">
          <Link className="dashboard-back" href="/dashboard">
            Back to home
          </Link>
          <div className="mimo-card float-in">
            <span className="mimo-pill">
              Day {dashboard.dayNumber} of {dashboard.totalDays}
            </span>
            <h1 className="mimo-title">{lesson.title}</h1>
            <p className="mimo-subtitle">{lesson.microGoal}</p>

            <div className="mimo-progress">
              <span>
                Step {currentIndex} of {totalSteps}
              </span>
              <span>
                {dashboard.xp} XP | {dashboard.streak} streak
              </span>
            </div>

            {errorParam ? <div className="mimo-alert">{errorParam}</div> : null}

            {dashboard.completedAll ? (
              <div className="mimo-note">You finished all 84 days. Amazing work.</div>
            ) : dashboard.todayCompleted ? (
              <div className="mimo-note">Today is complete. Come back tomorrow.</div>
            ) : currentStep ? (
              currentStep.type === "learn" ? (
                <div className="mimo-learn-card float-in">
                  {currentStep.title ? (
                    <h2 className="mimo-learn-title">{currentStep.title}</h2>
                  ) : null}
                  {currentStep.body ? (
                    <p className="mimo-learn-body">{currentStep.body}</p>
                  ) : null}
                  {currentStep.example ? (
                    <p className="mimo-learn-example">{currentStep.example}</p>
                  ) : null}
                  <form action={continueLesson}>
                    <input type="hidden" name="stepId" value={currentStep.id} />
                    <button className="mimo-button soft-glow" type="submit">
                      Continue
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mimo-question-card float-in">
                  <span className="mimo-question-tag">
                    {currentStep.type === "fix" ? "Fix the mistake" : "Multiple choice"}
                  </span>
                  <p className="mimo-question">{currentStep.prompt}</p>

                  {currentProgress ? (
                    <div className="grid gap-3">
                      {currentStep.choices?.map((option, index) => {
                        const isCorrect = index === currentStep.correctIndex;
                        const isSelected = currentProgress.selected_index === index;
                        const stateClass = isCorrect
                          ? "correct"
                          : isSelected
                          ? "incorrect"
                          : "";
                        return (
                          <button
                            key={`${currentStep.id}-${index}`}
                            className={`mimo-choice ${stateClass}`}
                            type="button"
                            disabled
                          >
                            {option}
                          </button>
                        );
                      })}
                      <div className="mimo-feedback">
                        <strong>{currentProgress.is_correct ? "Correct." : "Not quite."}</strong>{" "}
                        {currentStep.explanation}
                      </div>
                      <form action={continueLesson}>
                        <input type="hidden" name="stepId" value={currentStep.id} />
                        <button className="mimo-button" type="submit">
                          Continue
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={submitAnswer} className="grid gap-3">
                      <input type="hidden" name="stepId" value={currentStep.id} />
                      {currentStep.choices?.map((option, index) => (
                        <label key={`${currentStep.id}-${index}`} className="mimo-choice-option">
                          <input type="radio" name="answerIndex" value={index} required />
                          <span>{option}</span>
                        </label>
                      ))}
                      <button className="mimo-button soft-glow" type="submit">
                        Check
                      </button>
                    </form>
                  )}
                </div>
              )
            ) : lessonComplete ? (
              <form action={completeDay} className="mt-6">
                <button className="mimo-button soft-glow" type="submit">
                  Finish day {lesson.day}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (view === "review") {
    if (!Number.isFinite(requestedDay) || !completedSet.has(requestedDay)) {
      redirect("/dashboard");
    }

    const lesson = await getLessonForDay(requestedDay);
    if (!lesson) {
      redirect("/dashboard");
    }

    const progress = await getStepProgressForDay(user.id, lesson.day);
    const totalSteps = lesson.steps.length;
    const normalizedStep = Number.isFinite(requestedStep) ? requestedStep : 1;
    const stepIndex = Math.min(Math.max(normalizedStep, 1), totalSteps);
    const currentStep = lesson.steps[stepIndex - 1];
    const currentProgress = progress.get(currentStep.id);

    return (
      <div className="mimo-shell dashboard-shell">
        <div className="dashboard-wrap">
          <Link className="dashboard-back" href="/dashboard">
            Back to home
          </Link>
          <div className="mimo-card float-in">
            <span className="mimo-pill">Day {requestedDay} recap</span>
            <h1 className="mimo-title">{lesson.title}</h1>
            <p className="mimo-subtitle">{lesson.microGoal}</p>

            <div className="mimo-progress">
              <span>
                Step {stepIndex} of {totalSteps}
              </span>
              <span>Read-only</span>
            </div>

            {currentStep.type === "learn" ? (
              <div className="mimo-learn-card float-in">
                {currentStep.title ? (
                  <h2 className="mimo-learn-title">{currentStep.title}</h2>
                ) : null}
                {currentStep.body ? (
                  <p className="mimo-learn-body">{currentStep.body}</p>
                ) : null}
                {currentStep.example ? (
                  <p className="mimo-learn-example">{currentStep.example}</p>
                ) : null}
              </div>
            ) : (
              <div className="mimo-question-card float-in">
                <span className="mimo-question-tag">
                  {currentStep.type === "fix" ? "Fix the mistake" : "Multiple choice"}
                </span>
                <p className="mimo-question">{currentStep.prompt}</p>
                {currentStep.choices?.map((option, index) => {
                  const isCorrect = index === currentStep.correctIndex;
                  const isSelected = currentProgress?.selected_index === index;
                  const stateClass = isCorrect ? "correct" : isSelected ? "incorrect" : "";
                  return (
                    <button
                      key={`${currentStep.id}-${index}`}
                      className={`mimo-choice ${stateClass}`}
                      type="button"
                      disabled
                    >
                      {option}
                    </button>
                  );
                })}
                <div className="mimo-feedback">
                  <strong>
                    {currentProgress?.is_correct ? "Correct." : "Not quite."}
                  </strong>{" "}
                  {currentStep.explanation}
                </div>
              </div>
            )}

            <div className="feedback-actions">
              {stepIndex > 1 ? (
                <Link
                  className="mimo-button-outline"
                  href={`/dashboard?view=review&day=${requestedDay}&step=${stepIndex - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {stepIndex < totalSteps ? (
                <Link
                  className="mimo-button"
                  href={`/dashboard?view=review&day=${requestedDay}&step=${stepIndex + 1}`}
                >
                  Next
                </Link>
              ) : (
                <Link className="mimo-button" href="/dashboard">
                  Back to home
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "skill") {
    const skillChecks = await getSkillChecksForUser(user.id);
    const skillCheck = checkParam
      ? getSkillCheckById(checkParam)
      : skillChecks[0] ?? null;
    if (!skillCheck) {
      redirect("/dashboard");
    }

    const resultState =
      resultParam === "correct" || resultParam === "wrong" ? resultParam : "";

    return (
      <div className="mimo-shell dashboard-shell">
        <div className="dashboard-wrap">
          <Link className="dashboard-back" href="/dashboard">
            Back to home
          </Link>
          <div className="lesson-card float-in">
            <span className="lesson-pill">Skill Check</span>
            <h1 className="lesson-title">{skillCheck.title}</h1>
            <p className="lesson-body">{skillCheck.prompt}</p>
            {resultState ? (
              <div className={`feedback-card ${resultState}`}>
                <div className="feedback-title">
                  {resultState === "correct" ? "Correct" : "Not quite"}
                </div>
                <p className="feedback-body">{skillCheck.explanation}</p>
                <div className="feedback-actions">
                  <Link className="mimo-button" href="/dashboard">
                    Continue
                  </Link>
                  {resultState === "wrong" ? (
                    <Link
                      className="mimo-button-outline"
                      href={`/dashboard?view=skill&check=${skillCheck.id}`}
                    >
                      Try again
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <form action={submitSkillCheck} className="skill-form">
                <input type="hidden" name="checkId" value={skillCheck.id} />
                <div className="choice-grid">
                  {skillCheck.choices.map((choice, index) => (
                    <label className="choice-card" key={choice}>
                      <input type="radio" name="choiceIndex" value={index} required />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
                <button className="mimo-button" type="submit">
                  Check
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "example") {
    const example = exampleCards.find((card) => card.id === exampleParam);
    if (!example) {
      redirect("/dashboard");
    }

    return (
      <div className="mimo-shell dashboard-shell">
        <div className="dashboard-wrap">
          <Link className="dashboard-back" href="/dashboard">
            Back to home
          </Link>
          <div className="lesson-card float-in">
            <span className="lesson-pill">Example</span>
            <h1 className="lesson-title">{example.title}</h1>
            <p className="lesson-body">{example.blurb}</p>
            <div className="example-list">
              {example.points.map((point) => (
                <div className="example-item" key={point}>
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weekStart = Math.floor((dashboard.dayNumber - 1) / 7) * 7 + 1;
  const weekDays = Array.from({ length: 7 }, (_, index) => weekStart + index);

  const skillChecks = await getSkillChecksForUser(user.id);

  return (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <header className="dashboard-header">
          <div className="dashboard-title">
            <div>
              <span className="dashboard-kicker">Home base</span>
              <h1 className="dashboard-heading">Welcome back</h1>
            </div>
            <form action={logout}>
              <button className="ghost-button" type="submit">
                Sign out
              </button>
            </form>
          </div>
          <div className="stats-card">
            <div className="stats-row">
              <div className="stat-block">
                <span className="stat-label">XP</span>
                <div className="stat-value">
                  <strong>{dashboard.xp}</strong>
                </div>
              </div>
              <div className="stat-block">
                <span className="stat-label">Streak</span>
                <div className="stat-value">
                  <span className="stat-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 2c2.6 3 3.4 5.8 2.4 8.2-0.5 1.2-1.4 2.3-2.4 3.1-1-0.8-1.9-1.9-2.4-3.1C8.6 7.8 9.4 5 12 2z"
                        fill="currentColor"
                      />
                      <path
                        d="M7.5 12.5c-2.3 2.2-2.6 5.5-0.7 7.4 1.8 1.8 4.8 1.6 6.6-0.2 1.9-1.9 2-4.9 0.2-6.8l-1.6 1.7c0.8 0.9 0.8 2.2-0.1 3-0.9 0.9-2.3 1-3.1 0.2-0.9-0.9-0.8-2.4 0.3-3.5L7.5 12.5z"
                        fill="currentColor"
                        opacity="0.6"
                      />
                    </svg>
                  </span>
                  <strong>{dashboard.streak}</strong>
                </div>
              </div>
              <div className="stat-block">
                <span className="stat-label">Rank</span>
                <div className="stat-value">
                  <strong>{rank.label}</strong>
                </div>
              </div>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${progressPercent}%` }}>
                <span className="xp-fill-core" />
              </div>
            </div>
            <div className="xp-meta">
              {progressPercent}% to {rank.max} XP
            </div>
          </div>
        </header>

        <section className="primary-card float-in">
          <div>
            <span className="section-label">Today</span>
            <h2 className="section-title">Day {dashboard.dayNumber}</h2>
            <p className="section-body">
              {dashboard.completedAll
                ? "You finished all 84 days."
                : dashboard.todayCompleted
                ? "Today is complete. Review or come back tomorrow."
                : "One focused step keeps your momentum strong."}
            </p>
          </div>
          <Link className="mimo-button primary-cta" href="/dashboard?view=lesson">
            Continue Learning
          </Link>
        </section>

        <section className="section-card float-in">
          <div className="section-head">
            <div>
              <span className="section-label">Weekly path</span>
              <h2 className="section-title">Week {Math.ceil(dashboard.dayNumber / 7)}</h2>
            </div>
            <span className="section-chip">
              Days {weekStart}-{weekStart + 6}
            </span>
          </div>
          <div className="week-grid">
            {weekDays.map((day) => {
              const isCompleted = completedSet.has(day);
              const isCurrent = day === dashboard.dayNumber;
              const isLocked = !isCurrent && !isCompleted;
              const tileClass = `day-tile${isCompleted ? " completed" : ""}${
                isCurrent ? " current" : ""
              }${isLocked ? " locked" : ""}`;
              if (isCompleted) {
                return (
                  <Link
                    className={tileClass}
                    href={`/dashboard?view=review&day=${day}`}
                    key={day}
                  >
                    <span className="day-number">Day {day}</span>
                    <span className="day-state">
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          d="M7.7 13.7L3.6 9.6l1.5-1.5 2.6 2.6 7.1-7.1 1.5 1.5-8.6 8.6z"
                          fill="currentColor"
                        />
                      </svg>
                      Done
                    </span>
                  </Link>
                );
              }

              return (
                <div className={tileClass} key={day}>
                  <span className="day-number">Day {day}</span>
                  <span className="day-state">{isCurrent ? "Today" : "Locked"}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="section-card float-in">
          <div className="section-head">
            <div>
              <span className="section-label">Mini challenges</span>
              <h2 className="section-title">Skill Checks</h2>
            </div>
            <span className="section-chip">+5 XP</span>
          </div>
          <div className="card-grid">
            {skillChecks.map((check) => (
              <Link
                className="skill-card"
                href={`/dashboard?view=skill&check=${check.id}`}
                key={check.id}
              >
                <span className="skill-title">{check.title}</span>
                <p className="skill-body">{check.prompt}</p>
                <div className="skill-meta">
                  <span className="xp-pill">+{check.xpReward} XP</span>
                  <span className={`status-pill ${check.completed ? "done" : "todo"}`}>
                    {check.completed ? "Completed" : "Try now"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-card float-in">
          <div className="section-head">
            <div>
              <span className="section-label">Examples library</span>
              <h2 className="section-title">Ready-to-use patterns</h2>
            </div>
            <span className="section-chip">3 quick reads</span>
          </div>
          <div className="card-grid">
            {exampleCards.map((card) => (
              <Link
                className="example-card"
                href={`/dashboard?view=example&example=${card.id}`}
                key={card.id}
              >
                <span className="skill-title">{card.title}</span>
                <p className="skill-body">{card.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
