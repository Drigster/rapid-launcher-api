import { Router } from "express";
import * as v from "valibot";
import { nanoid } from "nanoid";
import { db } from "..";
import { compare } from "bcryptjs";

const router = Router();

const loginSchema = v.object({
	username: v.pipe(v.string(), v.minLength(3), v.maxLength(20)),
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
});

router.post("/login", async (req, res) => {
	if (req.user) {
		return res.status(400).json({ errors: ["Already logged in"] });
	}

	const data = v.safeParse(loginSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const user = await db
		.selectFrom("User")
		.selectAll()
		.where((eb) =>
			eb.or([
				eb("username", "=", data.output.username),
				eb("email", "=", data.output.email),
			]),
		)
		.executeTakeFirst();

	if (!user) {
		return res.status(401).json({ errors: ["Username or password incorrect"] });
	}

	if (await compare(data.output.password, user.password)) {
		return res.status(401).json({ errors: ["Username or password incorrect"] });
	}

	const user_id: `u_${string}` = `u_${nanoid(10)}`;
	db.insertInto("User").values({
		id: user_id,
		username: data.output.username,
		email: data.output.email,
		password: data.output.password,
	});
});

export default router;
