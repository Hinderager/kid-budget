# Personal Budget App - Development Plan

## Overview

A family personal budgeting web app that tracks expenses across 9 categories with CSV import, AI auto-categorization, and budget tracking.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (misc project) |
| Deployment | Vercel (linked to GitHub) |
| AI Categorization | Claude API |
| Charts | Recharts |
| Authentication | None |

---

## Repository

- **Name:** Personal-Budget
- **GitHub:** To be created
- **Vercel:** Linked to GitHub for auto-deployment

---

## Database Schema (Supabase)

### Tables

#### `budget_transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| transaction_id | text (unique) | For deduplication |
| date | date | Transaction date |
| description | text | Merchant/description |
| amount | decimal | Transaction amount |
| category_id | uuid (FK) | Reference to categories |
| ignored | boolean | Default false |
| created_at | timestamp | Auto-generated |

#### `budget_categories`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Category name |
| subcategories | text[] | Array of subcategory names |
| color | text | Hex color for charts |
| icon | text | Icon identifier |
| sort_order | int | Display order |

#### `budget_category_rules`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| match_pattern | text | Merchant name/pattern to match |
| category_id | uuid (FK) | Category to assign |
| created_at | timestamp | Auto-generated |

#### `budget_import_history`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| filename | text | Original filename |
| file_hash | text | MD5 hash to prevent re-imports |
| transactions_imported | int | Count of new transactions |
| duplicates_skipped | int | Count of duplicates |
| imported_at | timestamp | Auto-generated |

#### `budget_monthly_budgets`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| month | date | First of month (e.g., 2025-01-01) |
| category_id | uuid (FK) | Reference to categories |
| budget_amount | decimal | Budgeted amount |

#### `budget_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | text (unique) | Setting identifier |
| value | jsonb | Setting value |

**Settings Keys:**
- `monthly_pool` → `{ "amount": 5000 }`
- `default_budgets` → `{ "category_id": amount, ... }`

---

## Categories (Pre-seeded)

| # | Name | Color | Subcategories |
|---|------|-------|---------------|
| 1 | Housing | #3B82F6 (blue) | Rent/mortgage, insurance, property tax, maintenance, HOA |
| 2 | Utilities & Communication | #06B6D4 (cyan) | Electric, gas, water, trash, internet, cell phones, streaming |
| 3 | Food | #22C55E (green) | Groceries, dining out, coffee, school lunches |
| 4 | Transportation | #F97316 (orange) | Car payments, fuel, insurance, maintenance, parking |
| 5 | Insurance & Healthcare | #EF4444 (red) | Health, dental, vision, prescriptions, medical bills |
| 6 | Child & Family | #EC4899 (pink) | Childcare, school, activities, sports, babysitting |
| 7 | Debt Payments | #8B5CF6 (purple) | Credit cards, student loans, personal loans |
| 8 | Personal & Discretionary | #EAB308 (yellow) | Clothing, grooming, hobbies, entertainment, gifts |
| 9 | Miscellaneous | #6B7280 (gray) | Irregular expenses, surprises, one-offs |

---

## Pages Structure

```
/app
├── / (dashboard)
│   ├── Monthly pool remaining
│   ├── Category budget progress bars
│   ├── Quick stats (total spent, days left in month)
│   └── Recent transactions
│
├── /ledger
│   ├── All transactions table
│   ├── Category dropdown per row
│   ├── "Always categorize as..." option
│   ├── Ignore toggle
│   ├── Filters (date, category, search)
│   └── Bulk actions
│
├── /import
│   ├── Drag & drop zone
│   ├── CSV preview
│   ├── Column mapping
│   └── Import results summary
│
├── /analytics
│   ├── Category breakdown (pie chart)
│   ├── Monthly trend (line chart)
│   ├── Category trends (stacked bar)
│   ├── Top merchants (bar chart)
│   ├── Budget vs actual (bar chart)
│   └── Daily spending (heat map/calendar)
│
└── /settings
    ├── Monthly pool amount
    ├── Default category budgets
    ├── Category rules management
    └── Import history
```

---

## Features

### CSV Import
- Drag & drop interface
- Auto-detect CSV format (different banks)
- Preview before import
- Deduplication by transaction_id
- Show import summary (X new, Y duplicates skipped)

### Transaction Ledger
- Sortable/filterable table
- Category dropdown with all 9 options
- "Always use this category for [merchant]" checkbox
- Ignore toggle for transfers/irrelevant items
- Search by description
- Bulk categorize/ignore

### Budget Tracking
- Set monthly money pool (total available)
- Allocate budget per category
- Visual progress bars (green → yellow → red)
- Warning when category exceeds budget
- Show remaining balance (pool - spent)

### AI Auto-Categorization
1. New transaction imported
2. Check category_rules for matching pattern
3. If no rule → call Claude API
4. Claude suggests category
5. User can override and create rule

### Analytics
- Category spending pie chart
- Month-over-month total spending line chart
- Category trends stacked bar chart
- Top merchants bar chart
- Budget vs actual comparison
- Daily spending calendar/heat map

---

## Implementation Phases

### Phase 1: Setup ✅
- [ ] Create GitHub repo "Personal-Budget"
- [ ] Initialize Next.js 14 project
- [ ] Add Tailwind CSS + shadcn/ui
- [ ] Create Supabase tables
- [ ] Deploy to Vercel

### Phase 2: Core UI
- [ ] App layout with navigation
- [ ] Dashboard page skeleton
- [ ] Ledger page skeleton
- [ ] Import page skeleton
- [ ] Analytics page skeleton
- [ ] Settings page skeleton

### Phase 3: Database & Seeding
- [ ] Supabase client setup
- [ ] Seed categories
- [ ] Create API routes

### Phase 4: CSV Import
- [ ] Drag & drop component
- [ ] CSV parsing logic
- [ ] Deduplication logic
- [ ] Import preview
- [ ] Save to database

### Phase 5: Transaction Ledger
- [ ] Fetch and display transactions
- [ ] Category dropdown
- [ ] Create category rules
- [ ] Ignore functionality
- [ ] Filters and search

### Phase 6: Budget Management
- [ ] Monthly pool setting
- [ ] Category budget allocation
- [ ] Progress bar components
- [ ] Budget vs actual calculation

### Phase 7: AI Categorization
- [ ] Claude API integration
- [ ] Auto-categorize on import
- [ ] Suggest category for uncategorized

### Phase 8: Analytics
- [ ] Install Recharts
- [ ] Category pie chart
- [ ] Monthly trend line chart
- [ ] Category stacked bar chart
- [ ] Budget vs actual chart

### Phase 9: Polish
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] Edge cases

---

## Dashboard Wireframe

```
┌─────────────────────────────────────────────────────┐
│  January 2025                        Pool: $5,000   │
│  ═══════════════════════════════════════════════    │
│  Spent: $3,247    Remaining: $1,753    18 days left │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Housing         ████████████░░░░  $1,200 / $1,500  │
│  Food            ██████████████░░  $720 / $800      │
│  Transportation  ████████░░░░░░░░  $340 / $600      │
│  Utilities       ██████████████████ $312 / $300 ⚠️  │
│  ...                                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Recent Transactions                    [View All]  │
│  ───────────────────────────────────────────────    │
│  Jan 23  KROGER #1234           Food       -$87.43  │
│  Jan 22  SHELL GAS              Transport  -$45.00  │
│  Jan 22  NETFLIX               Utilities   -$15.99  │
└─────────────────────────────────────────────────────┘
```

---

## Notes

- No authentication required
- Expenses only (no income tracking)
- No need to track which account/card
- 9 categories (Savings & Investments excluded)
