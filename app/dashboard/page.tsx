import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLessonForDay, getStepProgressForDay } from "@/lib/lessons";
import { getDashboardData } from "@/lib/progress";
import { completeDay, continueLesson, logout, submitAnswer } from "./actions";

export const runtime = "nodejs";

type DashboardPageProps = {
  searchParams?:
    | Promise<{ show?: string | string[]; error?: string | string[] }>
    | { show?: string | string[]; error?: string | string[] };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await Promise.resolve(searchParams);
  const showValue = Array.isArray(params?.show) ? params?.show[0] : params?.show;
  const errorValue = Array.isArray(params?.error) ? params?.error[0] : params?.error;
  const showId = showValue && Number.isFinite(Number(showValue)) ? Number(showValue) : null;

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
  const lesson = await getLessonForDay(dashboard.dayNumber);
  if (!lesson) {
    redirect("/login");
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
    <div className="mimo-shell">
      <div className="mimo-card float-in">
        <span className="mimo-pill">
          Day {dashboard.dayNumber} of {dashboard.totalDays}
        </span>
        <h1 className="mimo-title">{lesson.title}</h1>
        <p className="mimo-subtitle">{lesson.microGoal}</p>

        <div className="mimo-progress">
          <span>Step {currentIndex} of {totalSteps}</span>
          <span>{dashboard.xp} XP • {dashboard.streak} streak</span>
        </div>

        {errorValue ? <div className="mimo-alert">{errorValue}</div> : null}

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

        <div className="mimo-note">Signed in as {user.email}.</div>

        <form action={logout} className="mt-4">
          <button className="mimo-button-outline" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

