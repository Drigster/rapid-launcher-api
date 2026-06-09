import { Router } from "express";
import * as v from "valibot";
import { db } from "..";
import { validateSessionToken } from "../lib/auth";
import axios from "axios";
import AuthMiddleware from "../middlewares/auth";
import { posix } from "node:path";

const router = Router();

const joinServerSchema = v.object({
	access_token: v.string(),
	server_id: v.string(),
});

const checkServerSchema = v.object({
	username: v.string(),
	server_id: v.string(),
});

const getServersSchema = v.object({
	access_token: v.string(),
});

router.post("/joinServer", async (req, res) => {
	const data = v.safeParse(joinServerSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const { session, user } = await validateSessionToken(
		data.output.access_token,
	);

	if (!session || !user) {
		return res
			.status(403)
			.json({ error: "Сессия устарела или недействительна" });
	}

	if (user.server_id == null) {
		await db
			.updateTable("User")
			.set({
				server_id: data.output.server_id,
			})
			.where("id", "=", user.id)
			.execute();

		return res.status(200).json({ success: true });
	}

	const server = await db
		.selectFrom("Server")
		.selectAll()
		.where("id", "=", user.server_id as any)
		.executeTakeFirst();

	if (server == undefined) {
		await db
			.updateTable("User")
			.set({
				server_id: data.output.server_id,
			})
			.where("id", "=", user.id)
			.execute();

		return res.status(200).json({ success: true });
	}

	const callback_url = URL.parse(server.callback_url);
	if (!callback_url) {
		console.log("Server callback url is invalid");
		await db
			.updateTable("User")
			.set({
				server_id: data.output.server_id,
			})
			.where("id", "=", user.id)
			.execute();

		return res.status(200).json({ success: true });
	}

	callback_url.pathname = posix.join(callback_url.pathname, "checkUser");
	try {
		const response = await axios.post(callback_url.href, {
			username: user.username,
		});

		if (response.data?.success != true) {
			await db
				.updateTable("User")
				.set({
					server_id: data.output.server_id,
				})
				.where("id", "=", user.id)
				.execute();

			return res.status(200).json({ success: true });
		}

		return res.status(200).json({ error: "Игрок уже находится на сервере" });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: "Ошибка сервера, попробуйте позже" });
	}
});

router.use("/checkServer", AuthMiddleware);
router.post("/checkServer", async (req, res) => {
	const data = v.safeParse(checkServerSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const user = await db
		.selectFrom("User")
		.selectAll()
		.where("username", "=", data.output.username)
		.executeTakeFirst();

	if (!user) {
		return res.status(400).json({ error: "User does not exist" });
	}

	if (user.server_id != data.output.server_id) {
		return res.status(403).json({ error: "Failed to verify server id" });
	}

	return res.status(200).json({ success: true });
});

router.post("/getServers", async (req, res) => {
	const data = v.safeParse(getServersSchema, req.body);

	if (!data.success) {
		return res.status(400).json({ errors: data.issues });
	}

	const { session, user } = await validateSessionToken(
		data.output.access_token,
	);

	if (!session || !user) {
		return res
			.status(403)
			.json({ error: "Сессия устарела или недействительна" });
	}

	const servers = await db.selectFrom("Server").selectAll().execute();

	return res.status(200).json({ success: true, servers });
});

// TEMP: Server API dummy
router.post("/checkUser", async (req, res) => {
	if (req.body.username == "test") {
		return res.status(200).json({ success: true });
	}

	return res.status(200).json({ success: false });
});

router.post("/getUser", async (req, res) => {
	if (req.body.username == "test") {
		return res.status(200).json({ success: true });
	}

	return res.status(200).json({ success: false });
});

export default router;
