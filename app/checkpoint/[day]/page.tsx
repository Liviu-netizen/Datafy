import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getCheckpointProgress,
  getCheckpointTestForDay,
  getLatestCheckpointAttempt,
  hasPassedCheckpoint,
} from "@/lib/checkpoints";
import { getDashboardData, isLessonReadyForCheckpoint } from "@/lib/progress";
import {
  continueCheckpoint,
  finalizeCheckpoint,
  resetCheckpoint,
  submitCheckpointAnswer,
} from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckpointPageProps = {
  params: { day: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function CheckpointPage({ params, searchParams }: CheckpointPageProps) {
  const debugParam = typeof searchParams?.debug === "string" ? searchParams.debug : "";
  const debugMode = debugParam === "1";
  const debugBuild = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const renderDebug = (data: Record<string, unknown>) => (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <div className="mimo-card">
          <h1 className="mimo-title">Checkpoint debug</h1>
          <pre className="debug-panel">{JSON.stringify(data, null, 2)}</pre>
          <div className="lesson-actions">
            <Link className="mimo-button" href="/dashboard">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    if (debugMode) {
      return renderDebug({ build: debugBuild, error: "no_session" });
    }
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    if (debugMode) {
      return renderDebug({ build: debugBuild, error: "session_user_missing" });
    }
    redirect("/login");
  }

  const day = Number(params.day);
  if (!Number.isFinite(day)) {
    if (debugMode) {
      return renderDebug({ build: debugBuild, error: "invalid_day", day: params.day });
    }
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  const dayLocked = day > dashboard.dayNumber;

  const lessonComplete = await isLessonReadyForCheckpoint(user.id, day);

  const test = await getCheckpointTestForDay(day);
  const missingTest = !test;

  const debugData = {
    build: debugBuild,
    day,
    dashboardDay: dashboard.dayNumber,
    dayLocked,
    lessonComplete,
    testFound: Boolean(test),
  };
  if (debugMode && (dayLocked || !lessonComplete || missingTest)) {
    return renderDebug(debugData);
  }

  if (dayLocked) {
    redirect("/dashboard?error=Checkpoint%20locked%20until%20you%20reach%20this%20day.");
  }

  if (!lessonComplete) {
    redirect("/dashboard?view=lesson&error=Finish%20the%20lesson%20first.");
  }

  if (!test) {
    redirect("/dashboard?error=Checkpoint%20missing%20for%20this%20day.");
  }

  const progress = await getCheckpointProgress(user.id, test.id);
  const showParam = typeof searchParams?.show === "string" ? searchParams.show : "";
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : "";
  const resultParam = typeof searchParams?.result === "string" ? searchParams.result : "";
  const showQuestion = showParam
    ? test.questions.find((question) => question.id === showParam && progress.has(question.id))
    : null;
  const nextQuestion = test.questions.find((question) => !progress.has(question.id)) ?? null;
  const currentQuestion = showQuestion ?? nextQuestion;
  const currentIndex = currentQuestion
    ? test.questions.findIndex((question) => question.id === currentQuestion.id) + 1
    : test.questions.length;
  const currentProgress = currentQuestion ? progress.get(currentQuestion.id) : null;
  const allAnswered = progress.size >= test.questions.length;
  const latestAttempt = await getLatestCheckpointAttempt(user.id, test.id);
  const passedAlready = await hasPassedCheckpoint(user.id, test.id);

  return (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <Link className="dashboard-back" href="/dashboard">
          Back to home
        </Link>
        <div className="mimo-card float-in">
          <span className="mimo-pill">Checkpoint</span>
          <h1 className="mimo-title">{test.title}</h1>
          <p className="mimo-subtitle">Score {test.passPercent}% or higher to unlock the next day.</p>

          <div className="mimo-progress">
            <span>
              Question {currentIndex} of {test.questions.length}
            </span>
            <span>{test.xpReward} XP on pass</span>
          </div>

          {debugMode ? (
            <pre className="debug-panel">{JSON.stringify(debugData, null, 2)}</pre>
          ) : null}

          {errorParam ? <div className="mimo-alert">{errorParam}</div> : null}

          {resultParam === "done" && latestAttempt ? (
            <div className={`feedback-card ${latestAttempt.passed ? "correct" : "wrong"}`}>
              <div className="feedback-title">
                {latestAttempt.passed ? "Passed" : "Not passed"}
              </div>
              <p className="feedback-body">
                You scored {latestAttempt.score}% ({latestAttempt.score >= test.passPercent ? "meets" : "below"} the pass line).
              </p>
              <div className="feedback-actions">
                <Link className="mimo-button" href="/dashboard">
                  Back to home
                </Link>
                {!latestAttempt.passed ? (
                  <form action={resetCheckpoint}>
                    <input type="hidden" name="day" value={day} />
                    <button className="mimo-button-outline" type="submit">
                      Retry checkpoint
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : allAnswered ? (
            <div className="feedback-card">
              <div className="feedback-title">
                {passedAlready ? "Checkpoint passed" : "Ready for results"}
              </div>
              <p className="feedback-body">
                {passedAlready
                  ? "You already passed this checkpoint."
                  : "Review your answers and see your score."}
              </p>
              <div className="feedback-actions">
                <form action={finalizeCheckpoint}>
                  <input type="hidden" name="day" value={day} />
                  <button className="mimo-button" type="submit">
                    See results
                  </button>
                </form>
                {passedAlready ? (
                  <Link className="mimo-button-outline" href="/dashboard">
                    Back to home
                  </Link>
                ) : null}
              </div>
            </div>
          ) : currentQuestion ? (
            currentQuestion.type === "fix" || currentQuestion.type === "mcq" ? (
              <div className="mimo-question-card float-in">
                <span className="mimo-question-tag">
                  {currentQuestion.type === "fix" ? "Fix the mistake" : "Multiple choice"}
                </span>
                <p className="mimo-question">{currentQuestion.prompt}</p>

                {currentProgress ? (
                  <div className="grid gap-3">
                    {currentQuestion.choices.map((option, index) => {
                      const isCorrect = index === currentQuestion.answer.correctIndex;
                      const isSelected = currentProgress.selectedIndex === index;
                      const stateClass = isCorrect ? "correct" : isSelected ? "incorrect" : "";
                      return (
                        <button
                          key={`${currentQuestion.id}-${index}`}
                          className={`mimo-choice ${stateClass}`}
                          type="button"
                          disabled
                        >
                          {option}
                        </button>
                      );
                    })}
                    <div className="mimo-feedback">
                      <strong>{currentProgress.isCorrect ? "Correct." : "Not quite."}</strong>{" "}
                      {currentQuestion.explanation}
                    </div>
                    <form action={continueCheckpoint}>
                      <input type="hidden" name="day" value={day} />
                      <button className="mimo-button" type="submit">
                        Continue
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={submitCheckpointAnswer} className="grid gap-3">
                    <input type="hidden" name="day" value={day} />
                    <input type="hidden" name="questionId" value={currentQuestion.id} />
                    {currentQuestion.choices.map((option, index) => (
                      <label key={`${currentQuestion.id}-${index}`} className="mimo-choice-option">
                        <input type="radio" name="choiceIndex" value={index} required />
                        <span>{option}</span>
                      </label>
                    ))}
                    <button className="mimo-button soft-glow" type="submit">
                      Check
                    </button>
                  </form>
                )}
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </div>
  );
}
