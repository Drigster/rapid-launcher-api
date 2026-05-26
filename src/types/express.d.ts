declare namespace Express {
	interface Request {
		user: import("../lib/auth").User | null;
		session: import("../lib/auth").Session | null;
	}
}
