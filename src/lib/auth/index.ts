import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import type { Selectable } from "kysely";
import { db } from "../../index";
import type { DB } from "../db/schema";

const ONE_DAY = 1000 * 60 * 60 * 24;

const random: RandomReader = {
  read(bytes: Uint8Array): void {
    crypto.getRandomValues(bytes);
  },
};

export function generateId(length = 15): string {
  return generateRandomString(
    random,
    "abcdefghijklmnopqrstuvwxyz0123456789",
    length,
  );
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: `u_${string}`,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + ONE_DAY * 7),
  };
  await db
    .insertInto("Session")
    .values({
      id: session.id,
      user_id: session.userId,
      expires_at: Math.floor(session.expiresAt.getTime() / 1000),
    })
    .execute();
  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const row = await db
    .selectFrom("Session as s")
    .innerJoin("User as u", "u.id", "s.user_id")
    .select([
      "s.id",
      "s.user_id",
      "s.expires_at",
      "u.username",
      "u.email",
      "u.password",
      "u.server_id",
    ])
    .where("s.id", "=", sessionId)
    .executeTakeFirst();
  if (!row) {
    return { session: null, user: null };
  }
  const session: Session = {
    id: row.id,
    userId: row.user_id,
    expiresAt: new Date(row.expires_at * 1000),
  };
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.deleteFrom("Session").where("id", "=", session.id).execute();
    return { session: null, user: null };
  }
  const user: User = {
    id: row.user_id,
    username: row.username,
    email: row.email,
    password: row.password,
    server_id: row.server_id,
  };
  if (Date.now() >= session.expiresAt.getTime() - ONE_DAY * 15) {
    session.expiresAt = new Date(Date.now() + ONE_DAY * 30);
    await db
      .updateTable("Session")
      .set({
        expires_at: Math.floor(session.expiresAt.getTime() / 1000),
      })
      .where("id", "=", session.id)
      .execute();
  }
  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.deleteFrom("Session").where("id", "=", sessionId).execute();
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export interface Session {
  id: string;
  userId: `u_${string}`;
  expiresAt: Date;
}

export type User = Selectable<DB["User"]>;
