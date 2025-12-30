"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteSession, getSessionUser } from "@/lib/auth";
import { completeToday } from "@/lib/progress";

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

  await completeToday(user.id);
  redirect("/dashboard");
};
