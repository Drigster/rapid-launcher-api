import { NextFunction, Request, Response } from "express";

export default async function (
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const bearer = req.headers.authorization;
	if (!bearer) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	if (bearer.startsWith("Bearer ")) {
		const authToken = bearer.slice(7);
		if (
			authToken == undefined ||
			authToken.length <= 0 ||
			authToken !== process.env.AUTH_TOKEN
		) {
			return res.status(401).json({ error: "Unauthorized" });
		}
	}

	return next();
}
