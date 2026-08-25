# Masterview Digital Innovation Academy — Backend API

A complete Node.js + Express + TypeScript + MongoDB backend for the Masterview platform, built to match the frontend's API contract exactly (`src/services/api.ts` in the frontend repo).

## Stack
- Node.js + Express + TypeScript
- MongoDB + Mongoose (25 collections)
- JWT auth (access + refresh tokens) with RBAC
- bcryptjs password hashing
- Cloudinary (file storage)
- Paystack + Flutterwave (payments, with webhook handlers)
- QRCode (certificate verification)
- Nodemailer (transactional email)
- express-validator, helmet, mongo-sanitize, hpp, rate-limit (security)

## Getting Started

```bash
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT secrets, and any third-party keys you have
npm run dev
```

This starts the API on `http://localhost:5000` and automatically:
1. Connects to MongoDB
2. Seeds a super admin account (from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `.env`)
3. Seeds the five academy schools/departments/courses described in the PRD

You can also run the seed manually at any time:
```bash
npm run seed
```

## Production Build

```bash
npm run build   # compiles TypeScript to dist/
npm start       # runs dist/server.js
```

## Project Structure

```
src/
├── config/          # MongoDB + Cloudinary connection setup
├── controllers/      # 20 controllers — one per resource group
├── middleware/        # auth, RBAC, validation, upload, error handling
├── models/            # 25 Mongoose schemas
├── routes/            # 24 route groups, mounted in server.ts
├── types/              # Central TypeScript interfaces
├── utils/               # JWT, email, ID generation, seed script
└── server.ts             # App assembly + boot
```

## API Overview

All routes are prefixed with `/api/v1`. Auth uses `Authorization: Bearer <accessToken>`.

| Group | Base Path | Notes |
|---|---|---|
| Auth | `/auth` | register, login, refresh, logout, me, change-password |
| Users | `/users` | admin/super_admin manage all users |
| Schools / Departments | `/schools`, `/departments` | top of curriculum hierarchy |
| Courses | `/courses` | public read, admin write |
| Badge Levels / Modules / Weeks / Lessons | `/badge-levels`, `/modules`, `/weeks`, `/lessons` | full curriculum tree, instructor-editable |
| Resources | `/resources` | file uploads via Cloudinary |
| Assignments / Submissions | `/assignments`, `/submissions` | file/GitHub/URL submission, grading |
| Quizzes | `/quizzes` | MCQ/true-false/short-answer, auto-graded attempts |
| Attendance | `/attendance` | per-session marking + aggregate reports |
| Certificates | `/certificates` | QR-coded, publicly verifiable at `/certificates/verify/:certNumber` |
| Payments | `/payments` | Paystack + Flutterwave init/verify + webhooks, financial summary |
| Enrollments | `/enrollments` | enroll, track progress, badge completion |
| Projects | `/projects` | personal/team/capstone, instructor review |
| Announcements / Events / Blog | `/announcements`, `/events`, `/blog` | role-targeted content |
| Notifications | `/notifications` | in-app notification feed |
| Audit | `/audit` | admin-only action log |
| Dashboard | `/dashboard` | aggregated stats per role (student/instructor/admin) |

## Security Notes

- Passwords are hashed with bcrypt (12 rounds), never returned in API responses
- All file uploads are type- and size-restricted (10MB, PDF/DOCX/PNG/JPG/ZIP only)
- Payment webhooks verify gateway signatures before processing
- Course deposit percentage is enforced at the database layer (must be ≥50%, per academy policy)
- All mutating actions by admins are recorded in the AuditLog collection
- Rate limiting: 300 req/15min globally, 20 req/15min on auth endpoints

## Known Production Hardening Items

- Multer 1.x has known CVEs patched in 2.x — acceptable for now given Express 4 compatibility, but worth upgrading before a public launch
- Payment webhook routes currently use the standard JSON body parser; for stricter signature verification some gateways prefer raw body — revisit if Paystack/Flutterwave signature checks ever fail in practice
- No automated test suite yet — recommend adding integration tests against a real MongoDB instance (e.g. via `mongodb-memory-server`) before production deployment
