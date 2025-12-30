"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSkillCheckById, recordSkillCheckAnswer } from "@/lib/skill-checks";
import { getDashboardData } from "@/lib/progress";

export const submitSkillCheck = async (formData: FormData) => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const checkId = String(formData.get("checkId") ?? "");
  const choiceValue = formData.get("choiceIndex");
  const choiceIndex = Number(choiceValue);
  if (!checkId || Number.isNaN(choiceIndex)) {
    redirect("/dashboard");
  }

  const skillCheck = await getSkillCheckById(checkId);
  if (!skillCheck) {
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  if (skillCheck.dayNumber > dashboard.dayNumber) {
    redirect("/dashboard");
  }

  const result = await recordSkillCheckAnswer(user.id, checkId, choiceIndex);
  if (!result.ok) {
    redirect("/dashboard");
  }

  const outcome = result.correct ? "correct" : "wrong";
  redirect(`/skill-check/${encodeURIComponent(checkId)}?result=${outcome}`);
};
