import { Router } from "express";
import * as v from "valibot";
import { db } from "..";
import {
	generateOtpCode,
	hashOtp,
	invalidateUserSessions,
	validateSessionToken,
} from "../lib/auth";
import { sendEmail } from "../lib/mailer";
import bcrypt from "bcryptjs";

const router = Router();

const changeEmailSchema = v.object({
	access_token: v.string(),
	email: v.pipe(v.string(), v.email("Неверный формат электронной почты")),
	password: v.string(),
});

const changeConfirmSchema = v.object({
	access_token: v.string(),
	code: v.string(),
});

const changePasswordSchema = v.object({
	access_token: v.string(),
	password: v.string(),
	new_password: v.pipe(
		v.string(),
		v.minLength(8, "Минимальная длина пароля - 8 символов"),
	),
});

router.post("/recovery/changeEmail", async (req, res) => {
	const data = v.safeParse(changeEmailSchema, req.body);

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

	if ((await bcrypt.compare(data.output.password, user.password)) == false) {
		return res.status(401).json({ error: "Неверный пароль" });
	}

	if (user.email == data.output.email) {
		return res
			.status(400)
			.json({ error: "Новый адрес электронной почты совпадает со старым" });
	}

	const existingUser = await db
		.selectFrom("User")
		.selectAll()
		.where("email", "=", data.output.email)
		.executeTakeFirst();

	if (existingUser) {
		return res
			.status(400)
			.json({ error: "Электронная почта уже используется" });
	}

	const verify_code = generateOtpCode();
	const verify_code_hash = hashOtp(verify_code);

	await db
		.updateTable("User")
		.set({
			pending_email: data.output.email,
			email_verify_hash: verify_code_hash,
			email_verify_expires_at: new Date(Date.now() + 1000 * 60 * 5),
		})
		.where("id", "=", user.id)
		.execute();

	await sendEmail(
		"Код для подтверждения изменения электронной почты: " + verify_code,
		data.output.email,
	);

	return res.status(200).json({ success: true });
});

router.post("/recovery/confirmEmailChange", async (req, res) => {
	const data = v.safeParse(changeConfirmSchema, req.body);

	if (!data.success) {
		console.log(data.issues);
		return res.status(400).json({ errors: data.issues });
	}

	let { session, user } = await validateSessionToken(data.output.access_token);

	if (!session || !user) {
		return res
			.status(401)
			.json({ error: "Сессия устарела или недействительна" });
	}

	if (
		!user ||
		!user.pending_email ||
		!user.email_verify_hash ||
		!user.email_verify_expires_at ||
		user.email_verify_expires_at < new Date()
	) {
		return res.status(400).json({
			error: "Запрос на изменение почты не существует или устарел",
		});
	}

	if (user.email_verify_hash != hashOtp(data.output.code)) {
		return res.status(400).json({ error: "Неверный код" });
	}

	const old_email = user.email;

	user = await db
		.updateTable("User")
		.where("id", "=", user.id)
		.set({
			email: user.pending_email,
			pending_email: null,
			email_verify_hash: null,
			email_verify_expires_at: null,
			verified_at: new Date(),
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	await sendEmail(
		"Почта вашего аккаунта была успешно изменена. \nЕсли это были не вы, срочно обратитесь в поддержку.",
		old_email,
	);

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

router.post("/recovery/changePassword", async (req, res) => {
	const data = v.safeParse(changePasswordSchema, req.body);

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

	if ((await bcrypt.compare(data.output.password, user.password)) == false) {
		return res.status(401).json({ error: "Неверный пароль" });
	}

	await db
		.updateTable("User")
		.set({
			password: bcrypt.hashSync(data.output.new_password, 12),
		})
		.where("id", "=", user.id)
		.execute();

	await sendEmail(
		"Пароль от вашего аккаунта был успешно изменен. \nЕсли это были не вы, срочно обратитесь в поддержку.",
		user.email,
	);

	await invalidateUserSessions(user.id);

	return res.status(200).json({ success: true });
});

export default router;
