"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteSession, getSessionUser } from "@/lib/auth";
import { getLessonForDay, getQuestionById, getAnsweredCount, recordAnswer } from "@/lib/lessons";
import { completeToday, getDashboardData } from "@/lib/progress";

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

  const answeredCount = await getAnsweredCount(user.id, lesson.day);
  if (answeredCount < lesson.questions.length) {
    redirect("/dashboard?error=Finish%20all%20questions%20first.");
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

  const questionId = Number(formData.get("questionId"));
  const answerIndex = Number(formData.get("answerIndex"));
  if (!Number.isFinite(questionId) || !Number.isFinite(answerIndex)) {
    redirect("/dashboard");
  }

  const question = await getQuestionById(questionId);
  if (!question) {
    redirect("/dashboard");
  }

  const dashboard = await getDashboardData(user.id);
  if (question.lessonDay !== dashboard.dayNumber) {
    redirect("/dashboard");
  }

  await recordAnswer(user.id, questionId, answerIndex);
  redirect(`/dashboard?show=${questionId}`);
};

export const continueLesson = async () => {
  redirect("/dashboard");
};
