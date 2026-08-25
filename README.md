# Masterview Digital Innovation Academy — Full Stack Platform

A complete enterprise LMS/SMS/CMS/FMS platform: React + TypeScript frontend, Node.js + Express + MongoDB backend, built to match each other exactly.

```
masterview-academy/
├── frontend/   React + Vite + TypeScript + Tailwind — 5 portals, 39 pages
└── backend/    Node + Express + TypeScript + MongoDB — 24 route groups, 25 models
```

Each folder has its own `README.md` with full details. This file covers running them **together**.

---

## Quick Start (Full Stack)

You'll need two terminal windows/tabs and a MongoDB connection (local or [Atlas](https://www.mongodb.com/cloud/atlas)).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set at minimum:
```
MONGO_URI=mongodb://localhost:27017/masterview        # or your Atlas connection string
JWT_SECRET=<any long random string>
JWT_REFRESH_SECRET=<a different long random string>
SUPER_ADMIN_EMAIL=admin@masterviewacademy.com
SUPER_ADMIN_PASSWORD=<choose a real password>
```

Then start it:
```bash
npm run dev
```

On first run this will:
- Connect to MongoDB
- Seed a super admin account (from the `.env` values above)
- Seed the five academy schools/departments/courses from the PRD

The API runs at `http://localhost:5000`. Check `http://localhost:5000/health` to confirm it's up.

### 2. Frontend

In a second terminal:
```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and is pre-configured (via `vite.config.ts`) to proxy `/api` requests to the backend at `http://localhost:5000`, so no extra wiring is needed in development.

### 3. Log in

Visit `http://localhost:5173/login` and sign in with the `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` you set in step 1. You'll land in the Super Admin portal, from which you can also reach the Admin portal.

To test the student/instructor experience, register a new account at `/register` (defaults to the `student` role), or promote a user to `instructor` directly in MongoDB until an admin "create instructor" flow is wired up in the UI.

---

## What's Already Wired vs. What's Mock Data

**Backend:** every route, controller, and model described in the PRD is implemented and verified against the frontend's exact API contract (see `backend/README.md` for the full endpoint table).

**Frontend:** all 39 pages across the 5 portals are built and route correctly. Some pages currently render static/mock data inline (e.g. dashboard charts, sample student lists) rather than calling the live API yet — `frontend/src/services/api.ts` has every function ready to call, but not every page has been wired to use it instead of its mock array. Connecting each page to its real endpoint is the natural next step once you're ready to test against real data.

---

## Security: What's Protected and How

**Secrets never leave your machine.** The `.gitignore` at the project root excludes `.env` everywhere (root, frontend, backend) — only the `.env.example` templates are tracked. If you `git init` this project, your real API keys, JWT secrets, and database credentials will never be committed.

**The server refuses to start with weak or missing secrets.** On boot, `backend/src/server.ts` checks that `MONGO_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are present and that both JWT secrets are at least 32 characters. If any check fails, the server exits immediately with a clear error instead of silently running with broken or guessable tokens.

**Passwords are bcrypt-hashed (12 rounds)** and excluded from every API response by default (`select: false` on the schema, plus stripped again in the `toJSON` transform as a second layer).

**The frontend never sees secret keys.** Payment gateway secret keys, JWT secrets, email credentials, and Cloudinary secrets all live only in the backend's `.env` — nothing with "SECRET" in its name is referenced anywhere in `frontend/src`.

**Payment webhooks verify gateway signatures** before trusting any incoming payment data, so a forged webhook request can't fake a payment.

**What you still need to do yourself:**
- Generate real, random values for `JWT_SECRET` and `JWT_REFRESH_SECRET` — don't reuse the examples. A quick way: `openssl rand -base64 48`
- Use your real Paystack/Flutterwave secret keys only in production `.env`, never commit them, never share them in chat/Slack/screenshots
- Once deployed, also add `.env` to your hosting platform's secret manager (Render/Railway/Vercel env vars) rather than uploading the file itself
- Consider rotating the `SUPER_ADMIN_PASSWORD` after first login, since it starts as plaintext in your local `.env`

## Production Notes

- Both projects build cleanly with zero TypeScript errors (`npm run build` in each folder)
- See `backend/README.md` → "Known Production Hardening Items" for a few honest caveats (Multer version, webhook body parsing, no automated test suite yet) worth addressing before a public launch
- The frontend's production build bundles into a single ~880KB JS file — fine for development/staging, but consider code-splitting (`React.lazy` per portal) before shipping to real users on slow connections
