# Nexora HRMS

A multi-subsidiary HR Management System built with Next.js (App Router) and TypeScript.

The system models an international company that operates through several subsidiaries. Each subsidiary has its own departments, employees, public-holiday calendar, timezone and currency, while a central administrative layer can see and report on everything.

Built against the provided SRS. Section 9.1 (mandatory scope) is fully working.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo logins](#demo-logins)
- [What to look at first](#what-to-look-at-first)
- [Features](#features)
- [How leave approval works](#how-leave-approval-works)
- [Architecture](#architecture)
- [Database design](#database-design)
- [Roles and permissions](#roles-and-permissions)
- [Seed data](#seed-data)
- [Project structure](#project-structure)
- [Completed vs deferred](#completed-vs-deferred)
- [Extending to payroll, recruitment and performance](#extending-to-payroll-recruitment-and-performance)
- [Notes and decisions](#notes-and-decisions)

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | TypeScript throughout |
| UI | Tailwind CSS v4 + shadcn/ui | Nova preset, Radix primitives |
| Charts | Recharts | Wrapped in the shadcn chart component |
| Database | SQLite | File-based, zero setup for the reviewer |
| ORM | Prisma 7 | Driver adapter: `@prisma/adapter-better-sqlite3` |
| Auth | Auth.js v5 (NextAuth) | Credentials provider, JWT sessions |
| Validation | Zod + React Hook Form | The same Zod schema runs on client and server |
| Passwords | bcryptjs | Hashed at rest |

**Why SQLite over MySQL.** The SRS allows either. SQLite was chosen so the project runs with no database server, no credentials and no network access — the reviewer clones, installs, seeds and runs. Because everything goes through Prisma, switching to MySQL means changing `provider` in `prisma/schema.prisma`, swapping the adapter package, and pointing `DATABASE_URL` at the server. No query code changes.

**Version pinning.** `next` and `prisma` are pinned to exact versions. During development, `next@16.3.5` was published without its Windows native binary (npm 404), and npm's `latest` tag for `prisma` pointed at an `8.0.0-rc` that renamed CLI commands. Pinning keeps a fresh `npm install` reproducible.

---

## Getting started

**Requirements:** Node.js 20 or newer, and npm.

```bash
# 1. Install dependencies (this also runs `prisma generate`)
npm install

# 2. Create your environment file
#    Windows:
copy .env.example .env
#    macOS / Linux:
cp .env.example .env

# 3. Put a real secret in .env (see below)

# 4. Create the database tables and load demo data
npx prisma migrate dev --name init
npm run db:seed

# 5. Run it
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

`.env` needs two values:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<a long random string>"
```

`DATABASE_URL` can stay as-is; it creates `dev.db` in the project root. `AUTH_SECRET` signs the session tokens and must be replaced — sessions will not work with the placeholder. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run db:seed` | Load demo data (wipes existing rows first) |
| `npm run db:reset` | Drop the database, re-run migrations, re-seed |
| `npx prisma studio` | Browse the database in a GUI |

---

## Demo logins

Every account uses the same password: **`Password@123`**

| Role | Email | Lands on |
|---|---|---|
| Super Admin (Global HR) | `ayesha.khan@nexora.com` | Global overview |
| HR Manager — Karachi | `bilal.ahmed@nexora.com` | Subsidiary overview |
| HR Manager — Lahore | `asad.mehmood@nexora.com` | Subsidiary overview |
| Department Head — Engineering, Karachi | `usman.raza@nexora.com` | Team dashboard |
| Team Lead — Engineering, Karachi | `sara.malik@nexora.com` | Team dashboard |
| Employee — Engineering, Karachi | `ali.hassan@nexora.com` | My dashboard |

The login page lists these as one-click buttons, so there is nothing to type.

`kashif.ali@nexora.com` is seeded as a terminated employee. It exists to demonstrate that offboarding revokes access while preserving historical records — logging in with it fails by design.

---

## What to look at first

A five-minute tour that exercises the parts the SRS weights most heavily.

**1. Multi-level leave approval** — sign in as **Ali** (Employee), go to *My leave → Request leave*.

- Pick **Casual Leave**, two days. The form previews the working-day count and says it needs manager approval only.
- Submit, then request **Annual Leave** for six days. The preview now says it will go to the manager *and then* the department head.
- Try the same dates twice, or ask for more days than your balance — both are refused with a clear message.

**2. Approve it** — sign in as **Sara** (Team Lead), open *Approvals*. Approve Ali's six-day request with a comment. The request does not complete; it moves to level 2.

**3. Escalation** — sign in as **Usman** (Department Head). The same request is in his queue with an *Escalated · level 2* badge. Approve it. Now the request is approved, Ali's balance drops, and the detail page shows the full audit trail: who decided, when, and what they said.

**4. Role scoping** — while signed in as Ali, type `localhost:3000/admin` in the address bar. You are redirected back to your own dashboard. Sara can open `/manager` but not `/hr`.

**5. Org chart** — open *Org chart*. Ayesha sees all three subsidiaries; Ali sees only his own. Collapse, expand, and search by name or department.

---

## Features

### Authentication and access control

- Email and password login, passwords hashed with bcrypt.
- Role-based access control enforced **server-side**, not merely hidden in the UI.
- Two layers: a proxy (formerly middleware) guards page navigation, and every server page and server action independently calls `requireUser()` or `requireRole()`. Removing the proxy would not open a hole.
- Sidebar links are generated from the same permission table the proxy uses, so navigation and security can never drift apart.
- Terminated employees cannot sign in.

### Organization structure

Country → Subsidiary → Department → Designation, with employees attached at the bottom. Each subsidiary carries its own city, timezone, currency and holiday calendar.

### Reporting hierarchy

Every employee (except the top of the chain) has exactly one direct manager, stored as a self-reference on the employee table. From that single relationship the system derives:

- the full manager chain upward, used for leave escalation
- the full set of direct and indirect reports, used for team dashboards
- the organization chart

The org chart is an interactive tree with search, expand/collapse, report counts per manager, and badges for department heads, the signed-in user and inactive staff. It is scoped by role: global for the Super Admin, own-subsidiary for everyone else.

### Leave management

- Eight leave types with per-type annual quotas and escalation rules.
- Working days only — weekends and the subsidiary's public holidays are excluded from the count, on both the live form preview and the server.
- Configurable multi-level approval (see the next section).
- Full audit trail per request: every step records the approver, the decision, the timestamp and an optional comment.
- Per-employee, per-type, per-year balances, decremented only on final approval.
- Server-side guards: no past dates, no overlapping requests, no exceeding balance, no leave types belonging to another subsidiary, and no deciding a request that is not currently yours.
- Employees can cancel their own pending requests.

### Dashboards

All figures are queried from the database at request time. There are no hard-coded arrays anywhere in the chart components.

| Dashboard | Audience | Contents |
|---|---|---|
| Global overview | Super Admin | Worldwide headcount, pending leave, on-leave-today, attendance rate, subsidiary comparison bar chart, headcount-by-country donut, pending approvals table |
| Team dashboard | Team Lead, Dept Head | Team size, requests awaiting you, on leave today, attendance, leave-status chart, upcoming team leave |
| My dashboard | Employee | Leave balance chart, recent requests with live status, upcoming holidays, announcements, reporting manager |

### Employee directory

Searchable list with filters for subsidiary, department and status. Scoped by role: Super Admin sees everyone, HR sees their own subsidiary. Filter state lives in the URL, so any view can be linked or bookmarked.

### Other

- Holiday calendar per subsidiary, applied automatically to leave calculations.
- Attendance records feeding dashboard metrics.
- In-app notifications written on submission, escalation and decision.
- Global and subsidiary-scoped announcements.
- Responsive from 360px upward; the sidebar collapses to icons and becomes a sheet on mobile.
- Empty, loading and error states on every data-driven screen.

---

## How leave approval works

Approval is data-driven, not hard-coded. When a request is submitted, the chain is built from the employee's own manager relationship and the department's head.

```
Employee submits
      │
      ▼
Level 1 — direct manager (employee.managerId)
      │
      ├── Rejected ──────────────► REJECTED (employee notified)
      │
      └── Approved
            │
            ├── escalation not required ──► APPROVED, balance decremented
            │
            └── escalation required
                        │
                        ▼
            Level 2 — department head (department.headId)
                        │
                        ├── Rejected ─────► REJECTED
                        └── Approved ─────► APPROVED, balance decremented
```

A request escalates when **either** condition holds:

- the leave type is flagged `requiresEscalation` (unpaid, maternity, paternity), or
- the working-day count exceeds that type's `escalationThresholdDays` (three days for annual and sick, two for casual, five for work-from-home)

Both values are columns on `LeaveType`, so HR can change the policy per subsidiary without touching code. If the department head *is* the direct manager, no redundant second level is created.

Each level is a row in `LeaveApprovalStep`. `LeaveRequest.currentLevel` points at the step awaiting a decision, and the server refuses any decision from anyone who is not that step's approver. The day count and escalation test live in `src/lib/leave-rules.ts` and are imported by the seed script, the form preview and the server action, so all three can never disagree.

---

## Architecture

Monolithic full-stack Next.js. The App Router serves both the UI and the data layer; there is no separate API service.

```
Browser
   │
   ▼
proxy.ts ──────────────► session check on page navigation
   │
   ▼
Server Components ─────► read data via src/lib/queries/*
   │
   ▼
Server Actions ────────► mutations, each re-checking authorization
   │
   ▼
Prisma Client ─────────► SQLite
```

**Frontend.** Route groups mirror the permission model: `(auth)` for the login screen, `(app)` for everything behind a session. Inside `(app)`, `/admin`, `/hr`, `/manager` and `/employee` correspond one-to-one with the role areas in the SRS. Server Components do the fetching; Client Components appear only where interactivity demands it — the leave form, the org tree, the charts, the decision buttons.

**Backend.** All writes are Server Actions in `src/app/(app)/leave/actions.ts`. Each one starts by resolving the session, re-validates its input with the same Zod schema the client used, re-checks ownership and permission, and wraps multi-table writes in `prisma.$transaction` so an approval can never leave a half-updated audit trail.

**Data access.** Queries live in `src/lib/queries/` rather than inside components, which keeps pages thin and makes the scoping rules easy to audit in one place.

---

## Database design

Fifteen tables. Full schema in `prisma/schema.prisma`.

```
Country ──< Subsidiary ──< Department ──< Designation
                │              │              │
                │              │              ▼
                ├──< Holiday   └────────────< Employee >──── Role
                ├──< LeaveType                  │  │
                └──< Announcement               │  └── managerId ──┐
                                                │                  │ (self-reference)
                          ┌─────────────────────┤◄─────────────────┘
                          │                     │
                          ▼                     ├──< Attendance
                   LeaveRequest                 ├──< Notification
                          │                     ├──< LeaveBalance
                          ▼                     └──< EmployeeDocument
                   LeaveApprovalStep >──── approverId ──► Employee
```

Decisions worth calling out:

- **`Employee.managerId` is a self-reference.** One column produces the entire hierarchy — no separate hierarchy table to keep in sync.
- **`LeaveApprovalStep` is its own table, not columns on the request.** This is what makes the approval chain configurable in depth. Adding a third level is inserting another row, not a schema migration.
- **`Department.headId`** identifies the level-2 approver, kept separate from the reporting chain so a department head need not be everyone's direct manager.
- **Deactivation over deletion.** Subsidiaries, departments and designations carry `isActive`, and their foreign keys use `onDelete: Restrict`, so a department holding employees cannot be deleted by accident. Employees use a `status` enum (`ACTIVE`, `ON_LEAVE`, `TERMINATED`) so offboarding preserves history.
- **Unique constraints prevent duplicates at the database level**, not just in application code: one department name per subsidiary, one attendance row per employee per day, one balance row per employee per leave type per year, one holiday per subsidiary per date.
- **Dates are stored at UTC midnight** and formatted with an explicit UTC timezone, so a date never shifts by a day depending on where the server runs.
- **Indexes** on the foreign keys that drive the hot queries — `managerId`, `subsidiaryId`, `departmentId`, and `(approverId, decision)` for the approval queue.

---

## Roles and permissions

| Capability | Super Admin | HR Manager | Dept Head | Team Lead | Employee |
|---|---|---|---|---|---|
| Global dashboard | Yes | — | — | — | — |
| Subsidiary dashboard | Yes | Own | — | — | — |
| Team dashboard | Yes | Yes | Own dept | Own team | — |
| Employee directory | All | Own subsidiary | Own subsidiary | — | — |
| Org chart | Global | Own subsidiary | Own subsidiary | Own subsidiary | Own subsidiary |
| Approve level 1 | — | — | — | Direct reports | — |
| Approve escalated | Yes | Own subsidiary | Own dept | — | — |
| Apply for own leave | Yes | Yes | Yes | Yes | Yes |

The URL-area mapping lives in `AREA_ACCESS` in `src/lib/roles.ts` and is the single source of truth: the proxy, the page guards and the sidebar all read from it.

---

## Seed data

`npm run db:seed` builds a company large enough to make the hierarchy and dashboards meaningful:

- **2 countries** — Pakistan, United Arab Emirates
- **3 subsidiaries** — Karachi, Lahore, Dubai, each with its own timezone, currency and holidays
- **11 departments** and **35 employees**
- **A four-level reporting chain**, e.g. Ali Hassan → Sara Malik (Team Lead) → Usman Raza (Dept Head) → Ayesha Khan (Super Admin)
- **8 leave types** with realistic quotas and escalation rules
- **16 leave requests** covering every state: pending at level 1, escalated and pending at level 2, fully approved, rejected at level 1, and rejected at level 2 after a level-1 approval
- **Leave balances** for every employee, with used days reflecting the approved requests
- **10 working days of attendance**, plus holidays, notifications and announcements

Two details worth noting. All dates are generated relative to the day you run the seed, so "upcoming" leave is always genuinely in the future. And the script is idempotent — it clears existing rows first, so re-running it is safe.

One seeded request demonstrates the holiday rule on its own: a five-calendar-day annual leave in August counts as four working days because 14 August (Independence Day) falls inside it.

---

## Project structure

```
prisma/
  schema.prisma              15 models, enums, indexes, constraints
  seed.ts                    demo data generator
  migrations/                committed, so the reviewer's DB matches

src/
  auth.ts                    Auth.js instance, credentials provider
  auth.config.ts             session + route-authorization callbacks
  proxy.ts                   guards page navigation

  app/
    (auth)/login/            login page, form, server action
    (app)/
      layout.tsx             sidebar shell, requires a session
      admin/                 Global overview (Super Admin)
      hr/                    Subsidiary overview (HR)
      manager/               Team dashboard (Team Lead, Dept Head)
      employee/              My dashboard (everyone)
      employees/             employee directory
      org-chart/             interactive org tree
      leave/
        page.tsx             my requests
        new/                 request form
        approvals/           approval queue
        [id]/                request detail + audit trail
        actions.ts           submit / decide / cancel
    api/auth/[...nextauth]/  Auth.js handler

  lib/
    prisma.ts                single Prisma client
    roles.ts                 roles, labels, URL-area permissions
    authz.ts                 requireUser / requireRole
    leave-rules.ts           working-day count + escalation test
    navigation.ts            role-filtered sidebar menu
    format.ts                UTC-safe date formatting
    validations/             Zod schemas shared client and server
    queries/                 dashboard, leave, hierarchy, org

  components/
    ui/                      shadcn primitives
    dashboard/               stat cards, charts, empty states
    leave/                   form, timeline, decision buttons
    org/                     org tree, directory filters
```

---

## Completed vs deferred

### Fully working (SRS 9.1 — mandatory)

- [x] Authentication with five distinct roles and seeded demo users
- [x] Organization data: 2 countries, 3 subsidiaries, 11 departments, 35 employees, four-level reporting chain
- [x] Leave management end to end: submit → direct manager → conditional escalation → status visible to the employee
- [x] Three role-based dashboards driven entirely by database queries
- [x] Organization chart reflecting the seeded reporting structure

### Also included (SRS 9.2 — "if time allows")

- [x] Holiday calendar per subsidiary, applied to leave-day calculations
- [x] Attendance records feeding dashboard metrics
- [x] Notifications on submission, escalation and decision
- [x] Employee directory with search and filters
- [x] Announcements, global and subsidiary-scoped

### Deferred

| Item | Status |
|---|---|
| Subsidiary overview dashboard (`/hr`) | Route and access control exist; widgets are a placeholder. The queries it needs already exist in `queries/dashboard.ts` |
| Notification centre UI | Notifications are written to the database and visible in Prisma Studio; no dropdown in the header yet |
| CSV / PDF export | Not built |
| Document upload | Schema (`EmployeeDocument`) is in place; no upload UI |
| Admin CRUD screens for subsidiaries and departments | Managed through the seed and Prisma Studio |
| Payroll, recruitment, performance | Out of scope by SRS 9.3 — see below |

Everything deferred was a deliberate trade-off against the deadline, in favour of getting the heavily weighted parts — the approval hierarchy, the data model and the UI quality — right.

---

## Extending to payroll, recruitment and performance

SRS 9.3 asks for a note on how the current schema and architecture would grow to support these. The short answer is that all three attach to existing anchors without reshaping anything.

### Payroll

The data payroll consumes is already being captured. `Attendance` gives days present, `LeaveRequest` with `status = APPROVED` gives paid and unpaid absence, and `Subsidiary.currency` already localises money per entity.

New tables would be `SalaryStructure` (one per employee: basic, allowances, effective-from date), `PayrollRun` (one per subsidiary per month, with a status so a run can be locked once paid) and `Payslip` (one per employee per run, storing the computed lines). A payroll run reads attendance and approved leave for its period, applies the salary structure, and writes immutable payslips.

The SRS lists a Finance/Payroll Officer with view-only access to approved leave and attendance. That needs no new mechanism: add the role code to `ROLE_CODES`, give it a `/payroll` entry in `AREA_ACCESS`, and the proxy, the page guards and the sidebar all pick it up together.

### Recruitment / ATS

Recruitment sits *before* an employee exists, so it needs its own entities rather than extensions of `Employee`: `JobOpening` (belongs to a Department, which already belongs to a Subsidiary), `Candidate`, `Application` and `InterviewStage`.

`InterviewStage` would deliberately mirror `LeaveApprovalStep` — an ordered list of steps, each with an assignee, a decision, a timestamp and comments, with the parent row pointing at the current stage. The multi-level approval logic already written for leave is the same shape, so the pattern carries over directly.

Hiring a candidate becomes one transaction: create the `Employee`, set `managerId` from the job opening's reporting line, and create their first-year `LeaveBalance` rows. Onboarding is already implemented that way in the seed script.

### Performance management

This one is almost entirely a reuse of the reporting hierarchy. `ReviewCycle` (per subsidiary, per period), `Goal` (belongs to an Employee, with target and progress) and `ReviewFeedback` (reviewer, reviewee, ratings, comments) are the new tables.

Who reviews whom comes free: `getManagerChain()` and `getAllReportIds()` in `src/lib/queries/hierarchy.ts` already compute the upward chain and the full downward set of reports. Self-review, manager review and skip-level review are all just different traversals of data the system already holds. A department-head dashboard showing review completion would be another query in `queries/dashboard.ts`, rendered with the same `StatCard` and chart components.

### Why none of this needs rework

The reporting hierarchy is a single self-referencing column, so any feature that cares about "who reports to whom" reads it rather than duplicating it. Approval workflows are rows in a steps table rather than hard-coded branches, so a new workflow is new data. Every table that belongs to an entity carries `subsidiaryId`, so multi-tenant scoping extends by adding the same filter. And permissions are a single table in `roles.ts`, so a new role and a new area are two lines, applied consistently everywhere.

---

## Notes and decisions

**The proxy only guards GET requests.** Running Auth.js's session handler on Server Action POSTs caused it to rewrite the session cookie mid-action, silently signing the user out. The proxy now short-circuits on non-GET requests. This costs nothing in security, because actions were never relying on it — each one resolves and checks the session itself. The reasoning is recorded in a comment in `src/proxy.ts`.

**One rules module, three consumers.** `leave-rules.ts` is imported by the seed script, the client-side form preview and the server action. A user therefore cannot see "3 days, manager approval only" in the form and get a different result on submit.

**Validation runs twice, from one schema.** React Hook Form uses the Zod schema for instant feedback; the server action re-parses the same schema before touching the database. Client validation is UX, not a security boundary.

**Prisma's generated client is not committed.** It is regenerated by the `postinstall` script, so `npm install` is all the reviewer needs. `dev.db` is likewise excluded — the migration plus the seed reproduces it exactly.
