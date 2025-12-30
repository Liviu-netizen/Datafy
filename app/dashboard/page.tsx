import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/progress";
import { completeDay, logout } from "./actions";

export const runtime = "nodejs";

export default async function DashboardPage() {
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

  return (
    <div className="mimo-shell">
      <div className="mimo-card float-in">
        <span className="mimo-pill">
          Day {dashboard.dayNumber} of {dashboard.totalDays}
        </span>
        <h1 className="mimo-title">Today&apos;s question</h1>
        <p className="mimo-question">
          Ready to complete day {dashboard.dayNumber} and keep your streak alive?
        </p>

        <div className="mimo-meta">
          <div className="mimo-stat">
            <strong>{dashboard.xp}</strong>
            <span>XP</span>
          </div>
          <div className="mimo-stat">
            <strong>{dashboard.streak}</strong>
            <span>Streak</span>
          </div>
          <div className="mimo-stat">
            <strong>{dashboard.today}</strong>
            <span>Today</span>
          </div>
        </div>

        {dashboard.completedAll ? (
          <div className="mimo-note">You finished all 84 days. Amazing work.</div>
        ) : dashboard.todayCompleted ? (
          <div className="mimo-note">Today is complete. Come back tomorrow.</div>
        ) : (
          <form action={completeDay} className="mt-6">
            <button className="mimo-button soft-glow" type="submit">
              Complete today
            </button>
          </form>
        )}

        <div className="mimo-note">
          Signed in as {user.email}.
        </div>

        <form action={logout} className="mt-4">
          <button className="mimo-button-outline" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
