import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { compare } from "bcryptjs";
import { createSession, generateSessionToken } from "../lib/auth";

const router = Router();

const loginSchema = v.object({
	username: v.pipe(v.string()),
	password: v.pipe(v.string()),
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

	const userSession: UserSession = {
		access_token: session_token,
		expires_at: session.expiresAt.getTime() / 1000,
		user: {
			id: user.id,
			username: user.username,
		},
	};

	res.status(200).json({
		success: true,
		data: userSession,
	});
});

export default router;
