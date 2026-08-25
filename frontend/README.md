# Masterview Digital Innovation Academy — Frontend

A complete Vite + React + TypeScript + Tailwind CSS frontend for the Masterview platform.

## Stack
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand (auth state)
- React Router v6
- TanStack Query
- Recharts (dashboards)
- Lucide React (icons)
- React Hot Toast (notifications)

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

## Portals

| URL | Role |
|-----|------|
| `/` | Public website |
| `/login` | Sign in |
| `/register` | Register |
| `/student/dashboard` | Student portal |
| `/instructor/dashboard` | Instructor portal |
| `/admin/dashboard` | Admin portal |
| `/superadmin/dashboard` | Super Admin portal |

## Pages

### Public (7 pages)
Home, About, Programs, Admissions, Events, Blog, Contact

### Student Portal (10 pages)
Dashboard, Courses, Lesson viewer, Assignments, Quizzes, Projects, Certificates, Resources, Payments, Profile

### Instructor Portal (8 pages)
Dashboard, Courses, Lesson Editor, Assignment Editor, Quiz Editor, Attendance, Grades, Students

### Admin Portal (11 pages)
Dashboard, Students, Instructors, Courses, Curriculum, Certificates, Payments, Announcements, Events, Blog, Audit Logs

### Super Admin Portal (3 pages)
Dashboard, All Users, Settings

## API
All API calls go through `src/services/api.ts`. Set `VITE_API_URL` in `.env` to point to your backend.

## Mock Data
All pages use static mock data — ready to wire up to the real API once the backend is running.
