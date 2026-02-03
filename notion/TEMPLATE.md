# Notion Database Setup

## Step 1: Create the Database

Create a new Notion database called "Hausgeist" with these properties:

### Properties

| Property | Type | Options/Notes |
|----------|------|---------------|
| **Title** | Title | The item name |
| **Type** | Select | `chore`, `inventory`, `document` |
| **Status** | Select | See status options below |
| **Owner** | Select | Your family members + "Family" |
| **Due Date** | Date | Optional, for deadlines/expiries |
| **Category** | Select | `clothes`, `shoes`, `toys`, `gear`, `passport`, `visa`, etc. |
| **Size** | Text | For clothes/shoes: "104", "26", etc. |
| **Points** | Number | Reward points for chores |
| **Recurring** | Checkbox | For repeating chores |
| **Frequency** | Select | `daily`, `weekly`, `monthly` (if recurring) |
| **Price** | Number | Purchase price |
| **Store** | Text | Where you bought it |
| **Notes** | Text | Any additional info |
| **Created** | Created time | Automatic |
| **Updated** | Last edited time | Automatic |

### Status Options

Add all these to the Status property:

**For chores:**
- `todo` (gray)
- `doing` (blue)
- `done` (green)

**For inventory:**
- `have` (green)
- `outgrown` (yellow)
- `broken` (red)
- `to-buy` (purple)
- `bought` (green)

**For documents:**
- `valid` (green)
- `expiring-soon` (yellow)
- `expired` (red)
- `renewed` (green)

---

## Step 2: Create Views (Boards)

### View 1: All Tasks Board
- Filter: `Type = chore`
- Layout: Board
- Group by: Status
- Sort: Due Date (ascending)

### View 2: [Child Name]'s Tasks
- Filter: `Type = chore` AND `Owner = [Child]`
- Layout: Board
- Group by: Status

### View 3: Today
- Filter: `Due Date = Today` AND `Status ≠ done`
- Layout: List

### View 4: Shopping List
- Filter: `Status = to-buy`
- Layout: List
- Sort: Category

### View 5: Kids Inventory
- Filter: `Type = inventory`
- Layout: Board
- Group by: Status

### View 6: [Child Name]'s Clothes
- Filter: `Type = inventory` AND `Owner = [Child]` AND `Category = clothes`
- Layout: Gallery (see the items visually)

### View 7: Documents
- Filter: `Type = document`
- Layout: Table
- Sort: Due Date (ascending)

---

## Step 3: Notion API Setup

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Hausgeist"
4. Select your workspace
5. Copy the "Internal Integration Token"
6. Go to your Hausgeist database
7. Click ••• → "Add connections" → Select "Hausgeist"
8. Copy the database ID from the URL:
   ```
   notion.so/[workspace]/[DATABASE_ID]?v=...
                         ^^^^^^^^^^^^
   ```

Save these for OpenClaw configuration:
- `NOTION_API_KEY`: Your integration token
- `NOTION_DATABASE_ID`: The database ID

---

## Step 4: Add Sample Data

Add a few test items to verify everything works:

**Chores:**
| Title | Type | Status | Owner | Recurring |
|-------|------|--------|-------|-----------|
| Brush teeth (morning) | chore | todo | Ira | ✓ |
| Tidy toys | chore | todo | Ira | ✓ |
| Help set table | chore | todo | Ira | ✓ |

**Inventory:**
| Title | Type | Status | Owner | Size | Category |
|-------|------|--------|-------|------|----------|
| Winter jacket | inventory | have | Ira | 104 | clothes |
| Sneakers | inventory | have | Ira | 26 | shoes |
| Wooden blocks | inventory | have | Ira | - | toys |

**Documents:**
| Title | Type | Status | Owner | Due Date |
|-------|------|--------|-------|----------|
| Ira's passport | document | valid | Ira | 2028-05-15 |

---

## Done!

Your Notion backend is ready. Next: set up the OpenClaw skill to interact with it.
