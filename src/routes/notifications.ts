import { Router } from "express";
import { db } from "..";

const router = Router();

router.get("/getNotifications", async (req, res) => {
    const notifications = await db
        .selectFrom("Notification")
        .select([
            "id",
            "title",
            "body",
            "created_at"
        ])
        .where("hidden", "=", false)
        .execute();

    res.status(200).json({ success: true, notifications });
});

export default router;
