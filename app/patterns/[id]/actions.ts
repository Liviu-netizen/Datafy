"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPatternById, markPatternCompleted } from "@/lib/patterns";
import { getDashboardData } from "@/lib/progress";

export const markFinished = async (formData: FormData) => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const patternId = String(formData.get("patternId") ?? "");
  if (!patternId) {
    redirect("/dashboard");
  }

  const pattern = await getPatternById(patternId);
  if (!pattern) {
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  if (pattern.dayNumber > dashboard.dayNumber) {
    redirect("/dashboard");
  }

  await markPatternCompleted(user.id, patternId);
  redirect(`/patterns/${encodeURIComponent(patternId)}?done=1`);
};
