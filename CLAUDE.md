# Tradeify

A trading journal and portfolio management application.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI (Radix primitives)
- **Backend**: Firebase (Auth, Realtime Database)
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query
- **Forms**: react-hook-form + Zod validation
- **Charts**: Recharts
- **PDF**: jsPDF
- **Screenshots**: html2canvas
- **2FA**: otpauth
- **Icons**: Lucide React
- **Date Utils**: date-fns
- **Toasts**: Sonner

## Project Structure

```
src/
├── components/       # Custom components
│   ├── ui/          # Shadcn UI primitives (do not edit directly)
│   └── Css/         # Component-specific CSS
├── contexts/        # React contexts (DataContext, ChallengeContext)
├── hooks/           # Custom hooks (useAuth, useCurrency, useGeminiAnalysis, useKillZones, useTotpVerification, useTradingRules)
├── lib/             # Utilities (firebase, googleDrive, backup, telegram, tradeAnalyzer, weeklyReport, totp, imageCache, exportChecklistPdf, utils)
├── pages/           # Route pages (15 pages)
├── types/           # TypeScript types (trade.ts, checklist.ts)
└── data/            # Static data (checklistTemplates, tradingQuotes)
```

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Routes

| Route | Page | Description |
|---|---|---|
| `/` | Auth | Google sign-in |
| `/home` | Home | Challenge management & selection |
| `/calendar` | Index | Monthly calendar with trades/journals |
| `/dashboard` | Dashboard | Analytics, charts, stats, heatmap |
| `/trades` | TradeList | Trade history with filters |
| `/journals` | JournalList | Journal entries |
| `/notes` | Notes | Personal notes |
| `/links` | Links | Saved links/resources |
| `/checklists` | Checklists | Trading checklists |
| `/goals` | Goals | Goals & achievement badges |
| `/profile` | Profile | Settings, Telegram, kill zones, backup, theme |
| `/world-clock` | WorldClock | Time converter & live clocks |
| `/model` | Model | Trading model reference image |
| `/reminders` | Reminders | Google Calendar events |
| `/risk-calculator` | RiskCalculator | Position size calculator |

## Feature Reference

### Challenge System (Home.tsx, ChallengeContext.tsx)
- Multi-challenge: named challenges with opening balance + optional daily loss limit
- Lifecycle: Active → Completed (confetti) or Archived (breached)
- Balance: `currentBalance = openingBalance + totalPnL`
- Challenge persisted in localStorage, auto-redirect to /home when none selected
- Undo delete with 10-sec window; TOTP-protected destructive actions

### Trade Management (AddTradeModal.tsx, TradeList.tsx, Index.tsx)
- Fields: date, pair, direction, entry/exit/SL, lot size, fees, P&L, emotion (10 types), strategy, rating (1-5), notes, screenshot
- Google Drive screenshot upload with instant preview + async upload
- MFE/MAE tracking, auto R:R calc from prices
- Mobile card view + desktop table view; date range / direction / P&L filters
- Calendar: monthly grid, color-coded days, keyboard shortcuts (N=trade, J=journal)

### Journal System (AddJournalModal.tsx, JournalList.tsx)
- Entry types: Pre-market, Post-market, Weekly Review, Lesson, General
- Emotion tagging, screenshot support, screenshot-only entries
- Filterable by date range, entry type, emotion

### Analytics Dashboard (Dashboard.tsx, TradingHeatmap.tsx, StatsCard.tsx, PerformanceCard.tsx)
- 14+ stat cards: balance, performance %, P&L, win rate, profit factor, expectancy, streaks
- Charts: Balance Progression, Daily P&L, Cumulative Fees
- Day of Week Performance heatmap, Pair Analytics, Emotion Breakdown
- GitHub-style Trading Heatmap (Mon-Fri, color-coded intensity)
- CSV/JSON export, date/direction/P&L filters
- Active goals progress bars, motivational quotes (auto-rotate 10s)

### AI Coaching (useGeminiAnalysis.ts, tradeAnalyzer.ts)
- Rule-based analyzer: win rate, R:R quality, fee drag, emotion correlation, pair performance, direction bias, overtrading detection, daily consistency
- AI report via Groq/Llama 3: multi-key rotation, model fallback (llama-3.3-70b-versatile, llama-3.1-8b-instant)
- Customizable prompt template (Firebase), response caching with trade hash invalidation
- Text-to-speech via Web Speech API

### Trading Rules (useTradingRules.ts)
- Configurable: max trades/day, max loss/day ($), stop after N consecutive losses
- Real-time enforcement as warnings (non-blocking) when adding trades
- Firebase-persisted per user

### Kill Zones (useKillZones.ts, KillZoneConfig.tsx, KillZoneAlertProvider.tsx, KillZoneCountdown.tsx)
- Sessions: Asia, London, New York, London Close (customizable times)
- Alerts: toast + browser push + Telegram on zone entry; checks every 60s with dedup
- Floating countdown widget: "LIVE" with remaining time or countdown to next zone
- Overnight zone support

### Goals & Achievements (Goals.tsx, AchievementBadges.tsx)
- Goal types: profit target, trade count, win rate with date ranges
- 27 badges across 4 tiers (diamond, gold, silver, bronze)
- Categories: Milestone, Streak, Profit, Win rate, Psychology, Diversity, Consistency, App usage, Recovery, Screenshot Master
- Browser + Telegram notification on goal completion

### Reporting (ReportGenerator.tsx, ShareCard.tsx, weeklyReport.ts, WeeklyReportScheduler.tsx)
- Telegram Report Generator: date-range filtered HTML report with full breakdown
- Auto Weekly Reports: scheduler every 30 min, Mon-Sun report via Telegram (deduplicated)
- Share Card: visual card via html2canvas, downloadable or Web Share API

### Checklists (Checklists.tsx, checklistTemplates.ts, checklist.ts)
- Hierarchical items with sections + children
- Item types: checkbox, radio (pills), text input, dropdown
- Inline editing, reorder, duplicate/copy
- CRT Daily Checklist template; PDF export via jsPDF

### Notes & Links (Notes.tsx, Links.tsx)
- Notes: CRUD, title + content, search, grid cards, view modal
- Links: CRUD, title + URL, external open, grid cards
- Both TOTP-protected for edit/delete

### Risk Calculator (RiskCalculator.tsx)
- Forex pairs + Metals (XAU, XAG)
- Inputs: account size, risk %, stop loss (pips/price)
- Results: lot size, risk amount, units, pip value, max loss
- Lot breakdown (standard/mini/micro), 1R-5R projections
- High risk warning (>2%), favorite instruments (localStorage)

### World Clock & Time (WorldClock.tsx, TimeConverter.tsx, WorldClocks.tsx, TimeWheelPicker.tsx)
- Time converter: 8 trading timezones with day difference indicators
- Custom scrollable wheel time picker
- Live clocks for major trading centers

### Model (Model.tsx, DriveImage.tsx)
- Upload model image to Google Drive (max 10MB)
- Fullscreen view, replace/delete with TOTP
- DriveImage component: auth-aware image loader with "Reconnect Google Drive" button on token expiry, retry on errors, in-memory blob cache

### Reminders (Reminders.tsx)
- Google Calendar integration: fetch/create/edit/delete events
- Quick add from Navbar, past event dimming

### Auth & Security (useAuth.ts, useTotpVerification.ts, totp.ts, Auth.tsx)
- Google OAuth via Firebase with Drive + Calendar scopes
- Access token stored in sessionStorage, validated via tokeninfo API
- Token refresh via signInWithPopup (requires user gesture)
- TOTP/2FA: optional enrollment via QR, 6-digit codes, 30-sec period, ±1 window
- Protected actions: trade/journal CRUD, challenge lifecycle, notes/links, sign out, model deletion

### Telegram (telegram.ts)
- Bot token + chat ID config (Firebase-stored)
- Enable/disable toggle with test connection
- Used for: kill zone alerts, goal notifications, reports, weekly auto-reports

### Google Drive (googleDrive.ts, backup.ts, imageCache.ts)
- Screenshots: "Tradeify Screenshots" folder, public read, thumbnail URLs
- Backups: "Tradeify Backups" folder, auto-deletes old backups
- imageCache: global in-memory Map of fileId → blob URL, prevents re-fetching

### Multi-Currency (useCurrency.ts)
- 10 currencies: USD, INR, EUR, GBP, JPY, AUD, CAD, CHF, SGD, AED
- Exchange rates from exchangerate-api.com, 24h localStorage cache
- `fmt()` and `fmtSigned()` helpers for formatted display

## Code Conventions

- Use `@/` path alias for imports from `src/`
- Use Shadcn UI components from `@/components/ui/` for consistency
- Forms use react-hook-form with Zod schemas
- Data is managed through Firebase + DataContext
- Use `sonner` for toast notifications
- Use `date-fns` for date formatting
- Use `lucide-react` for icons

## Design System - Trading Psychology Focused

### Color Philosophy
- **Profit colors**: Calm green (`text-profit`) - encouraging but not overstimulating
- **Loss colors**: Warm coral (`text-loss/80`) - acknowledging but not punishing
- **Breakeven**: Calm blue (`text-breakeven`) - a win for risk management

### Consistent Spacing
- Page containers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`
- Card grids: `gap-4 sm:gap-6`
- Sections: `mb-6 sm:mb-8`

### Component Patterns
- Cards: `bg-card/80 backdrop-blur-sm border-border/50`
- Buttons: Use `variant="default"` for primary actions
- Stats: Use `StatsCard` with `variant="profit"`, `"loss"`, `"breakeven"`, or `"neutral"`

### Typography
- Font: Inter (system fallback)
- Mono: JetBrains Mono for numbers
- Headings: `text-2xl sm:text-3xl font-bold`
- Subtitles: `text-muted-foreground text-sm`

## Key Data Types

### Trade
- `id, date, pair, entryPrice, exitPrice, slPrice, lotSize, fees, direction, profit, emotion, strategy, rating, notes, screenshotUrl, screenshotFileId, mfe, mae, createdAt`

### Journal
- `id, date, notes, emotion, entryType, screenshotUrl, screenshotFileId, createdAt`

### Checklist
- `id, title, items (ChecklistItem[]), createdAt, updatedAt`
- ChecklistItem: `id, text, completed, children, type (checkbox|text|dropdown|radio), options, value`

### Emotions (10)
- Calm, Confident, Neutral, Excited, Anxious, Fearful, Greedy, Frustrated, FOMO, Overconfident

### Journal Entry Types (5)
- Pre-market, Post-market, Weekly Review, Lesson, General

