import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter;
export async function initMailer() {
	try {
		if (process.env.NODE_ENV != "production") {
			const testAccount = await nodemailer.createTestAccount();
			transporter = nodemailer.createTransport({
				host: "smtp.ethereal.email",
				port: 587,
				secure: false,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass,
				},
			});
		} else {
			if (
				!process.env.SMTP_HOST ||
				!process.env.SMTP_PORT ||
				!process.env.SMTP_USER ||
				!process.env.SMTP_PASSWORD
			) {
				throw new Error(
					"SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD env vars are required",
				);
			}

			transporter = nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: parseInt(process.env.SMTP_PORT),
				secure: process.env.SMTP_PORT == "465",
				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASSWORD,
				},
				tls: {
					rejectUnauthorized: true,
					minVersion: "TLSv1.2",
				},
			});
		}
		console.log("Mailer ready");
	} catch (error) {
		console.log("Mailer failed to initialize");
		console.error(error);
	}
}

export async function sendEmail(text: string, email: string) {
	const info = await transporter.sendMail({
		from: '"Rapid Motion" <auth@rapid-motion.ru>',
		to: email,
		subject: "Подтвердить регистрацию!",
		text: text,
		headers: {
			"X-Entity-Ref-ID": Math.random().toString().substring(2),
		},
	});

	if (process.env.NODE_ENV != "production") {
		console.log("DEBUG", "Preview URL: " + nodemailer.getTestMessageUrl(info));
	}

	if (info.accepted.length > 0) {
		return true;
	} else {
		return false;
	}
}
