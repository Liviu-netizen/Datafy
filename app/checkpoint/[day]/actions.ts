"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  finalizeCheckpointAttempt,
  getCheckpointProgress,
  getCheckpointTestForDay,
  recordCheckpointAnswer,
  resetCheckpointAnswers,
} from "@/lib/checkpoints";
import { getCompletedDays, getDashboardData } from "@/lib/progress";

const requireUser = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/login");
  }
  return user;
};

const ensureCheckpointAccess = async (userId: number, day: number) => {
  const dashboard = await getDashboardData(userId);
  if (!Number.isFinite(day) || day > dashboard.dayNumber) {
    redirect("/dashboard");
  }
  const completedDays = await getCompletedDays(userId);
  if (!completedDays.includes(day)) {
    redirect("/dashboard?error=Finish%20the%20lesson%20first.");
  }
};

export const submitCheckpointAnswer = async (formData: FormData) => {
  const user = await requireUser();
  const day = Number(formData.get("day"));
  const questionId = String(formData.get("questionId") ?? "");
  const choiceIndex = Number(formData.get("choiceIndex"));

  if (!questionId || Number.isNaN(choiceIndex)) {
    redirect("/dashboard");
  }

  await ensureCheckpointAccess(user.id, day);
  const test = await getCheckpointTestForDay(day);
  if (!test) {
    redirect("/dashboard");
  }

  const question = test.questions.find((item) => item.id === questionId);
  if (!question) {
    redirect(`/checkpoint/${day}`);
  }

  await recordCheckpointAnswer(user.id, question, choiceIndex);
  redirect(`/checkpoint/${day}?show=${encodeURIComponent(question.id)}`);
};

export const continueCheckpoint = async (formData: FormData) => {
  const day = Number(formData.get("day"));
  if (!Number.isFinite(day)) {
    redirect("/dashboard");
  }
  redirect(`/checkpoint/${day}`);
};

export const finalizeCheckpoint = async (formData: FormData) => {
  const user = await requireUser();
  const day = Number(formData.get("day"));
  if (!Number.isFinite(day)) {
    redirect("/dashboard");
  }

  await ensureCheckpointAccess(user.id, day);
  const test = await getCheckpointTestForDay(day);
  if (!test) {
    redirect("/dashboard");
  }

  const progress = await getCheckpointProgress(user.id, test.id);
  if (progress.size < test.questions.length) {
    redirect(`/checkpoint/${day}?error=Finish%20all%20questions%20first.`);
  }

  await finalizeCheckpointAttempt(user.id, test);
  redirect(`/checkpoint/${day}?result=done`);
};

export const resetCheckpoint = async (formData: FormData) => {
  const user = await requireUser();
  const day = Number(formData.get("day"));
  if (!Number.isFinite(day)) {
    redirect("/dashboard");
  }

  const test = await getCheckpointTestForDay(day);
  if (!test) {
    redirect("/dashboard");
  }
  await resetCheckpointAnswers(user.id, test.id);
  redirect(`/checkpoint/${day}`);
};
