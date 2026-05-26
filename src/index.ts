import "dotenv/config";
import express from "express";
import AuthMiddleware from "./middlewares/auth";
import Register from "./routes/register";
import Login from "./routes/login";

import { init_db } from "./lib/db";

export const db = init_db();

const app = express();

app.use(express.json());

app.use(AuthMiddleware);

app.use(Register);
app.use(Login);

app.get("/", async (req, res) => {
	return res.send("Hello World!");
});

const server = app.listen(8080, (error) => {
	if (error) {
		console.error(error);
		return;
	}
	console.log(`Server ready at: http://localhost:3000`);
});
