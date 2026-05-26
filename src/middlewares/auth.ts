import { NextFunction, Request, Response } from "express";
import { validateSessionToken } from "../lib/auth";

export default async function (
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const sessionToken = req.cookies.get("session");
	if (!sessionToken) {
		req.user = null;
		req.session = null;
		return next();
	}

	const { session, user } = await validateSessionToken(sessionToken);
	if (session) {
		req.cookies.set("session", sessionToken, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			expires: session.expiresAt,
			//   secure: !dev
		});
	} else {
		req.cookies.delete("session", {
			path: "/",
		});
	}

	req.user = user;
	req.session = session;
	return next();
}
