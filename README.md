# Tradeify 📊

A comprehensive trading journal, analytics, and portfolio management application built for traders who take their psychology and performance seriously.

> Track trades, journal your emotions, analyze performance, set goals, and build better trading habits — all in one place.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Integrations](#integrations)
- [Design System](#design-system)

---

## Features

### 🏠 Home & Challenge Management
- **Multi-challenge system** — Create named trading challenges (prop firm accounts, personal accounts) with opening balance and optional daily loss limit
- **Challenge lifecycle** — Active → Completed (with confetti celebration) or Archived (breached)
- **Real-time balance tracking** — `currentBalance = openingBalance + totalPnL` with total fees calculated per challenge
- **Undo delete** — 10-second undo window on challenge/trade/journal deletion
- **TOTP-protected actions** — Destructive operations like complete, archive, and delete require 2FA verification

### 📈 Trade Management
- **Comprehensive trade fields** — Date, pair/symbol, direction (Buy/Sell), entry/exit/SL prices, lot size, fees, P&L, emotion (10 types), strategy, 1–5 star rating, notes, screenshot
- **Screenshot upload** — Google Drive integration with instant local preview and async upload
- **10 emotion states** — Calm, Confident, Neutral, Excited, Anxious, Fearful, Greedy, Frustrated, FOMO, Overconfident — each with detailed psychological descriptions
- **R:R calculation** — Risk:Reward auto-computed from entry/exit/SL prices
- **MFE/MAE tracking** — Max Favorable Excursion and Max Adverse Excursion fields
- **Responsive display** — Mobile card view + desktop table view with filtering (date range, direction, profit/loss/breakeven)

### 📅 Calendar View
- Monthly calendar grid showing trades per day with color-coded P&L
- Click-to-add trades or journals on any day
- **Keyboard shortcuts** — `N` = new trade, `J` = new journal
- **Trading rules enforcement** — Warnings for max trades/day, max loss/day, consecutive loss limits (configurable, non-blocking)

### 📓 Journal System
- **5 entry types** — Pre-market 🌅, Post-market 🌆, Weekly Review 📋, Lesson 💡, General 📝
- Full emotion tagging and Google Drive screenshot support
- Screenshot-only entries supported (no text required)
- Filterable by date range, entry type, and emotion

### 📊 Analytics Dashboard
- **14+ stat cards** — Opening balance, current balance, performance %, total P&L, win rate, winning/losing/breakeven trade counts, profit factor, expectancy, current streak, best/worst streaks
- **Charts** (Recharts):
  - Balance Progression line chart
  - Daily P&L bar chart
  - Cumulative Fees chart
- **Day of Week Performance** — Mon–Fri heatmap with average P&L per weekday
- **Pair Analytics** — Win rate, total P&L, and trade count per instrument
- **Emotion Breakdown** — Win rate and P&L per emotion state
- **Trading Heatmap** — GitHub-style contribution grid (Mon–Fri), color-coded by profit/loss intensity
- **Date range & direction filters** with CSV/JSON export
- **Active Goals Progress** — Progress bars for active goals with percentage tracking
- **Motivational Quotes** — Random trading quotes with auto-rotate every 10 seconds

### 🤖 AI Coaching & Trade Analysis
- **Rule-based Trade Coach** — Analyzes trades and generates up to 6 prioritized insights:
  - Win rate assessment, R:R quality, fee drag analysis
  - Emotion-correlated performance (worst/best emotion states, danger emotions)
  - Pair-level performance, direction bias detection
  - Overtrading pattern detection, daily consistency assessment
- **AI Coaching Report** (Groq/Llama 3):
  - Multiple API key rotation with fallback across models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)
  - Customizable prompt template (stored in Firebase)
  - Response caching with trade hash invalidation
  - **Text-to-speech** — Web Speech API reads reports aloud

### ⏰ Kill Zone Trading Sessions
- **Session definitions** — Asia, London, New York, London Close (fully customizable times)
- **Multi-channel alerts** — Toast notification + browser push + Telegram notification when entering a kill zone
- **Active zone monitoring** — Checks every 60 seconds with alert deduplication
- **Floating countdown widget** — Shows "LIVE" with remaining time or countdown to next zone
- **Overnight zone support** — Handles zones crossing midnight

### 🎯 Goals & Achievements
- **Goal types** — Profit target, trade count, win rate with date range constraints
- **Quick ranges** — This Week, This Month, custom range
- **Progress tracking** — Percentage bars, completion celebration, browser + Telegram notifications
- **27 Achievement badges** across 4 tiers (💎 Diamond, 🥇 Gold, 🥈 Silver, 🥉 Bronze):
  - Milestone (1–500 trades), Streak (3–10 wins), Profit (green day → 3 green months)
  - Win rate (60%+ → 70%+), Psychology (10–50 calm trades), Diversity (5–10 pairs)
  - Consistency (10–100 trading days), App usage (Journaler, Note Taker, Multi Account)
  - Recovery (Comeback Kid), Screenshot Master

### 📤 Reporting & Sharing
- **Telegram Report Generator** — Date-range filtered, comprehensive HTML report with P&L breakdown, performance metrics, daily stats, direction breakdown, top pairs, emotion breakdown, streaks, max drawdown
- **Auto Weekly Reports** — Scheduler checks every 30 min; sends last week's Mon–Sun report via Telegram (deduplicated per week)
- **Share Card** — Beautiful visual card (html2canvas) showing net profit, trades, win rate, best trade — downloadable or shareable via Web Share API

### ✅ Checklists
- **Hierarchical items** with sections and child items
- **Multiple item types** — Checkbox, radio (pill buttons), text input, dropdown
- **Section headers** with emoji icons and time ranges
- Inline editing, reorder (up/down), duplicate/copy
- **Template system** — Pre-built CRT Daily Checklist template
- **PDF export** via jsPDF

### 📝 Notes & Links
- **Notes** — CRUD with title + content, search by title, grid card layout, view modal
- **Links** — CRUD with title + URL, external link opening, grid cards
- Both protected by TOTP verification for edit/delete

### 🧮 Risk Calculator
- **Multi-instrument** — Forex pairs (EUR/USD, GBP/USD, etc.) and Metals (Gold XAU, Silver XAG)
- **Inputs** — Account size, risk %, stop loss (pips or price distance)
- **Quick presets** — Pre-defined account sizes and risk percentages
- **Results** — Lot size, risk amount, units, pip value, max loss
- **Lot breakdown** — Standard/mini/micro lot counts
- **Reward targets** — 1R through 5R projections
- **High risk warning** — Visual alert when risk > 2%
- **Favorite instruments** — Persisted in localStorage

### 🌍 World Clock & Time Tools
- **Time Converter** — Select time + source timezone → converted times across 8 major trading timezones (India, New York, London, Tokyo, Dubai, Sydney, Paris, Singapore) with day difference indicators
- **Custom Time Wheel Picker** — Scrollable wheel picker for time selection
- **Live World Clocks** — Real-time clocks for major trading centers

### 🖼️ Trading Model Reference
- Upload trading model/setup image to Google Drive (max 10MB)
- Fullscreen view with zoom
- Replace/Delete with TOTP verification
- Token refresh retry with re-auth flow on expiry

### 🔔 Reminders (Google Calendar)
- Full Google Calendar integration — fetch upcoming events (3 months), create/edit/delete events
- Quick add from Navbar dropdown
- Past event dimming for visual clarity

### 🔐 Authentication & Security
- **Google OAuth** via Firebase Auth with Google Drive + Calendar scopes
- **TOTP/2FA** — Optional enrollment via QR code, 6-digit codes with 30-sec period, ±1 window tolerance
- **Protected actions** — Trade/journal edit/delete, challenge lifecycle, notes/links edit/delete, sign out, model deletion

### 💬 Telegram Integration
- Bot configuration with token + chat ID (stored in Firebase)
- Enable/disable toggle with test connection
- Used for: Kill zone alerts, goal completion notifications, trading reports, weekly auto-reports

### ☁️ Google Drive Integration
- **Screenshots** — Upload to "Tradeify Screenshots" folder, public read permissions, thumbnail URLs
- **Backups** — Full data backup to "Tradeify Backups" folder (challenges, notes, links, checklists, kill zones, goals, trading rules), auto-deletes old backups
- **Auth recovery** — Automatic re-auth prompt when token expires (user-gesture triggered)

### 💱 Multi-Currency Support
- **10 currencies** — USD, INR, EUR, GBP, JPY, AUD, CAD, CHF, SGD, AED
- **Live exchange rates** — Fetched from exchangerate-api.com, cached 24h in localStorage
- Formatted display helpers throughout the app

### 🎨 UI/UX & Platform
- **Dark/Light theme** with customizable primary/secondary colors via HSL pickers
- **Responsive design** — Mobile-first with card views (mobile) and table views (desktop)
- **PWA support** — Install prompt, service worker, offline-capable manifest
- **Navigation** — Desktop horizontal nav with challenge switcher + tools dropdown; mobile compact nav with overflow scroll
- **Toast notifications** via Sonner
- **Trading psychology-focused design** — Calm green for profit, warm coral for loss, calm blue for breakeven

---

## Tech Stack

| Category | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + Shadcn UI (Radix primitives) |
| **Backend** | Firebase (Auth, Realtime Database) |
| **Routing** | React Router v6 |
| **Data Fetching** | TanStack React Query |
| **Forms** | react-hook-form + Zod validation |
| **Charts** | Recharts |
| **PDF** | jsPDF |
| **Screenshots** | html2canvas |
| **2FA** | otpauth |
| **Icons** | Lucide React |
| **Date Utils** | date-fns |
| **Toasts** | Sonner |

---

## Getting Started

### Prerequisites
- Node.js 18+ (or Bun)
- Firebase project with Auth + Realtime Database enabled
- Google Cloud project with Drive API + Calendar API enabled

### Installation

```bash
# Clone the repo
git clone <YOUR_GIT_URL>
cd fresh-start-project

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
```

### Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Environment Setup
Firebase configuration is in `src/lib/firebase.ts`. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed setup instructions.

---

## Project Structure

```
src/
├── components/           # Custom components
│   ├── ui/              # Shadcn UI primitives (do not edit directly)
│   ├── Css/             # Component-specific CSS
│   ├── Navbar.tsx       # Main navigation bar
│   ├── AddTradeModal.tsx      # Trade entry form
│   ├── AddJournalModal.tsx    # Journal entry form
│   ├── ReportGenerator.tsx    # Telegram report builder
│   ├── ShareCard.tsx          # Visual share card
│   ├── TradingHeatmap.tsx     # GitHub-style heatmap
│   ├── StatsCard.tsx          # Stat display card
│   ├── PerformanceCard.tsx    # Performance metric card
│   ├── AchievementBadges.tsx  # Achievement system
│   ├── DriveImage.tsx         # Google Drive image loader
│   ├── KillZoneConfig.tsx     # Kill zone settings
│   ├── KillZoneAlertProvider.tsx  # Kill zone notifications
│   ├── KillZoneCountdown.tsx  # Floating countdown widget
│   ├── WeeklyReportScheduler.tsx  # Auto weekly reports
│   ├── TimeConverter.tsx      # Timezone converter
│   ├── WorldClocks.tsx        # Live clocks display
│   ├── TradingQuotes.tsx      # Motivational quotes
│   ├── ChecklistForm.tsx      # Checklist builder
│   └── ...
├── contexts/
│   ├── DataContext.tsx   # Central data management (Firebase CRUD)
│   └── ChallengeContext.tsx  # Challenge state & switching
├── hooks/
│   ├── useAuth.ts        # Google OAuth + token management
│   ├── useCurrency.ts    # Multi-currency formatting
│   ├── useGeminiAnalysis.ts  # AI coaching (Groq/Llama)
│   ├── useKillZones.ts   # Kill zone session logic
│   ├── useTotpVerification.ts  # 2FA verification flow
│   ├── useTradingRules.ts     # Trading rule enforcement
│   └── use-mobile.tsx    # Mobile detection
├── lib/
│   ├── firebase.ts       # Firebase config & initialization
│   ├── googleDrive.ts    # Drive API (upload, delete, URLs)
│   ├── backup.ts         # Full data backup to Drive
│   ├── telegram.ts       # Telegram bot integration
│   ├── tradeAnalyzer.ts  # Rule-based trade analysis
│   ├── weeklyReport.ts   # Weekly report generation
│   ├── totp.ts           # TOTP 2FA implementation
│   ├── imageCache.ts     # In-memory blob URL cache
│   ├── exportChecklistPdf.ts  # Checklist PDF export
│   └── utils.ts          # Utility helpers (cn, etc.)
├── pages/
│   ├── Auth.tsx          # Login page (Google OAuth)
│   ├── Home.tsx          # Challenge management hub
│   ├── Index.tsx         # Calendar view
│   ├── Dashboard.tsx     # Analytics & stats
│   ├── TradeList.tsx     # Trade history table/cards
│   ├── JournalList.tsx   # Journal entries
│   ├── Notes.tsx         # Notes management
│   ├── Links.tsx         # Links management
│   ├── Checklists.tsx    # Checklist builder & viewer
│   ├── Goals.tsx         # Goals & achievements
│   ├── Profile.tsx       # Settings & configuration
│   ├── WorldClock.tsx    # World clock & time tools
│   ├── Model.tsx         # Trading model reference
│   ├── Reminders.tsx     # Google Calendar reminders
│   ├── RiskCalculator.tsx  # Position size calculator
│   └── NotFound.tsx      # 404 page
├── types/
│   ├── trade.ts          # Trade, Journal, DayData types
│   └── checklist.ts      # Checklist types
└── data/
    ├── checklistTemplates.ts  # Pre-built checklist templates
    └── tradingQuotes.ts       # Motivational trading quotes
```

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Auth | Google sign-in page |
| `/home` | Home | Challenge management & selection |
| `/calendar` | Index | Monthly calendar with trades/journals |
| `/dashboard` | Dashboard | Analytics, charts, stats, heatmap |
| `/trades` | TradeList | Trade history with filters |
| `/journals` | JournalList | Journal entries with filters |
| `/notes` | Notes | Personal notes |
| `/links` | Links | Saved links/resources |
| `/checklists` | Checklists | Trading checklists |
| `/goals` | Goals | Goals & achievement badges |
| `/profile` | Profile | Settings, Telegram, kill zones, backup, theme |
| `/world-clock` | WorldClock | Time converter & live clocks |
| `/model` | Model | Trading model reference image |
| `/reminders` | Reminders | Google Calendar events |
| `/risk-calculator` | RiskCalculator | Position size calculator |

---

## Integrations

### Firebase
- **Authentication** — Google OAuth provider
- **Realtime Database** — All user data (challenges, trades, journals, notes, links, checklists, goals, settings, trading rules, kill zones, TOTP secrets)

### Google Drive API
- Screenshot storage for trades, journals, and model image
- Full data backup/restore
- Scoped to `drive.file` permission

### Google Calendar API
- Read/create/edit/delete calendar events as reminders
- Scoped to `calendar.events` permission

### Telegram Bot API
- Trading reports, kill zone alerts, goal notifications, weekly auto-reports
- User-configured bot token + chat ID

### Groq AI API (Llama 3)
- AI-powered trading coaching reports
- Multi-key rotation with model fallback
- Response caching with hash-based invalidation

### Exchange Rate API
- Live currency conversion rates
- 24-hour cache in localStorage

---

## Design System

### Color Philosophy (Trading Psychology Focused)
- **Profit** — Calm green (`text-profit`) — encouraging but not overstimulating
- **Loss** — Warm coral (`text-loss/80`) — acknowledging but not punishing
- **Breakeven** — Calm blue (`text-breakeven`) — a win for risk management

### Typography
- **Text** — Inter (system fallback)
- **Numbers** — JetBrains Mono (monospace)
- **Headings** — `text-2xl sm:text-3xl font-bold`

### Component Patterns
- Cards: `bg-card/80 backdrop-blur-sm border-border/50`
- Stats: `StatsCard` with `variant="profit" | "loss" | "breakeven" | "neutral"`
- Page containers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`

---

## License

Private project. All rights reserved.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/662624a7-6346-47ac-94d9-de1727187884) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
