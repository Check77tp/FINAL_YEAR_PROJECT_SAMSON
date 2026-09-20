# User Manual

**UNZA Hostel Maintenance** — report, track and resolve hostel maintenance issues.

This manual explains how to use the system, step by step, for each kind of user.
Jump to your section:

- [1. Getting started (everyone)](#1-getting-started-everyone)
- [2. Students](#2-students)
- [3. Technicians](#3-technicians)
- [4. Administrators](#4-administrators)
- [5. Settings, notifications and dark mode](#5-settings-notifications-and-dark-mode)
- [6. Working offline](#6-working-offline)
- [7. Meanings of statuses, priorities and badges](#7-meanings-of-statuses-priorities-and-badges)
- [8. Frequently asked questions](#8-frequently-asked-questions)

> The screenshots use sample data.

---

## 1. Getting started (everyone)

### What you need
A phone, tablet or computer with a web browser and an internet connection. No
download from an app store is required.

### Roles
| Role | What you can do |
|---|---|
| **Student** | Report faults, back faults others have reported, track your own requests, rate repairs |
| **Technician** | See the jobs assigned to you, update their progress, add proof of the finished work |
| **Administrator** | See every request, assign technicians, manage staff accounts, view reports |

### Creating an account (students only)
Students register themselves; technician and administrator accounts are created
for you by an administrator.

1. Open the website and choose **Sign up as Student** under the sign-in form.
2. Enter your **full name**, **student ID**, **email address** and a **password** (at least 8 characters).
3. Submit. You can now sign in.

![Register page](screenshots/manual/m01-register.png)

### Signing in
1. Enter your **Student or Staff ID** and your password, then press **Sign In**.
2. Prefer email? Choose **Log in with email instead**.
3. Tick **Remember this device** on your own phone or laptop so you stay signed in. Leave it unticked on a shared computer.

| Computer | Phone |
|---|---|
| ![Login on desktop](screenshots/01-login.png) | ![Login on a phone](screenshots/manual/m02-login-mobile.png) |

### Installing the app on your phone (recommended)
The site is a *Progressive Web App*: you can add it to your Home Screen so it opens
like a normal app, loads faster and can send you notifications.

- **Android (Chrome):** open the site → menu (⋮) → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** open the site → **Share** button → **Add to Home Screen**.
  (On iPhone, notifications only work after you do this.)

### Finding your way around
- **Computer:** the menu is on the left; the top bar has search, dark-mode toggle, notifications, help and your profile.
- **Phone:** tap the **☰** button (top left) to open the menu.

![Phone menu](screenshots/manual/m08-mobile-menu.png)

### The top bar
| Icon | What it does |
|---|---|
| 🌙 / ☀️ | Switch between dark and light mode |
| 🔔 | Recent activity (a red dot means there is something new) |
| ⓘ | Help — a short guide to what each status means |
| Your name | Profile and sign out |

![Notifications panel](screenshots/manual/m03-notifications-panel.png)

---

## 2. Students

### 2.1 Your dashboard
After signing in you see:

- **Active Requests** and **Completed** — how many of your requests are still being worked on or finished.
- **Report New Issue** — the big green button.
- **Already reported in your hostel** — issues other students have already reported (see 2.3).
- **Recent Requests** — your latest requests with their status.

| Phone | Computer |
|---|---|
| ![Student dashboard on a phone](screenshots/02-student-dashboard-mobile.png) | ![Student dashboard on a computer](screenshots/03-student-dashboard-desktop.png) |

### 2.2 Report a new issue
1. Press **Report New Issue**.
2. **Choose a category** (Plumbing, Electrical, Furniture …).
3. **Select your hostel** and, if you like, type your **room**.
4. **Say how urgent it is** — Low, Medium, High or Critical (see [section 7](#7-meanings-of-statuses-priorities-and-badges)).
5. **Describe the problem.** Be specific: *"The tap in the bathroom leaks even when tightly closed."*
6. *(Optional)* **Attach a photo** — tap the photo area and take or choose a picture (JPG, PNG or WebP, up to 5 MB).
7. Press **Submit Request**.

![Report an issue, with duplicate warning and suggestion](screenshots/04-report-issue-ai-and-duplicates.png)

**Two helpers appear while you fill the form:**

- **"Already reported in your hostel"** — after you pick a category and hostel, if someone has already reported the same kind of problem you will see it here. If it is *your* problem too, tap **Me too** instead of filing a new request. You help the maintenance team see how many people are affected.
- **A suggestion** — as you describe the problem, the system may suggest a category and urgency ("Looks like Electrical, Critical priority"). Tap **Apply** to accept it or **Dismiss** to ignore it. **You are always in control** — nothing changes unless you tap Apply. Dangerous problems (fire, sparking wires, flooding, burst pipes) are always suggested as *Critical*.

> **No internet?** You can still write the request. It is saved on your device and sent automatically when you are back online (see [section 6](#6-working-offline)).

### 2.3 Back a problem someone else already reported ("Me too")
On your dashboard, swipe through **Already reported in <your hostel>**. Each card
shows the category, a short description and its status.

- Tap **Me too** if you have the same problem. The button turns green and shows **Upvoted**.
- Tap it again to take your vote back.
- You cannot vote on your own requests, or on ones that are already resolved.
- Other students' names are never shown.

### 2.4 Track your requests
Open **My Requests** in the menu. Use the tabs to switch between active and finished requests, or the search box in the top bar to find one.

| Computer | Phone |
|---|---|
| ![My requests](screenshots/manual/m05-my-requests.png) | ![My requests on a phone](screenshots/manual/m06-my-requests-mobile.png) |

Tap any request to see its full page:

- the **status** and **priority**,
- who is **assigned** to fix it,
- a **timeline** showing every step with dates,
- for finished jobs, a **Work Completed** section with the technician's photo and note.

![Request in progress](screenshots/manual/m07-request-detail-in-progress.png)

The page updates by itself when something changes — you do not need to refresh. You
can also press **Refresh Status**.

### 2.5 Rate a finished repair
When a request is **Resolved** or **Closed**, the request page shows **Rate this
repair**. Tap 1–5 stars (5 is best) and, if you wish, add a comment. You can rate each request once.

![Completed request with photo, timeline and rating](screenshots/05-request-detail-work-completed.png)

---

## 3. Technicians

### 3.1 Your dashboard
- Choose your **status** at the top — **Available**, **On Job** or **Off Duty**. Administrators use this when deciding who to assign, so keep it accurate.
- See how many jobs are **Assigned** to you and how many you have **Completed**.
- **My Active Tasks** lists your current jobs, with their priority and a deadline badge.

![Technician dashboard](screenshots/09-technician-dashboard.png)

### 3.2 See your tasks
Open **My Tasks**. Each card shows the request number, priority, status, a
deadline badge (for example *Due in 42h* or *Overdue 3h*), the description and the location.

![My tasks](screenshots/manual/m13-my-tasks.png)

### 3.3 Work on a task
Tap a task to open it. You will see who reported it, the description, the student's
photo (if any), and the timeline.

1. When you begin, press **Start Task**. The status changes to *In Progress* and the student is notified.
2. When the repair is done, complete the **Action Panel** (below) and press **Mark as Resolved**.

![Task ready to start](screenshots/manual/m14-task-detail-start.png)

### 3.4 Add proof of the finished work (optional)
When you resolve a task you can:

- **Add a photo** of the finished repair — tap the camera area; on a phone your camera opens. Use **Retake photo** if needed.
- **Add a note** (up to 500 characters), e.g. *"Replaced the washer and tested for leaks."*

The student and the administrators will see this under **Work Completed**. Photos are
automatically reduced in size so they upload quickly on mobile data.

![Proof of work](screenshots/10-technician-proof-of-work.png)

> You can only update tasks that are **assigned to you**.

---

## 4. Administrators

### 4.1 Dashboard
A quick health check of maintenance operations:

- **Avg. Resolution Time**, **Requests This Month**, **Resolved This Month**.
- **Overdue Requests** — turns red when any request has passed its target time. Tap it to go to the list.
- **Issue Categories** ring and **Resolution Trend** chart.
- **Needs Attention** — open requests not yet assigned, most urgent first.

![Admin dashboard](screenshots/06-admin-dashboard.png)

### 4.2 Manage requests and assign a technician
Open **Manage Requests**. Every request appears with:

| What you see | Meaning |
|---|---|
| **Overdue 2h / Due soon · 4h / Due in 2d** | The resolution deadline (see [section 7](#7-meanings-of-statuses-priorities-and-badges)) |
| **+8 affected** | How many other students used **Me too** on this issue |
| **Priority** dropdown | Change urgency at any time |
| **Assign** column | Choose a technician and press **Assign** |

**To assign:** open the technician dropdown, choose someone and press **Assign**. The
system marks a **★ recommended** technician — the one who is available and has the
fewest active jobs — and pre-selects them, so assigning is usually one tap.
Each entry shows workload, e.g. *★ John Mwembe (1 active)*. People who are *Off Duty* are never recommended.

![Manage requests](screenshots/07-manage-requests-sla-and-assignment.png)

Use the tabs (All, Open, Assigned, In Progress, Resolved, Closed) to filter, or the top search box (by number, description, category, student name or ID).

### 4.3 A single request
Click a request number to open its page: the reporter, the full description, the photo, the timeline, the technician's **Work Completed** proof and the student's rating. From here you can also:

- change **priority**,
- **assign** a technician (open requests),
- **advance the status** (Mark In Progress, Mark as Resolved, Close Ticket).

![Admin request page](screenshots/manual/m10-admin-request-detail.png)

### 4.4 Manage staff accounts
Open **User Management** to see every account and filter by role.

To create a technician or administrator: press **Add Staff Account**, fill in the
full name, staff ID, email, a temporary password (at least 8 characters) and the role,
then **Create Account**. Give the person their staff ID and temporary password.
Students cannot be created here — they register themselves.

![User management](screenshots/manual/m11-user-management.png)

### 4.5 Reports and analytics
Open **Reports & Analytics**:

- Summary numbers including **Average Rating**.
- **Resolution Trend** for the last 7 days.
- **Hostel Hotspots** — a grid of hostels × categories; **darker = more requests**. The sentence above it names the busiest hostel. Use **All time / Still open** to switch between history and what needs doing now.
- **Requests by Category**, **Requests by Hostel** and **Technician Workload**.

![Reports and analytics](screenshots/manual/m12-reports-top.png)

![Hostel hotspots](screenshots/08-reports-heatmap.png)

**Export and share**
- **Export CSV** — downloads every request as a spreadsheet.
- **Print / Save as PDF** — produces a clean printable report.
- **Email me the summary** — sends the weekly summary to your own email address straight away.

### 4.6 Automatic alerts and emails
You do not need to do anything for these:
- **Overdue alerts** — the system checks every hour for requests that have passed their deadline and notifies all administrators and the assigned technician. If a request stays overdue you get a **reminder**: every **4 hours** for Critical and High requests, and **once a day** for Medium and Low. Reminders stop as soon as the request is Resolved.
- **New request and status alerts** — push notifications (if you turned them on).
- **Weekly summary email** — every Monday at 08:00 (Lusaka time) to all administrators.

---

## 5. Settings, notifications and dark mode

Open **Settings** in the menu.

![Settings](screenshots/12-settings-notifications-appearance.png)

- **Profile** — change your **name** or **photo** (**Edit Profile**, or tap the camera on your picture). Your ID, email and role cannot be changed here.
- **Appearance** — choose **System** (follows your device), **Light** or **Dark**. The 🌙 button in the top bar switches quickly.
- **Push Notifications** — turn on alerts on *this device*, even when the app is closed. You are asked for permission once. If you previously pressed "Block", allow notifications for the site in your browser settings first.
- **Sign Out** — sign out safely. This also stops notifications on that device, so nobody else using the phone receives yours.

![Editing your profile](screenshots/manual/m09-settings-edit-profile.png)

**Dark mode**

| Admin (computer) | Student (phone) |
|---|---|
| ![Dark mode, admin](screenshots/11-admin-dashboard-dark-mode.png) | ![Dark mode, student](screenshots/manual/m15-student-dark-mobile.png) |

**Who gets which notifications**

| You are | You are notified when |
|---|---|
| Student | your request is assigned, or its status changes |
| Technician | a task is assigned to you, or one of yours becomes overdue |
| Administrator | a new request is submitted, or a request becomes overdue |

---

## 6. Working offline

Hostel Wi-Fi is not always reliable, so the app is built to cope:

- **Pages you have visited** still open quickly, even on a poor connection.
- **Students can write a new request with no connection.** It appears in **My Requests** under *drafts* and is sent automatically when you are back online. You do not need to do anything.
- Other actions (assigning, changing status, rating) need a connection; you will see a clear message if you are offline.

---

## 7. Meanings of statuses, priorities and badges

### Status (the life of a request)
`Open → Assigned → In Progress → Resolved → Closed`

| Status | Meaning |
|---|---|
| **Open** | Submitted, waiting for an administrator to assign a technician |
| **Assigned** | A technician has been chosen |
| **In Progress** | The technician has started work |
| **Resolved** | The repair is finished (you can rate it) |
| **Closed** | Fully completed and filed |

A request always moves forward one step at a time; it cannot skip or go backwards.

### Priority and target time
The clock starts when the request is reported and stops when it is Resolved.

| Priority | Use it for | Target |
|---|---|---|
| **Critical** | Danger or serious damage: sparking wires, flooding, burst pipe, gas smell | 4 hours |
| **High** | Loss of an essential service: no water, no power, door or window that won't lock | 24 hours |
| **Medium** | A real fault, but not urgent: dripping tap, dead socket | 72 hours |
| **Low** | Cosmetic or minor: squeaky hinge, scuffed paint | 1 week |

### Deadline badges (staff)
| Badge | Meaning |
|---|---|
| **Due in 2d** (grey) | Plenty of time left |
| **Due soon · 4h** (amber) | Less than a quarter of the time remains |
| **Overdue 2h** (red) | The target has passed — needs attention now |
| *(no badge)* | Already resolved or closed |

---

## 8. Frequently asked questions

**I forgot which ID to use.**
Students use their **student ID**; staff use their **staff ID** (for example `STF-1001`). You can also choose *Log in with email instead*.

**Can I edit or cancel a request after submitting it?**
Not yet. If something changed, contact the maintenance office, or submit a new request with the details.

**Why can't I see other students' requests?**
Your own requests are private. The *Already reported* strip shows only the issue and its status — never who reported it.

**Why can't I press "Me too" on some cards?**
You cannot vote on your own requests, or ones that are already resolved.

**Why don't I get notifications?**
Check **Settings → Push Notifications** is on for this device, and that notifications are allowed for the site in your browser. On iPhone, add the app to your Home Screen first.

**The page didn't update.**
Pages update by themselves. If you lost your connection for a while, reload the page (or press **Refresh Status** on a request).

**I was signed out unexpectedly.**
Sessions expire for your security. Sign in again and tick **Remember this device** on your own phone.

**Who do I contact for help?**
Press the **ⓘ** icon for the status guide, or contact your hostel's maintenance administrator.
