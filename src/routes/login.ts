import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { compare } from "bcryptjs";
import {
	createSession,
	generateSessionToken,
	validateSessionToken,
} from "../lib/auth";

const router = Router();

const loginSchema = v.object({
	username: v.string(),
	password: v.string(),
});

const authSchema = v.object({
	access_token: v.string(),
});

router.post("/login", async (req, res) => {
	const data = v.safeParse(loginSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const user = await db
		.selectFrom("User")
		.selectAll()
		.where("username", "=", data.output.username)
		.executeTakeFirst();

	if (!user) {
		return res.status(401).json({ error: "Username or password incorrect" });
	}

	if ((await compare(data.output.password, user.password)) == false) {
		return res.status(401).json({ error: "Username or password incorrect" });
	}

	const session_token = generateSessionToken();
	const session = await createSession(session_token, user.id);

	if (user.verified_at == null) {
		const userSession: UserSession = {
			access_token: session_token,
			expires_at: session.expiresAt.getTime() / 1000,
			user: null,
		};

		return res.status(403).json({
			error: "Пользователь не подтвержден",
			...userSession,
		});
	}

	const userSession: UserSession = {
		access_token: session_token,
		expires_at: session.expiresAt.getTime() / 1000,
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			verified: user.verified_at != null,
		},
	};

	res.status(200).json({ success: true, ...userSession });
});

router.post("/authenticate", async (req, res) => {
	const data = v.safeParse(authSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const { session, user } = await validateSessionToken(
		data.output.access_token,
	);

	if (!session || !user) {
		return res
			.status(401)
			.json({ error: "Сессия устарела или недействительна" });
	}

	if (user.verified_at == null) {
		let userSession: UserSession = {
			access_token: data.output.access_token,
			expires_at: session.expiresAt.getTime() / 1000,
			user: null,
		};

		return res.status(403).json({
			error: "Пользователь не подтвержден",
			...userSession,
		});
	}

	const userSession: UserSession = {
		access_token: data.output.access_token,
		expires_at: session.expiresAt.getTime() / 1000,
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			verified: user.verified_at != null,
		},
	};

	res.status(200).json({ success: true, ...userSession });
});

export default router;
