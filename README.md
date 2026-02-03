# 👻 Hausgeist

> Your family's helpful house spirit — Jira for home.

Hausgeist is a family operating system that manages tasks, inventory, documents, and more through a conversational AI interface (OpenClaw) with visual Kanban boards (Notion).

## What it does

- **Tasks & Chores** — Assign, track, and celebrate family tasks
- **Kids Inventory** — Track clothes, toys, gear lifecycle (have → outgrown → to-buy)
- **Documents** — Passports, visas, vaccinations with expiry reminders
- **Proactive AI** — Weekly suggestions, seasonal reminders, smart nudges

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      HAUSGEIST                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   NOTION (Data + Visual Boards)                         │
│   └── Items with type, status, owner, metadata          │
│   └── Filtered views = different boards                 │
│                                                         │
│   OPENCLAW (Brain + Conversation)                       │
│   └── WhatsApp/Telegram interface                       │
│   └── Rules engine for proactive suggestions            │
│   └── Weekly heartbeat summaries                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Model

Every item in Hausgeist follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | "Brush teeth", "Winter jacket", "Passport" |
| `type` | enum | `chore`, `inventory`, `document`, `meal` |
| `owner` | enum | Family member or "Family" |
| `status` | enum | Depends on type (see below) |
| `due_date` | date | When it's due/expiring |
| `metadata` | object | Type-specific: size, price, store, etc. |
| `created_at` | date | When item was added |
| `updated_at` | date | Last status change |

### Statuses by Type

| Type | Statuses |
|------|----------|
| `chore` | `todo` → `doing` → `done` |
| `inventory` | `have` → `outgrown` → `to-buy` → `bought` |
| `document` | `valid` → `expiring-soon` → `expired` → `renewed` |

## Boards (Views)

- **Ira's Tasks** — `type=chore, owner=Ira`
- **Today** — `due_date=today, status!=done`
- **Shopping List** — `type=inventory, status=to-buy`
- **Kids Clothes** — `type=inventory, category=clothes`
- **Documents** — `type=document`

## AI Rules (v0.1)

```yaml
rules:
  - name: "Shoes check"
    trigger: "type=inventory AND category=shoes AND age > 6 months"
    action: "Suggest size upgrade"

  - name: "Recurring chore missed"  
    trigger: "type=chore AND recurring=true AND last_done > 7 days"
    action: "Send reminder"

  - name: "Document expiring"
    trigger: "type=document AND expiry within 90 days"
    action: "Remind to renew"

  - name: "Birthday coming"
    trigger: "person.birthday within 30 days"
    action: "Suggest gift ideas"
```

## Setup

### 1. Notion Database

1. Duplicate the [Hausgeist Notion template](notion/TEMPLATE.md)
2. Get your Notion API key
3. Share the database with your integration

### 2. OpenClaw

1. Install OpenClaw: `npm i -g openclaw`
2. Run onboarding: `openclaw onboard`
3. Copy skills to your OpenClaw skills folder
4. Configure Notion credentials

### 3. Connect Messaging

Connect OpenClaw to WhatsApp, Telegram, or your preferred chat app.

## Project Structure

```
hausgeist/
├── README.md
├── config/
│   └── rules.yaml          # AI rules for suggestions
├── docs/
│   └── ROADMAP.md          # What's planned
├── notion/
│   └── TEMPLATE.md         # Notion database setup guide
├── skills/
│   ├── tasks/              # Chore management skill
│   └── inventory/          # Inventory tracking skill
└── .env.example            # Environment variables template
```

## Roadmap

- [x] v0.1 — Notion + OpenClaw + Tasks
- [ ] v0.2 — Inventory tracking
- [ ] v0.3 — Documents & reminders  
- [ ] v0.4 — External APIs (weather, events, prices)
- [ ] v0.5 — Custom kid-friendly web UI

## License

MIT

---

*Built with 👻 for families who want their house spirit to handle the boring stuff.*
