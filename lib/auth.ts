import "server-only";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./db";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
};

type SessionRow = {
  user_id: number;
  email: string;
  expires_at: string | Date;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getUserByEmail = async (email: string) => {
  const normalized = normalizeEmail(email);
  const db = await getDb();
  const result = await db`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${normalized}
    LIMIT 1
  `;
  return result.rows[0] as UserRow | undefined;
};

export const createUser = async (email: string, password: string) => {
  const normalized = normalizeEmail(email);
  const passwordHash = bcrypt.hashSync(password, 12);
  const db = await getDb();
  const result = await db`
    INSERT INTO users (email, password_hash)
    VALUES (${normalized}, ${passwordHash})
    RETURNING id, email
  `;
  return result.rows[0] as { id: number; email: string };
};

export const verifyUser = async (email: string, password: string) => {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return null;
  }

  return { id: user.id, email: user.email };
};

export const createSession = async (userId: number) => {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const db = await getDb();
  await db`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${id}, ${userId}, ${expiresAt})
  `;
  return { id, expiresAt: expiresAt.getTime() };
};

export const getSessionUser = async (sessionId: string) => {
  const db = await getDb();
  const result = await db`
    SELECT sessions.user_id as user_id,
           sessions.expires_at as expires_at,
           users.email as email
    FROM sessions
    INNER JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ${sessionId}
    LIMIT 1
  `;
  const row = result.rows[0] as SessionRow | undefined;
  if (!row) {
    return null;
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt < Date.now()) {
    await db`DELETE FROM sessions WHERE id = ${sessionId}`;
    return null;
  }

  return { id: row.user_id, email: row.email };
};

export const deleteSession = async (sessionId: string) => {
  const db = await getDb();
  await db`DELETE FROM sessions WHERE id = ${sessionId}`;
};
