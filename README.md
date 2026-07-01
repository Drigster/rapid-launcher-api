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
  - Success: `200` `{ "success": true, "access_token": string, "expires_at": number, "user": null }`
  - Errors: `400` `{ "errors": [...] }` for validation issues.

- **POST** /register/verify
  - Purpose: Verify a newly created account using the pending registration session.
  - Body: `{ "access_token": string, "code": string }`
  - Validation: `access_token` required, `code` required.
  - Success: `200` `{ "success": true, "access_token": string, "expires_at": number, "user": { "id": string, "username": string, "email": string, "verified": boolean } }`
  - Errors: `400` `{ "errors": [...] }` or `{ "error": "Код не верен или устарел" }`; `401` `{ "error": "Сессия устарела или недействительна" }`.

- **POST** /login
  - Purpose: Authenticate a user and create a session.
  - Body: `{ "username": string, "password": string }`
  - Validation: both fields required; invalid/malformed fields return `400` with `errors`.
  - Success: `200` `{ "success": true, "access_token": string, "expires_at": number, "user": { "id": string, "username": string, "email": string, "verified": boolean } }`
  - Errors: `401` `{ "error": "Username or password incorrect" }`; `403` `{ "error": "Пользователь не подтвержден", "access_token": string, "expires_at": number, "user": null }` for unverified users.

- **POST** /authenticate
  - Purpose: Validate an access token and return current session + user info.
  - Body: `{ "access_token": string }`
  - Validation: `access_token` required.
  - Success: `200` `{ "success": true, "access_token": string, "expires_at": number, "user": { "id": string, "username": string, "email": string, "verified": boolean } }`
  - Errors: `401` `{ "error": "Сессия устарела или недействительна" }`; `403` `{ "error": "Пользователь не подтвержден", "access_token": string, "expires_at": number, "user": null }` for unverified users.

- **POST** /register/resendVerify
  - Purpose: Send a new registration verification code to the account email.
  - Body: `{ "access_token": string }`
  - Validation: `access_token` required.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "errors": [...] }`; `401` `{ "error": "Сессия устарела или недействительна" }`.

- **POST** /recovery/changeEmail
  - Purpose: Request a change of account email; sends OTP to the new address.
  - Body: `{ "access_token": string, "email": string, "password": string }`
  - Validation: `access_token`, valid `email`, `password` required by schema.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "errors": [...] }` for validation issues, `{ "error": "Новый адрес электронной почты совпадает со старым" }`, or `{ "error": "Электронная почта уже используется" }`; `401` `{ "error": "Сессия устарела или недействительна" }` if session invalid, `{ "error": "Неверный пароль" }` if the password check fails.

- **POST** /recovery/confirmEmailChange
  - Purpose: Confirm pending email change using OTP sent to the new address.
  - Body: `{ "access_token": string, "code": string }`
  - Validation: both fields required.
  - Success: `200` `{ "success": true, "access_token": string, "expires_at": number, "user": { "id": string, "username": string, "email": string, "verified": boolean } }`
  - Errors: `400` `{ "errors": [...] }`, `{ "error": "Запрос на изменение почты не существует или устарел" }`, or `{ "error": "Неверный код" }`; `401` `{ "error": "Сессия устарела или недействительна" }`.

- **POST** /recovery/changePassword
  - Purpose: Change the account password and invalidate other sessions.
  - Body: `{ "access_token": string, "password": string, "new_password": string }`
  - Validation: all fields required; `new_password` must be at least 8 characters.
  - Success: `200` `{ "success": true }`
  - Errors: `400` `{ "errors": [...] }`; `401` `{ "error": "Сессия устарела или недействительна" }` or `{ "error": "Неверный пароль" }`.

- **POST** /joinServer
  - Purpose: Attach a user to a game server as part of launcher flow.
  - Body: `{ "access_token": string, "server_id": string }`
  - Validation: both fields required.
  - Success: `200` `{ "success": true }` (user `server_id` updated)
  - Errors:
    - `400` `{ "errors": [...] }` when request validation fails.
    - `403` `{ "error": "Сессия устарела или недействительна" }` when the session is invalid or expired.
    - `403` `{ "error": "Игрок уже находится на сервере" }` when the server callback confirms the player is already present.
    - `500` `{ "error": "Ошибка сервера, попробуйте позже" }` when the server callback or network query fails.

- **POST** /getServers
  - Purpose: Return the list of configured servers for a valid session.
  - Body: `{ "access_token": string }`
  - Validation: `access_token` required.
  - Success: `200` `{ "success": true, "servers": [...] }`
  - Errors:
    - `400` `{ "errors": [...] }` when request validation fails.
    - `403` `{ "error": "Сессия устарела или недействительна" }` when the session is invalid or expired.

- **POST** /getServerUser
  - Purpose: Query a game server for launcher-specific user data.
  - Body: `{ "access_token": string, "server_id": string }`
  - Validation: both fields required.
  - Success: `200` `{ "success": true, "userData": { ... } }`
  - Errors: `500` `{ "success": false, "error": "Ошибка сервера, попробуйте позже" }` on server/query failures.

- **POST** /checkServer
  - Purpose: Verify that a username belongs to the provided `server_id` (protected route).
  - Body: `{ "username": string, "server_id": string }`
  - Auth: Protected by middleware; send `Authorization: Bearer <token>` header or a valid session in body where applicable.
  - Success: `200` `{ "success": true, "user_id": string }` when server_id matches.
  - Errors: `400` `{ "success": false, "error": "User does not exist" }`; `403` `{ "success": false, "error": "Failed to verify server id" }` when mismatch.

- **POST** /checkUser (temporary)
  - Purpose: Development dummy endpoint used by server callbacks.
  - Body: `{ "username": string }`
  - Success: `200` `{ "success": true }` when username == `test`, otherwise `{ "success": false }`.
  - Errors:
    - `400` `{ "errors": [...] }` when `username` is missing or invalid.

- **GET** /getNews
  - Purpose: Return site news and featured item.
  - Success: `200` `{ "success": true, "featured": { ... }, "news": [ ... ] }`
  - Errors:
    - `500` `{ "error": "Ошибка сервера, попробуйте позже" }` on database or server errors.

- **GET** /getNotifications
  - Purpose: Return current visible notifications.
  - Success: `200` `{ "success": true, "notifications": [ ... ] }`
  - Errors:
    - `500` `{ "error": "Ошибка сервера, попробуйте позже" }` on database or server errors.
