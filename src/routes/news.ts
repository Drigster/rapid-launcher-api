import { Router } from "express";
import { db } from "..";

const router = Router();

router.get("/getNews", async (req, res) => {
	const featured = await db
		.selectFrom("News")
		.select([
			"title",
			"body",
			"image_url",
			"created_at",
			"redirect_url",
			"featured_button_text",
			"featured_button_url",
		])
		.where("is_featured", "=", true)
		.limit(1)
		.executeTakeFirst();
	const news = await db
		.selectFrom("News")
		.select(["title", "body", "image_url", "created_at", "redirect_url"])
		.where("is_featured", "=", false)
		.orderBy("created_at", "desc")
		.execute();

	res.status(200).json({ success: true, featured, news });
});

export default router;
