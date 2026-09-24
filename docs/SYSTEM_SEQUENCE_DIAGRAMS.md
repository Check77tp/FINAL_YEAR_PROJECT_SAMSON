# System Sequence Diagrams

Elaboration Iteration 1 deliverable (UP), companion to
[USE_CASES.md](USE_CASES.md). A **system sequence diagram (SSD)** treats the
whole application as a single black box (`:System`) and shows only the
messages that cross the actor/system boundary — no internal layers, no
services, no database. That internal detail belongs to the *design*
sequence diagram in [LOGICAL_ARCHITECTURE.md §4](LOGICAL_ARCHITECTURE.md#4-sequence-across-the-layers--one-concrete-example),
which deliberately shows the opposite: nothing *but* the internal layers,
for one of the use cases below (UC-16), so the two documents are direct
counterparts of each other at two different zoom levels.

One SSD per primary use case from [USE_CASES.md §3](USE_CASES.md#3-primary-use-cases--fully-dressed-12-of-40-30) —
the same 12, in the same order.

---

### UC-2 — Log in

```mermaid
sequenceDiagram
  actor U as User
  participant S as :System
  U->>S: login(idOrEmail, password)
  alt credentials valid
    S-->>U: session(token), profile(role)
  else invalid
    S-->>U: error("invalid credentials")
  end
```

### UC-3 — Submit a maintenance request

```mermaid
sequenceDiagram
  actor St as Student
  participant S as :System
  St->>S: submitRequest(category, hostel, room, priority, description, photo?)
  alt valid
    S-->>St: request(id, status="open")
  else invalid
    S-->>St: error(field, reason)
  end
```

### UC-9 — Get a triage suggestion

```mermaid
sequenceDiagram
  actor St as Student
  participant S as :System
  St->>S: suggestTriage(description)
  S-->>St: suggestion(categoryId, priority, reason, source)
  opt student agrees
    St->>S: applySuggestion(suggestion)
  end
```

### UC-6 — Back an existing report ("Me too")

```mermaid
sequenceDiagram
  actor St as Student
  participant S as :System
  St->>S: upvote(requestId)
  alt allowed
    S-->>St: upvoted(requestId, count)
  else own/resolved request
    S-->>St: error("cannot upvote this request")
  end
  opt student changes their mind
    St->>S: removeUpvote(requestId)
    S-->>St: upvoted=false, count
  end
```

### UC-16 — Update the status of an assigned request

```mermaid
sequenceDiagram
  actor T as Technician
  participant S as :System
  T->>S: advanceStatus(requestId, nextStatus)
  alt valid next step, technician owns it
    S-->>T: request(id, status=nextStatus)
  else invalid
    S-->>T: error("not the next valid step" | "not assigned to you")
  end
```

### UC-17 — Attach proof of finished work

```mermaid
sequenceDiagram
  actor T as Technician
  participant S as :System
  T->>S: resolve(requestId, photo?, note?)
  alt photo valid (or not required)
    S-->>T: request(id, status="resolved")
  else photo required but missing, or invalid
    S-->>T: error("proof of work required" | "invalid photo")
  end
```

### UC-23 — Assign a technician to a request

```mermaid
sequenceDiagram
  actor A as Administrator
  participant S as :System
  A->>S: getTechnicianRanking()
  S-->>A: technicians(ranked, recommended)
  A->>S: assign(requestId, technicianId)
  alt request is open, technicianId valid
    S-->>A: request(id, status="assigned", technicianId)
  else
    S-->>A: error("request not open" | "not a technician")
  end
```

### UC-10 — Draft a request offline

```mermaid
sequenceDiagram
  actor St as Student
  participant S as :System
  St->>S: submitRequest(...)
  S--xSt: (network unreachable)
  Note over St: draft queued on-device (IndexedDB)
  Note over St: connectivity returns
  St->>S: submitRequest(...) [automatic retry]
  S-->>St: request(id, status="open")
```

### UC-31 — View recurring-issue detection

```mermaid
sequenceDiagram
  actor A as Administrator
  participant S as :System
  A->>S: getRecurringIssues()
  S-->>A: issues[](scope, hostel, room?, category, count, severity, suggestion)
  opt administrator wants to act
    A->>S: planPreventiveCheck(hostel, room?, category) [→ UC-34, prefilled]
  end
```

### UC-38 — Generate a request when a schedule falls due

```mermaid
sequenceDiagram
  actor Sc as Scheduler
  participant S as :System
  Sc->>S: checkDueSchedules(now)
  loop each due schedule
    S->>S: advance nextDueAt
    alt previous generated task is finished
      S->>S: createRequest(...) [same as UC-3, description prefixed]
      Note over S: request created, notifications sent
    else previous task still open
      Note over S: skipped this cycle
    end
  end
```

### UC-39 — Detect and alert on an overdue request

```mermaid
sequenceDiagram
  actor Sc as Scheduler
  participant S as :System
  Sc->>S: checkOverdue(now)
  loop each open/assigned/in-progress request
    alt past SLA target and not yet alerted, OR reminder interval elapsed
      S->>S: write overdueNotifiedAt
      S-->>Sc: notify(administrators, assignedTechnician)
    else
      Note over S: no alert due yet
    end
  end
```

### UC-13 — Submit app feedback

```mermaid
sequenceDiagram
  actor U as User
  participant S as :System
  U->>S: submitFeedback(rating, category?, message?)
  alt rating 1-5
    S-->>U: feedback(id, rating, category, message)
    Note over S: administrators notified
  else rating missing/out of range
    S-->>U: error("rating must be 1-5")
  end
```
