import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { hash } from "bcryptjs";

const router = Router();

const registerSchema = v.object({
	username: v.pipe(v.string(), v.minLength(3), v.maxLength(20)),
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
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
		return res.status(200).json({ success: true });
	}

	const user_id: `u_${string}` = `u_${nanoid(10)}`;
	await db
		.insertInto("User")
		.values({
			id: user_id,
			username: data.output.username,
			email: data.output.email,
			password: await hash(data.output.password, 12),
		})
		.execute();

	return res.status(200).json({ success: true });
});

export default router;
