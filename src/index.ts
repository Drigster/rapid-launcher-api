import "dotenv/config";
import express from "express";
import Register from "./routes/register";
import Login from "./routes/login";
import Server from "./routes/server";
import Recovery from "./routes/recovery";

import { init_db } from "./lib/db";
import { initMailer } from "./lib/mailer";

export const db = init_db();
initMailer();

const app = express();

app.use(express.json());

app.use((req, res, next) => {
	console.log(`${req.method} ${req.url}`);
	next();
});

app.use(Register);
app.use(Login);
app.use(Server);
app.use(Recovery);

app.use((req, res) => {
	res.status(404).json({ error: "API ERROR: Route not found" });
});

// Global error handler - must be last
const errorHandler = (err, req, res, next) => {
	console.error(err);

	// Handle JSON parsing errors
	if (err instanceof SyntaxError && "body" in err) {
		return res.status(400).json({ error: "API ERROR: Invalid JSON" });
	}

	// Handle other errors
	const status = err.status || err.statusCode || 500;
	const message = err.message || "API ERROR: Internal Server Error";

	res.status(status).json({ error: message });
};

const server = app.listen(8080, (error) => {
	if (error) {
		console.error(error);
		return;
	}
	console.log(`Server ready at: http://localhost:8080`);
});
