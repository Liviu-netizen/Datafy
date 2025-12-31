import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPatternById, isPatternCompleted } from "@/lib/patterns";
import { getDashboardData } from "@/lib/progress";
import { VisualCard } from "@/app/components/visual";
import { markFinished } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatternPageProps = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function PatternPage({ params, searchParams }: PatternPageProps) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const debugParam = typeof searchParams?.debug === "string" ? searchParams.debug : "";
  const debugMode = debugParam === "1";

  const pattern = await getPatternById(params.id);
  if (!pattern) {
    if (debugMode) {
      const debugData = {
        build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
        error: "missing_pattern",
        id: params.id,
      };
      return (
        <div className="mimo-shell dashboard-shell">
          <div className="dashboard-wrap">
            <div className="mimo-card">
              <h1 className="mimo-title">Pattern debug</h1>
              <pre className="debug-panel">{JSON.stringify(debugData, null, 2)}</pre>
              <div className="lesson-actions">
                <Link className="mimo-button" href="/dashboard">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }
    redirect("/dashboard?error=Pattern%20missing%20for%20today.");
  }

  const dashboard = await getDashboardData(user.id);
  const locked = pattern.dayNumber > dashboard.dayNumber;
  if (debugMode && locked) {
    const debugData = {
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      id: pattern.id,
      patternDay: pattern.dayNumber,
      dashboardDay: dashboard.dayNumber,
      locked,
    };
    return (
      <div className="mimo-shell dashboard-shell">
        <div className="dashboard-wrap">
          <div className="mimo-card">
            <h1 className="mimo-title">Pattern debug</h1>
            <pre className="debug-panel">{JSON.stringify(debugData, null, 2)}</pre>
            <div className="lesson-actions">
              <Link className="mimo-button" href="/dashboard">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (locked) {
    redirect("/dashboard?error=Pattern%20locked%20for%20a%20future%20day.");
  }

  const completed =
    pattern.dayNumber < dashboard.dayNumber ||
    (await isPatternCompleted(user.id, pattern.id));
  const doneParam = typeof searchParams?.done === "string" ? searchParams.done : "";

  return (
    <div className="mimo-shell dashboard-shell">
      <div className="dashboard-wrap">
        <Link className="dashboard-back" href="/dashboard">
          Back to home
        </Link>
        <div className="lesson-card float-in">
          <span className="lesson-pill">Quick read</span>
          <h1 className="lesson-title">{pattern.title}</h1>
          <p className="lesson-body">{pattern.description}</p>

          {pattern.content.intro ? <p className="lesson-note">{pattern.content.intro}</p> : null}

          <div className="pattern-sections">
            {pattern.content.sections.map((section, index) => {
              if (section.type === "visual") {
                return (
                  <VisualCard
                    key={`${pattern.id}-visual-${index}`}
                    visual={section.visual}
                    title={section.title ?? "Example"}
                  />
                );
              }
              return (
                <div className="pattern-text" key={`${pattern.id}-text-${index}`}>
                  {section.title ? <h3 className="pattern-title">{section.title}</h3> : null}
                  <p className="pattern-body">{section.body}</p>
                  {section.bullets?.length ? (
                    <ul className="pattern-list">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          {pattern.content.takeaway ? (
            <div className="lesson-note">{pattern.content.takeaway}</div>
          ) : null}

          {completed || doneParam ? (
            <div className="feedback-card correct">
              <div className="feedback-title">Completed</div>
              <p className="feedback-body">This pattern is marked as finished.</p>
              <div className="feedback-actions">
                <Link className="mimo-button" href="/dashboard">
                  Back to home
                </Link>
              </div>
            </div>
          ) : (
            <form action={markFinished} className="lesson-actions">
              <input type="hidden" name="patternId" value={pattern.id} />
              <button className="mimo-button" type="submit">
                Mark as finished
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
