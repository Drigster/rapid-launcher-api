# Rapid Launcher API

Small authentication and server-lookup API used by the Rapid Launcher project.

## Requirements

- Node.js (v18+ recommended)
- pnpm (or use npm/yarn)
- PostgreSQL database for `DATABASE_URL`

## Environment

- `DATABASE_URL` is required for Prisma and the database layer.
- `AUTH_TOKEN` is used by the `checkServer` middleware.
- `NODE_ENV=production` enables real SMTP settings.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` are required only in production.

## Install

Install dependencies:

```bash
pnpm i
```

## Run

Start the server (defaults to port 8080):

```bash
pnpm run dev
```

The server listens on http://localhost:8080 by default.

If you need to sync the Prisma schema to the database, run:

```bash
pnpm run db:push
```

### Endpoints (standardized format)

- **POST** /register
  - Purpose: Create a new user account, send a verification OTP to the supplied email, and create a session.
  - Body: `{ "username": string, "email": string, "password": string, "subscribe": boolean }`
  - Validation: username 3-20 chars; valid email format; password >= 8 chars.
  - Success: `200` `{ "success": true, "data": { "access_token": string, "expires_at": number } }`
  - Errors: `400` `{ "errors": [...] }` for validation issues.
  - Notes: if the username or email already exists, the current implementation still returns `200` with `{ "success": true }`.

- **POST** /register/verify
  - Purpose: Verify a newly created account using the pending registration session.
  - Body: `{ "access_token": string, "code": string }`
  - Validation: `access_token` required, `code` required.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "errors": [...] }` or `{ "error": "Запрос на подтверждение почты не существует или устарел" }`; `401` `{ "error": "Сессия устарела или недействительна" }` (session invalid).
  - Notes: the current implementation accepts `code` but does not compare it against the stored verification hash.

- **POST** /login
  - Purpose: Authenticate a user and create a session.
  - Body: `{ "username": string, "password": string }`
  - Validation: both fields required; invalid/malformed fields return `400` with `errors`.
  - Success: `200` `{ "success": true, "data": { "access_token": string, "expires_at": number, "user": { "id": string, "username": string, "email": string } } }`
  - Errors: `401` `{ "error": "Username or password incorrect" }`; `403` `{ "error": "Пользователь не подтвержден", "data": { "access_token": string, "expires_at": number } }` for unverified users.

- **POST** /authenticate
  - Purpose: Validate an access token and return current session + user info.
  - Body: `{ "access_token": string }`
  - Validation: `access_token` required.
  - Success: `200` `{ "success": true, "data": { "access_token": string, "expires_at": number, "user": { ... } } }`
  - Errors: `401` `{ "error": "Сессия устарела или недействительна" }`; `403` for unverified users (includes `data` with token + expires_at).

- **POST** /recovery/changeEmail
  - Purpose: Request a change of account email; sends OTP to the new address.
  - Body: `{ "access_token": string, "email": string, "password": string }`
  - Validation: `access_token`, valid `email`, `password` required by schema.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "error": "message" }` for validation/duplicate email or same-as-current; `401` `{ "error": "Сессия устарела или недействительна" }` if session invalid.
  - Notes: the current implementation does not verify `password` against the user record.

- **POST** /recovery/verifyEmailChange
  - Purpose: Confirm pending email change using OTP sent to the new address.
  - Body: `{ "access_token": string, "code": string }`
  - Validation: both fields required.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "errors": [...] }` or `{ "error": "Неверный код" }` for invalid/expired codes; `401` for invalid session.

- **POST** /joinServer
  - Purpose: Attach a user to a game server as part of launcher flow.
  - Body: `{ "access_token": string, "server_id": string }`
  - Validation: both fields required.
  - Success: `200` `{ "success": true }` (user `server_id` updated)
  - Errors: `400` `{ "errors": [...] }` for validation; `403` `{ "error": "Сессия устарела или недействительна" }` for invalid session; `200` with `{ "error": "Игрок уже находится на сервере" }` when callback confirms existing presence; `500` `{ "error": "Ошибка сервера, попробуйте позже" }` on callback failure.

- **POST** /checkServer
  - Purpose: Verify that a username belongs to the provided `server_id` (protected route).
  - Body: `{ "username": string, "server_id": string }` (send an `Authorization: Bearer <token>` header)
  - Validation: both fields required.
  - Success: `200` `{ "success": true }` when server_id matches.
  - Errors: `400` `{ "error": "User does not exist" }`; `403` `{ "error": "Failed to verify server id" }` when mismatch.
  - Notes: the current middleware only rejects a missing or empty Bearer token.

- **POST** /checkUser (temporary)
  - Purpose: Development dummy endpoint used by server callbacks.
  - Body: `{ "username": string }`
  - Validation: `username` required.
  - Success: `200` `{ "success": true }` when username == `test`.
  - Errors: `200` `{ "success": false }` for other usernames (temporary stub).

- **POST** /getUser (temporary)
  - Purpose: Development dummy user lookup endpoint.
  - Body: `{ "username": string }`
  - Validation: `username` required.
  - Success: `200` `{ "success": true }` when username == `test`.
  - Errors: `200` `{ "success": false }` for other usernames.
