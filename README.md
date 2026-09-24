# Hostel Maintenance Request and Tracking System

-This is site is currently under construction. Further details will be added soon as the site approaches completion.  You can find the live app on: unzamaintenance.netlify.app  
-For now, this is some information to know about the project:

A Progressive Web App (PWA) that lets university hostel students submit maintenance requests, and lets administrators and technicians manage them through a full lifecycle from submission to resolution — replacing an informal, verbal/paper-based reporting process.

Built as my final-year Computer Science (Software Engineering) project at the University of Zambia.

## Overview

Hostel maintenance issues (plumbing, electrical, furniture, etc.) were previously reported informally with no tracking or accountability. This system gives students a simple, mobile-first way to log and track requests, and gives administrators and technicians a structured workflow for assignment and resolution.

## Architecture

Client-server architecture with the server internally organized in three layers:


- The client never talks to Supabase directly — all data access goes through the Express REST API.
- The server's layers only call downward: routes validate and route, services hold business rules, repositories are the only layer that queries the database.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) — functional components + hooks |
| Styling | Plain CSS, one file per component, CSS custom properties for design tokens |
| PWA | Service Worker + Web App Manifest |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT), with ID-number-based login |
| File storage | Supabase Storage (request photo attachments) |
| Language | JavaScript throughout |

## User Roles

- **Student** — submits requests, tracks their own requests
- **Technician** — views and updates status on assigned requests
- **Administrator** — views all requests, assigns technicians, views analytics/reports

Enforced both in the UI and on the server, with the server as the actual access-control boundary.

## Ticket Lifecycle

`Open → Assigned → In Progress → Resolved → Closed`

Status transitions are validated server-side, with every transition recorded for reporting.

## Features (all implemented)

- Registration and login via student/staff ID number (Supabase Auth)
- Submit a maintenance request with category, description, and optional photo
- Full request lifecycle tracking with status history logging
- Administrator dashboard: view, categorize, and assign requests to technicians
- Technician view: manage assigned requests and update status
- Student view: real-time status tracking of submitted requests
- Analytics/reporting: average resolution time, workload per technician
- Role-based access control across all routes
- Full PWA support: installable, offline request drafting with sync-on-reconnect

## Design

Mobile-first, designed against a 375px base width with a 320px minimum floor, and breakpoints at 768px (tablet) and 1280px (desktop) — since students overwhelmingly access the app from phones in hostel rooms.

## Non-Functional Considerations

- **Offline tolerance:** requests can be drafted offline and sync automatically on reconnect
- **Security:** HTTPS, server-side validation on every input, no plaintext passwords
- **Performance:** core actions (submit, load dashboard) respond within a few seconds under normal conditions

## Testing

- Unit tests on the service layer (business rules, status transition validation)
- Integration tests across routes → services → repositories for core flows
- Manual system/UAT testing across the full student → admin → technician flow

## Author

Samson Mwale — Computer Science (Software Engineering), University of Zambia