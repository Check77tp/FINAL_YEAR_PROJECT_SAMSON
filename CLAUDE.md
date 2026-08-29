# Hostel Maintenance Request and Tracking System

## Project Overview

A web-based Progressive Web App (PWA) that lets university hostel students submit, and lets administrators/technicians manage, maintenance requests (plumbing, electrical, furniture, etc.) through a full lifecycle from submission to resolution — replacing an informal, verbal/paper-based reporting process.

This is a final-year academic project for the University of Zambia. Code should be clean, well-commented, and defensible in an academic viva — prefer clarity over cleverness.

---

## Architecture (do not deviate without discussion)

**Client-server architecture, with the server internally organised as a layered architecture. The client is a Progressive Web App.**

```
CLIENT TIER (PWA)                SERVER TIER (Node.js/Express)         DATA TIER (Supabase)
┌─────────────────────┐          ┌───────────────────────────┐         ┌─────────────────────┐
│ React UI             │  HTTPS   │ Presentation Layer         │  SDK    │ PostgreSQL           │
│ Service Worker        │◄───────►│  (routes/controllers)      │◄───────►│ Auth (JWT, RLS)      │
│ Web App Manifest      │  REST/  │ Business Logic Layer       │         │ Storage (photos)     │
│                       │  JSON   │  (services)                │         │                       │
│                       │         │ Data Access Layer          │         │                       │
│                       │         │  (repositories)            │         │                       │
└─────────────────────┘          └───────────────────────────┘         └─────────────────────┘
```

**Why this matters — enforce these boundaries in code:**
- The **client never talks to Supabase directly**. No Supabase client/keys in the frontend. All data access goes through the Express REST API. This is a hard rule, not a style preference — it's what keeps business rules and access control centralized and enforceable.
- The **server's three layers only call downward**, never sideways or upward:
  - Routes/controllers validate input, check auth, call a service, format the response. No business logic and no direct DB queries here.
  - Services contain the business rules (ticket lifecycle transitions, technician assignment rules, notification triggers). No Express `req`/`res` objects here — services should be framework-agnostic and testable in isolation.
  - Repositories are the only place that talks to Supabase. No business logic here — just querying and mapping rows to/from objects.
- Keep each layer in its own folder so the boundary is visible in the file tree (see structure below).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React | Functional components + hooks. No class components. |
| Styling | Plain CSS | One `.css` file per component/page, imported directly. Use CSS custom properties for the design tokens (colors, fonts, spacing) from `academic_infrastructure_framework.md` — no Tailwind or CSS-in-JS. |
| PWA | Service Worker + Web App Manifest | Use Workbox if it simplifies caching strategy — otherwise a hand-rolled service worker is fine for this scope. |
| Backend runtime | Node.js | |
| Backend framework | Express.js | |
| Database | Supabase (PostgreSQL) | Accessed only from the server. |
| Auth | Supabase Auth (JWT) | Server verifies JWTs on protected routes; RLS policies as a second line of defense at the DB level. |
| File storage | Supabase Storage | For request photo attachments. |
| Language | JavaScript throughout (frontend + backend) | Keep it consistent — no mixing in TypeScript unless you explicitly ask to add it later. |
| Version control | Git / GitHub | Commit early, commit often — small logical commits, not one giant dump at the end. |

---

## Why These Tools

A quick reference for the reasoning behind each tool choice — useful if you (or Claude Code) need to justify a decision later, or explain it in the viva.

**Node.js vs. Express.js — why both?**
They're not redundant; they're two different layers. **Node.js** is a JavaScript *runtime* — it lets JavaScript (normally browser-only) run on a server, giving it access to the filesystem, network, and ports. Without it, the backend couldn't execute JavaScript at all. **Express.js** is a *framework built on top of Node.js* that provides routing, middleware, and request/response handling out of the box, so you're not manually parsing URLs, JSON bodies, and headers for every request. In terms of the architecture: Node.js is what makes the server tier possible; Express.js is what implements the presentation layer (routes/controllers) cleanly. Express was chosen over raw Node.js (or alternatives like Fastify/Koa) because it's the most widely documented, most commonly taught Node.js framework, and its middleware model maps directly onto the layered architecture.

**React — and does the frontend still use HTML/CSS?**
React is a component-based UI library: instead of manually manipulating the DOM, you describe the UI as reusable components (`<RequestCard>`, `<StatusBadge>`, etc.), and React re-renders only what changes when data updates. This fits well with the project's distinct role-based views (student/admin/technician dashboards). **Yes, HTML and CSS are still used** — React components are written in **JSX**, a syntax that looks like HTML embedded inside JavaScript, which compiles down to real DOM elements; there's still one root `index.html` that React mounts into. **Styling: plain CSS files** (decided) — a `.css` file per component/page, imported directly, using the design tokens already defined in `academic_infrastructure_framework.md` (University Green palette, Plus Jakarta Sans/Inter fonts, 8px spacing rhythm) as CSS custom properties/variables rather than a utility framework like Tailwind. "JavaScript" in the tech stack table refers to the programming language used across frontend and backend, not the absence of HTML/CSS.

**CSS class naming convention (enforce this — do not skip):**
Plain CSS files don't give true style isolation — class names are still global in the browser at runtime, so two components using the same class name (e.g. both defining `.title` or `.card`) will silently clash. To prevent this without adopting a heavier tool like CSS Modules, every class name must be prefixed with its component/page name, kebab-case:
- `RequestCard.css` → `.request-card`, `.request-card-title`, `.request-card-status`
- `AdminDashboard.css` → `.admin-dashboard`, `.admin-dashboard-header`
- Never use bare, generic class names like `.title`, `.card`, `.button`, `.header` on their own — always scope them to the component they belong to.
- The one exception is `variables.css`, which intentionally defines global, shared tokens (e.g. `--color-primary`, `--spacing-md`) meant to be reused everywhere.

**Service Worker + Web App Manifest — what makes this a PWA?**
These aren't separate frameworks — they're browser-native features that plug into the React app's output. The **Service Worker** is a background script that intercepts network requests, enabling offline caching of the app shell and queuing/retrying requests (like a student's draft) made while offline — this is the direct mechanism behind the offline-tolerance requirement. The **Web App Manifest** is a JSON file describing the app's name, icon, and launch behavior, which is what enables "Add to Home Screen" / install prompts. React builds the UI; the Service Worker makes it resilient to poor hostel connectivity; the Manifest makes it installable. Together, these three are what "PWA" means in practice.

**Supabase (PostgreSQL) — why the bracket notation?**
This denotes a layering, not two separate choices. **PostgreSQL** is the actual relational database engine that stores and queries the data. **Supabase** is a managed platform that hosts a PostgreSQL database in the cloud and bundles useful services around it — Auth (JWT, password hashing), Storage (file/photo uploads), and auto-generated data access — so these don't need to be built from scratch. Supabase doesn't replace PostgreSQL, it hosts and manages it; this is why the data tier diagram in Chapter Three shows PostgreSQL, Auth, and Storage as three components inside one "Supabase Platform" box.

---

## User Roles

Three roles, enforced both in the UI (what's shown) and the server (what's allowed — the UI check is not security, the server check is):

1. **Student** — submits requests, views/tracks only their own requests.
2. **Technician** — views requests assigned to them, updates status on those requests only.
3. **Administrator** — views all requests, categorizes and assigns them to technicians, views analytics/reports.

---

## Core Ticket Lifecycle

`Open → Assigned → In Progress → Resolved → Closed`

Status transitions are a business rule and belong in the service layer, not scattered across routes or the frontend. Invalid transitions (e.g. `Open → Closed` skipping assignment) should be rejected server-side with a clear error, and every transition should be recorded (see `status_history` below) — this feeds the analytics/reporting requirement.

---

## Database Schema (Supabase / PostgreSQL)

Build these five tables first. Use foreign keys to enforce relationships; don't rely on application code alone to keep referential integrity.

**users**
- `user_id` (PK)
- `name`
- `email` (unique) — always required; used as the underlying Supabase Auth identifier and for account recovery/notifications.
- `id_number` (unique, e.g. student ID or staff ID) — the default login credential shown to the user (see "Authentication: ID-Based Login" below).
- `role` (enum: student | administrator | technician)
- `password_hash` (handled by Supabase Auth — don't roll your own)
- `created_at`

**maintenance_requests**
- `request_id` (PK)
- `student_id` (FK → users)
- `category_id` (FK → categories)
- `description`
- `photo_url` (nullable)
- `status` (enum: open | assigned | in_progress | resolved | closed)
- `created_at`

**categories**
- `category_id` (PK)
- `name` (e.g. Plumbing, Electrical, Furniture)
- `description`

**technician_assignments**
- `assignment_id` (PK)
- `request_id` (FK → maintenance_requests)
- `technician_id` (FK → users)
- `assigned_at`

**status_history**
- `history_id` (PK)
- `request_id` (FK → maintenance_requests)
- `previous_status`
- `new_status`
- `changed_at`

Set up **Row Level Security (RLS) policies** on all tables as a second layer of defense: students can only `SELECT` their own requests; technicians can only `SELECT`/`UPDATE` requests they're assigned to; administrators have broader access. Don't treat RLS as optional — it's part of the architecture, not an afterthought.

---

## Authentication: ID-Based Login (decided)

Students (and staff) log in with their **ID number by default**, not their email — email remains a required field on every account and works as an alternative login method, but it is not the primary field shown on the login screen. This matches the original Stitch mockup's "Student or Staff ID" field.

**Why not just use ID number as the sole credential and drop email entirely:** Supabase Auth is inherently email-based under the hood — every account still needs a real email on file for Supabase Auth itself to function (password reset flows, account recovery, etc.). So email isn't removed from the system; it's just not the field the user types into by default.

**How login must work (server-side resolution, not client-side):**
1. Client submits `{ id_number, password }` to the server's login route — never talks to Supabase directly, per the existing architecture.
2. The server (business logic layer) looks up which `email` corresponds to that `id_number` in the `users` table.
3. The server then calls Supabase Auth's sign-in with that resolved `email` + the submitted `password`.
4. Supabase Auth verifies the password and returns a session as normal.

This keeps the "client never talks to Supabase directly" rule intact — the ID-to-email resolution is just one more repository lookup before the existing auth call, not a new architectural exception.

**UI implication:** the login screen's default/primary field is labeled "Student or Staff ID" (matching the Stitch mockup), with a secondary link/toggle such as "Log in with email instead" for the alternative path. Both paths ultimately call the same server-side login logic described above.

**Registration:** still collects a real email (required, for Supabase Auth) alongside the `id_number`, name, and password — the student fills in both fields once at signup, then only needs their ID number for every login afterward.

---

## Suggested Folder Structure

```
/design                      # Reference UI designs — see "UI Design Reference" section below
  /stitch_exports
    /admin_dashboard_unza_maintenance
    /home_unza_mobile
    /login_unza_maintenance
    ...(one folder per screen, as exported from Google Stitch)

/client                      # React PWA
  /src
    /components               # Each component paired with its own .css file
    /pages                    # Each page paired with its own .css file
    /styles
      variables.css           # Design tokens as CSS custom properties (colors, fonts, spacing)
    /services                # API call wrappers (fetch/axios to the Express API)
    /hooks
  /public
    manifest.json
    service-worker.js

/server                      # Node.js / Express
  /src
    /routes                  # Presentation layer — thin, no business logic
    /middleware               # auth, validation, error handling
    /services                # Business logic layer
    /repositories              # Data access layer — only place Supabase is imported
    /config                   # Supabase client init, env config
  server.js
```

---

## UI Design Reference (Stitch Exports)

Before building any screen, check `/design/stitch_exports/` first — it contains AI-generated reference designs (Google Stitch) for most screens in this project, each in its own folder containing an exported HTML file and screenshot(s), for both desktop and mobile where applicable. These are the source of truth for **layout and visual structure**; `academic_infrastructure_framework.md` remains the source of truth for **exact design tokens** (hex values, font names, spacing units) if the two ever disagree — the Stitch exports were generated from that framework, but treat the `.md` file as canonical if a color or spacing value looks off in an export.

**Folder → screen/role mapping:**

| Folder | Screen | Role | Notes |
|---|---|---|---|
| `login_unza_maintenance` / `login_unza_mobile` | Login | All | Desktop + mobile versions |
| `student_dashboard_unza_maintenance` | Student Dashboard | Student | Desktop |
| `home_unza_mobile` | Student Home | Student | Mobile equivalent of above — confirm before assuming |
| `my_requests_unza_maintenance` / `my_requests_unza_mobile` | My Requests (list) | Student | Desktop + mobile |
| `report_new_issue_unza_maintenance` / `report_issue_unza_mobile` | Submit Maintenance Request (form) | Student | Desktop + mobile |
| `request_details_unza_mobile` | Request Detail / status timeline | Student | Mobile only exported — reuse this layout for desktop unless a desktop version is added later |
| `admin_dashboard_unza_maintenance` | Admin Dashboard (overview/stats) | Administrator | Desktop |
| `manage_requests_unza_maintenance` | Manage/assign requests (table + triage) | Administrator | Desktop |
| `reports_analytics_unza_maintenance` | Reports & Analytics | Administrator | Desktop |
| `technician_dashboard_unza_maintenance` | Technician Dashboard | Technician | Desktop |
| `technician_home_unza_mobile` | Technician Home / task list | Technician | Mobile |
| `task_details_unza_maintenance` | Task Detail (single assigned request) | Technician | |
| `user_profile_unza_maintenance` | User Profile | All roles | Shared/generic — check whether it needs role-specific fields |

**How to use these when implementing a screen:**
1. Open the relevant folder's screenshot(s) first for the overall layout and visual read.
2. Open the exported `.html` file only to check specific structural or spacing details (exact element ordering, nested layout) — **do not copy the raw HTML/inline styles directly into React components.**
3. Rebuild the screen as proper React components following this file's conventions: JSX structure, one `.css` file per component/page, class names prefixed per the naming convention above, and colors/fonts/spacing pulled from `variables.css` (which itself mirrors `academic_infrastructure_framework.md`) rather than hardcoded or copied from the Stitch export.
4. If a screen has no corresponding Stitch export (e.g. Register, if not listed above), follow the visual patterns from the closest related exported screen rather than inventing an unrelated style.

---

## Mobile-First Design Approach (required — do not build desktop-first)

The PWA client must be designed and built **mobile-first**. This is a decided approach, not a suggestion: write the default, no-media-query CSS for the smallest screen first, then use `min-width` media queries to progressively add complexity as the viewport grows. Never write desktop styles first and then try to cram them into a mobile layout with `max-width` overrides — that produces worse, harder-to-maintain CSS and tends to leave mobile as an afterthought, which is backwards for this project since students will overwhelmingly access it from phones in hostel rooms.

**Base design width:** 375px. This is the practical default canvas to design against — it matches the most common phone screen size in circulation (iPhone SE/12–15 standard width, and most budget Android phones sit in the 360–412px range). Unstyled/default CSS (no media query) should target this width.

**Minimum floor:** 320px. Layouts must not visibly break, overflow horizontally, or cut off interactive elements at this width, even though it's not the primary design target — this is the safety net for the smallest devices still in use.

**Breakpoints (match `academic_infrastructure_framework.md` exactly — do not introduce different values):**

| Breakpoint | Range | Grid | Sidebar | Margins |
|---|---|---|---|---|
| Mobile (default, no media query) | up to 767px | 4-column | Hidden drawer | 16px |
| Tablet | 768px – 1279px | 8-column | Collapsed icon rail (72px) | — |
| Desktop | 1280px+ | 12-column | Expanded (260px) | 24px |

**CSS ordering convention to follow in every component's `.css` file:**

```css
/* 1. Default styles = mobile (375px canvas, must not break down to 320px) */
.request-card { padding: 16px; }

/* 2. Then scale up for tablet */
@media (min-width: 768px) {
  .request-card { padding: 20px; }
}

/* 3. Then scale up for desktop */
@media (min-width: 1280px) {
  .request-card { padding: 24px; }
}
```

When implementing any screen from the Stitch exports (see above), start from the mobile export where one exists (`_unza_mobile` folders) as the default styles, then layer in the desktop export (`_unza_maintenance` folders) inside the `min-width: 1280px` query — not the other way around.

---

## Functional Requirements Checklist

Build in roughly this order (mirrors the Agile sprint plan from the project's methodology chapter):

1. Auth: registration + login (Supabase Auth), role assignment — login uses ID number by default per the "Authentication: ID-Based Login" section above, with email as a fallback
2. Student: submit a maintenance request (category, description, optional photo)
3. Request lifecycle + status field on `maintenance_requests`
4. Administrator: view incoming requests, assign to technician
5. Technician: view assigned requests, update status
6. Student: view real-time status of their own requests
7. Status history logging on every transition
8. Administrator: analytics/reporting (avg. resolution time, workload per technician)
9. Role-based access control across all routes
10. PWA layer: manifest, service worker, offline request drafting with sync-on-reconnect

## Non-Functional Requirements to Keep in Mind

- **Usability:** the student-facing request form should be usable with zero training.
- **Performance:** typical actions (submit request, load dashboard) should feel responsive — a few seconds max under normal conditions.
- **Offline tolerance:** a student should be able to draft a request while offline; it syncs once connectivity returns. Don't let this block the UI — queue and retry.
- **Security:** HTTPS everywhere, no plaintext passwords (Supabase Auth handles this), server-side validation on every input regardless of what the client already validated.
- **Maintainability:** respect the layer boundaries above — that's what makes this maintainable.

---

## Testing Expectations

- **Unit tests** on the service layer (business rules — e.g. invalid status transitions should be rejected).
- **Integration tests** on routes → services → repositories for the core request-submission and assignment flows.
- **Manual system/UAT testing** of the full student → admin → technician flow before each milestone demo.
- Test the PWA offline path explicitly (draft while offline, confirm it syncs).

---

## Working Style / Conventions

- Prefer small, incremental commits over large ones — this project is documented as Agile with 1–2 week sprints, so build and demo in that rhythm.
- Comment non-obvious business logic (especially status-transition rules) since this needs to be explainable in an academic report/viva.
- Keep environment variables (Supabase URL/keys) out of source control — `.env`, gitignored, with a `.env.example` checked in.
- When in doubt about a design decision, favor whatever keeps the client-server / layered boundaries clean over whatever is fastest to hack together — this project's report explicitly argues for that structure, so the code should match it.
