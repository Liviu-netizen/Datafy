"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, verifyUser } from "@/lib/auth";

const sessionCookieOptions = (expiresAt: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expiresAt),
});

export const login = async (formData: FormData) => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  const user = await verifyUser(email, password);
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  const session = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set("session", session.id, sessionCookieOptions(session.expiresAt));
  redirect("/dashboard");
};
