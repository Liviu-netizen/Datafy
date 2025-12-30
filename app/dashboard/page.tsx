import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAnswersForDay, getLessonForDay } from "@/lib/lessons";
import { getDashboardData } from "@/lib/progress";
import { completeDay, continueLesson, logout, submitAnswer } from "./actions";

export const runtime = "nodejs";

type DashboardPageProps = {
  searchParams?: Promise<{ show?: string | string[]; error?: string | string[] }> | {
    show?: string | string[];
    error?: string | string[];
  };
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

  const answers = await getAnswersForDay(user.id, lesson.day);
  const totalQuestions = lesson.questions.length;
  const answeredCount = answers.size;
  const isLessonAnswered = answeredCount >= totalQuestions;

  const showQuestion =
    showId && answers.has(showId)
      ? lesson.questions.find((question) => question.id === showId)
      : null;
  const currentQuestion =
    showQuestion ?? lesson.questions.find((question) => !answers.has(question.id)) ?? null;
  const currentIndex = currentQuestion
    ? lesson.questions.findIndex((question) => question.id === currentQuestion.id) + 1
    : totalQuestions;
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;

  return (
    <div className="mimo-shell">
      <div className="mimo-card float-in">
        <span className="mimo-pill">
          Day {dashboard.dayNumber} of {dashboard.totalDays}
        </span>
        <h1 className="mimo-title">{lesson.title}</h1>
        <p className="mimo-subtitle">{lesson.microGoal}</p>

        <div className="mimo-progress">
          <span>Question {currentIndex} of {totalQuestions}</span>
          <span>{dashboard.xp} XP • {dashboard.streak} streak</span>
        </div>

        {errorValue ? <div className="mimo-alert">{errorValue}</div> : null}

        {dashboard.completedAll ? (
          <div className="mimo-note">You finished all 84 days. Amazing work.</div>
        ) : dashboard.todayCompleted ? (
          <div className="mimo-note">Today is complete. Come back tomorrow.</div>
        ) : currentQuestion ? (
          <div className="mimo-question-card float-in">
            <span className="mimo-question-tag">
              {currentQuestion.type === "fix_the_mistake" ? "Fix the mistake" : "Multiple choice"}
            </span>
            <p className="mimo-question">{currentQuestion.prompt}</p>

            {currentAnswer ? (
              <div className="grid gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctIndex;
                  const isSelected = currentAnswer.selected_index === index;
                  const stateClass = isCorrect
                    ? "correct"
                    : isSelected
                      ? "incorrect"
                      : "";
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
                  {currentAnswer.is_correct
                    ? currentQuestion.feedbackCorrect
                    : currentQuestion.feedbackIncorrect}
                </div>
                <form action={continueLesson}>
                  <button className="mimo-button" type="submit">
                    Continue
                  </button>
                </form>
              </div>
            ) : (
              <form action={submitAnswer} className="grid gap-3">
                <input type="hidden" name="questionId" value={currentQuestion.id} />
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    className="mimo-choice"
                    name="answerIndex"
                    value={index}
                    type="submit"
                  >
                    {option}
                  </button>
                ))}
              </form>
            )}
          </div>
        ) : isLessonAnswered ? (
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

