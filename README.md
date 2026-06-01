# Rapid Launcher API

Small authentication and server-lookup API used by the Rapid Launcher project.

## Requirements

- Node.js (v18+ recommended)
- pnpm (or use npm/yarn)

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

## API Endpoints

- **POST** /register
  - Purpose: Create a new user (sends back a verification code server-side).
  - Body: `{ "username": string, "email": string, "password": string }`
  - Success: `200` `{ "success": true, "data": { "user_id": "u_xxx" } }`
  - Validation errors: `400` with `errors` array.

- **POST** /register/verify
  - Purpose: Verify a newly created user using the verification code.
  - Body: `{ "user_id": string, "code": string }`
  - Success: `200` `{ "success": true }`
  - Errors: `400` if invalid id/code.

- **POST** /login
  - Purpose: Authenticate a user and create a session.
  - Body: `{ "username": string, "password": string }`
  - Success: `200` returns a `UserSession` object:
    - `{ "access_token": string, "expires_at": number, "user": { "id": string, "username": string } }`
  - Failure: `401` for incorrect credentials.

- **POST** /joinServer
  - Purpose: Attach a user to a game server (used by launcher flow).
  - Body: `{ "access_token": string, "server_id": string }`
  - Success: `200` `{ "success": true }`
  - Possible errors: `403` if session invalid; `500` on internal error; returns an error when the player is already on the target server.

- **POST** /checkServer
  - Purpose: Verify that a username belongs to the given `server_id`.
  - Notes: This route is protected by the simple `Authorization` middleware. Include `Authorization: Bearer <token>` header.
  - Body: `{ "username": string, "server_id": string }`
  - Success: `200` `{ "success": true }` when matches; `403` if server id mismatch.

- **POST** /checkUser (temporary/dummy)
  - Purpose: Internal/dummy endpoint used for server callbacks during development.
  - Body: `{ "username": string }`
  - Success: `200` `{ "success": true|false }` (returns `true` for username `test`).

- **POST** /getUser (temporary/dummy)
  - Purpose: Dummy lookup for server integrations.
  - Body: `{ "username": string }`
  - Success: `200` `{ "success": true|false }` (returns `true` for username `test`).

## Authentication

- Logging in via `/login` returns an `access_token`. Some endpoints accept the token in the request body (e.g. `/joinServer`) and some server-check endpoints expect an `Authorization: Bearer <token>` header.
- Sessions are validated and extended server-side; tokens expire (see response `expires_at`).

## Notes & TODOs

- Email reminders and real verification email sending are TODOs in the register flow.
- `/checkUser` and `/getUser` are temporary stubs for server-side callbacks.
