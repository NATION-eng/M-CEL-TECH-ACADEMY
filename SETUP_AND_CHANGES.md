# Masterview Digital Innovation Academy — Setup & Change Log

## Running it
```bash
# Backend
cd backend
npm install
npm run dev        # starts on :5000, auto-spins an in-memory MongoDB
                    # (USE_MEMORY_DB=true is already set in .env)

# Frontend (separate terminal)
cd frontend
npm install
npm run dev         # starts on :5173
```

This was built in a sandbox with no internet access, so nothing here has
actually been through `npm install` or been run — everything below is
verified by careful code tracing and `tsc` type-checking, not by clicking
through a live app. Please treat the first real run as the actual test.

Login pages: `/login` (student/general), `/instructor/login`, `/admin/login`,
`/superadmin/login` — each role-gated to its own account type.

## Change log (chronological)

**Merge & restore:** this codebase is a merge of two diverged copies. Restored
a payment-lockout system that had gone missing (blocks a student's whole app
except the payment screen once their balance is overdue).

**Database:** confirmed no mock/placeholder data anywhere; added missing
indexes (Announcement, Event).

**Authentication:** built a real "Remember Me" (previously the session was
always persisted regardless of any checkbox) — includes a fix so a 30-day
remembered session doesn't silently downgrade to 7 days on its first token
refresh.

**RBAC:** audited every route; fixed a real vulnerability where a student
editing their own project could mass-assign `status`/`grade`/`feedback`,
which would have let them forge their own certificate eligibility.

**Application flow:** apply -> pay -> account-created-automatically flow
built end to end (Admission model, Paystack integration, 48-hour review
message removed, a gated dev-bypass for testing that's unreachable without
an env flag + secret + non-production environment).

**Courses:** added the missing "Schedule" concept (day/time/mode per
session) end to end — model, admin form, student display.

**Resource management:** expanded file types (Word/Excel/PowerPoint/video/
audio), real YouTube support (auto-pulls title/thumbnail, no API key), fixed
an orphaned-file bug (deleting a resource now deletes it from Cloudinary
too), and built the entire Instructor upload UI from scratch — it didn't
exist before, only the backend did.

**Blog & Announcements:** merged into one tabbed admin page; built a
dependency-free rich text editor (no new npm package, since installs can't
be verified in this sandbox); added scheduling, drafts, and archive/restore/
undo (with recorded who/when/why); server-side HTML sanitization. Found and
fixed: students had no page anywhere to view announcements, despite the
targeting system existing specifically for them.

**Instructor Portal:** course create/edit/publish/delete opened up to
instructors (previously admin-only) with ownership + enrollment-safety
guardrails; quiz/assignment editors were create-only with no way to ever
find or edit something again — fixed, plus built the missing course-content
management list page; the notification bell across Instructor/Admin/Super
Admin was either absent or a dead button, and the Student one was hardcoded
fake data (`['Assignment due tomorrow...', ...]` as literal strings) — built
one real, shared, working component for all four portals.

**Portal login separation:** each role now has its own login URL
(`/login`, `/instructor/login`, `/admin/login`, `/superadmin/login`),
role-gated so correct credentials for the wrong portal are rejected with a
clear message. Confirmed the underlying access hierarchy was already correct
(Super Admin > Admin > Instructor > Student, cumulative oversight downward,
never upward) and didn't need changing.

## Known open items (not yet done)
- Student Portal verification pass (next up).
- Admin Portal / Super Admin Portal verification passes.
- Messaging system: real-time/typing indicators/read receipts, and a spec
  conflict between two different prompts on who's allowed to message whom
  (flagged, not resolved without your input).
- Global search, deeper performance/accessibility passes, full mobile
  responsiveness audit.
- Firebase/Supabase migration — explicitly dropped per your instruction to
  stay on MongoDB.
