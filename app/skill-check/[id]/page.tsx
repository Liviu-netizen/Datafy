import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSkillCheckById, getSkillCheckCompletion } from "@/lib/skill-checks";
import { getDashboardData } from "@/lib/progress";
import { submitSkillCheck } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SkillCheckPageProps = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function SkillCheckPage({ params, searchParams }: SkillCheckPageProps) {
  const debugParam = typeof searchParams?.debug === "string" ? searchParams.debug : "";
  const debugMode = debugParam === "1";
  const debugBuild = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const renderDebug = (data: Record<string, unknown>) => (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <div className="mimo-card">
          <h1 className="mimo-title">Skill check debug</h1>
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

  const skillCheck = await getSkillCheckById(params.id);
  if (!skillCheck) {
    if (debugMode) {
      return renderDebug({
        build: debugBuild,
        error: "missing_skill_check",
        id: params.id,
      });
    }
    redirect("/dashboard?error=Skill%20check%20missing%20for%20today.");
  }

  const dashboard = await getDashboardData(user.id);
  const locked = skillCheck.dayNumber > dashboard.dayNumber;
  if (debugMode && locked) {
    return renderDebug({
      build: debugBuild,
      id: skillCheck.id,
      checkDay: skillCheck.dayNumber,
      dashboardDay: dashboard.dayNumber,
      locked,
    });
  }
  if (locked) {
    redirect("/dashboard?error=Skill%20check%20locked%20for%20a%20future%20day.");
  }

  const completed =
    skillCheck.dayNumber < dashboard.dayNumber ||
    (await getSkillCheckCompletion(user.id, skillCheck.id));
  const resultParam = typeof searchParams?.result === "string" ? searchParams.result : "";

  const debugData = {
    build: debugBuild,
    id: skillCheck.id,
    checkDay: skillCheck.dayNumber,
    dashboardDay: dashboard.dayNumber,
    locked,
  };

  return (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <Link className="dashboard-back" href="/dashboard">
          Back to home
        </Link>
        <div className="lesson-card float-in">
          {debugMode ? (
            <pre className="debug-panel">{JSON.stringify(debugData, null, 2)}</pre>
          ) : null}
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
