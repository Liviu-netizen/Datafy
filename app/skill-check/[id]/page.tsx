import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSkillCheckById, getSkillCheckCompletion } from "@/lib/skill-checks";
import { getDashboardData } from "@/lib/progress";
import { submitSkillCheck } from "./actions";

export const runtime = "nodejs";

type SkillCheckPageProps = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function SkillCheckPage({ params, searchParams }: SkillCheckPageProps) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const skillCheck = await getSkillCheckById(params.id);
  if (!skillCheck) {
    redirect("/dashboard?error=Skill%20check%20missing%20for%20today.");
  }

  const dashboard = await getDashboardData(user.id);
  if (skillCheck.dayNumber > dashboard.dayNumber) {
    redirect("/dashboard?error=Skill%20check%20locked%20for%20a%20future%20day.");
  }

  const completed =
    skillCheck.dayNumber < dashboard.dayNumber ||
    (await getSkillCheckCompletion(user.id, skillCheck.id));
  const resultParam = typeof searchParams?.result === "string" ? searchParams.result : "";

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
          <div className="mimo-progress">
            <span>Question 1 of 1</span>
            <span>+{skillCheck.xpReward} XP</span>
          </div>

          {completed ? (
            <div className="feedback-card correct">
              <div className="feedback-title">Completed</div>
              <p className="feedback-body">{skillCheck.explanation}</p>
              <div className="feedback-actions">
                <Link className="mimo-button" href="/dashboard">
                  Back to home
                </Link>
              </div>
            </div>
          ) : resultParam === "correct" || resultParam === "wrong" ? (
            <div className={`feedback-card ${resultParam}`}>
              <div className="feedback-title">
                {resultParam === "correct" ? "Correct" : "Not quite"}
              </div>
              <p className="feedback-body">{skillCheck.explanation}</p>
              <div className="feedback-actions">
                <Link className="mimo-button" href="/dashboard">
                  Continue
                </Link>
                {resultParam === "wrong" ? (
                  <Link className="mimo-button-outline" href={`/skill-check/${skillCheck.id}`}>
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
                  <label className="choice-card" key={`${skillCheck.id}-${index}`}>
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
