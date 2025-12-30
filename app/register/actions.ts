"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, createUser, getUserByEmail } from "@/lib/auth";

const sessionCookieOptions = (expiresAt: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expiresAt),
});

export const register = async (formData: FormData) => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/register?error=${encodeURIComponent("Email and password are required.")}`);
  }

  if (password.length < 6) {
    redirect(`/register?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    redirect(`/register?error=${encodeURIComponent("Email is already registered.")}`);
  }

  const user = await createUser(email, password);
  const session = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set("session", session.id, sessionCookieOptions(session.expiresAt));
  redirect("/dashboard");
};
