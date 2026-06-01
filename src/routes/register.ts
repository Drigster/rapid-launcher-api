import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { hash } from "bcryptjs";
import { sendEmail } from "../lib/mailer";

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
	user_id: v.pipe(v.string()),
	code: v.pipe(v.string()),
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

	const verify_code = Math.floor(100000 + Math.random() * 900000);

	const user_id: `u_${string}` = `u_${nanoid()}`;
	await db
		.insertInto("User")
		.values({
			id: user_id,
			username: data.output.username,
			email: data.output.email,
			password: await hash(data.output.password, 12),
			verify_code: verify_code.toString(),
			newsletter: data.output.subscribe,
		})
		.execute();

	await sendEmail(
		"Код для подтверждения регистрации: " + verify_code,
		data.output.email,
	);

	return res.status(200).json({
		success: true,
		data: {
			user_id: user_id,
		},
	});
});

router.post("/register/verify", async (req, res) => {
	const data = v.safeParse(verifySchema, req.body);

	if (!data.success) {
		console.log(data.issues);
		return res.status(400).json({ errors: data.issues });
	}

	console.log(data.output);

	let user = await db
		.selectFrom("User")
		.select(["id", "verify_code"])
		.where("id", "=", data.output.user_id as any)
		.executeTakeFirst();

	if (!user || user.verify_code != data.output.code) {
		return res.status(400).json({ errors: ["Invalid user id or code"] });
	}

	await db
		.updateTable("User")
		.set({
			verify_code: null,
			verified_at: new Date(),
		})
		.execute();

	return res.status(200).json({ success: true });
});

export default router;
