"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteSession, getSessionUser } from "@/lib/auth";
import {
  getLessonForDay,
  getStepById,
  getStepProgressForDay,
  recordAnswer,
  recordLearnStep,
} from "@/lib/lessons";
import { completeToday, getDashboardData } from "@/lib/progress";
import { recordSkillCheckAnswer } from "@/lib/skill-checks";

export const logout = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (sessionId) {
    await deleteSession(sessionId);
  }

  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  redirect("/login");
};

export const completeDay = async () => {
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
    redirect("/dashboard");
  }

  const progress = await getStepProgressForDay(user.id, lesson.day);
  if (progress.size < lesson.steps.length) {
    redirect("/dashboard?error=Finish%20all%20steps%20first.");
  }

  await completeToday(user.id);
  redirect("/dashboard");
};

export const submitAnswer = async (formData: FormData) => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const stepId = Number(formData.get("stepId"));
  const answerIndex = Number(formData.get("answerIndex"));
  if (!Number.isFinite(stepId) || !Number.isFinite(answerIndex)) {
    redirect("/dashboard");
  }

  const step = await getStepById(stepId);
  if (!step || step.type === "learn") {
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  if (step.lessonDay !== dashboard.dayNumber) {
    redirect("/dashboard");
  }

  await recordAnswer(user.id, stepId, answerIndex);
  redirect(`/dashboard?view=lesson&show=${stepId}`);
};

export const continueLesson = async (formData: FormData) => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }

  const stepId = Number(formData.get("stepId"));
  if (!Number.isFinite(stepId)) {
    redirect("/dashboard");
  }

  const step = await getStepById(stepId);
  if (!step) {
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  if (step.lessonDay !== dashboard.dayNumber) {
    redirect("/dashboard");
  }

  if (step.type === "learn") {
    await recordLearnStep(user.id, stepId);
  }

  redirect("/dashboard?view=lesson");
};

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

  const result = await recordSkillCheckAnswer(user.id, checkId, choiceIndex);
  if (!result.ok) {
    redirect("/dashboard");
  }

  const outcome = result.correct ? "correct" : "wrong";
  redirect(
    `/dashboard?view=skill&check=${encodeURIComponent(checkId)}&result=${outcome}`
  );
};
