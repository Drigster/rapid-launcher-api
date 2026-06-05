import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { hash } from "bcryptjs";
import { sendEmail } from "../lib/mailer";
import {
	createSession,
	generateOtpCode,
	generateSessionToken,
	hashOtp,
	validateSessionToken,
} from "../lib/auth";

const router = Router();

const registerSchema = v.object({
	username: v.pipe(
		v.string(),
		v.minLength(3, "Минимальная длина имени пользователя - 3 символа"),
		v.maxLength(20, "Максимальная длина имени пользователя - 20 символов"),
	),
	email: v.pipe(v.string(), v.email("Неверный формат электронной почты")),
	password: v.pipe(
		v.string(),
		v.minLength(8, "Минимальная длина пароля - 8 символов"),
	),
	subscribe: v.boolean(),
});

const verifySchema = v.object({
	access_token: v.string(),
	code: v.string(),
});

const resendVerifySchema = v.object({
	access_token: v.string(),
});

router.post("/register", async (req, res) => {
	const data = v.safeParse(registerSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	let existingUser = await db
		.selectFrom("User")
		.where("username", "=", data.output.username)
		.executeTakeFirst();

	if (existingUser) {
		// TODO: Send email reminder
		console.log("User already exists, sending email reminder");
		return res.status(200).json({ success: true });
	}

	let existingEmail = await db
		.selectFrom("User")
		.where("email", "=", data.output.email)
		.executeTakeFirst();

	if (existingEmail) {
		// TODO: Send email reminder
		console.log("User already exists, sending email reminder 2");
		return res.status(200).json({ success: true });
	}

	const verify_code = generateOtpCode();
	const verify_code_hash = hashOtp(verify_code);

	const user_id: `u_${string}` = `u_${nanoid()}`;
	await db
		.insertInto("User")
		.values({
			id: user_id,
			username: data.output.username,
			email: data.output.email,
			password: await hash(data.output.password, 12),
			newsletter: data.output.subscribe,
			email_verify_hash: verify_code_hash,
			email_verify_expires_at: new Date(Date.now() + 1000 * 60 * 5),
		})
		.execute();

	await sendEmail(
		"Код для подтверждения регистрации: " +
			verify_code +
			"\nВремя действия кода: 5 минут.",
		data.output.email,
	);

	const session_token = generateSessionToken();
	const session = await createSession(session_token, user_id);

	const userSession: UserSession = {
		access_token: session_token,
		expires_at: session.expiresAt.getTime() / 1000,
		user: null,
	};

	return res.status(200).json({
		success: true,
		...userSession,
	});
});

router.post("/register/verify", async (req, res) => {
	const data = v.safeParse(verifySchema, req.body);

	if (!data.success) {
		console.log(data.issues);
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

	if (
		!user ||
		!user.email_verify_hash ||
		!user.email_verify_expires_at ||
		user.email_verify_expires_at < new Date()
	) {
		return res.status(400).json({
			error: "Запрос на подтверждение почты не существует или устарел",
		});
	}

	await db
		.updateTable("User")
		.where("id", "=", user.id)
		.set({
			email_verify_hash: null,
			email_verify_expires_at: null,
			verified_at: new Date(),
		})
		.execute();

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

	return res.status(200).json({ success: true, ...userSession });
});

router.post("/register/resendVerify", async (req, res) => {
	const data = v.safeParse(resendVerifySchema, req.body);

	if (!data.success) {
		console.log(data.issues);
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

	const verify_code = generateOtpCode();
	const verify_code_hash = hashOtp(verify_code);

	await db
		.updateTable("User")
		.set({
			email_verify_hash: verify_code_hash,
			email_verify_expires_at: new Date(Date.now() + 1000 * 60 * 5),
		})
		.where("id", "=", user.id)
		.execute();

	await sendEmail(
		"Код для подтверждения регистрации: " +
			verify_code +
			"\nВремя действия кода: 5 минут.",
		user.email,
	);

	return res.status(200).json({ success: true });
});

export default router;
