# Tradeify

A trading journal and portfolio management application.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI (Radix primitives)
- **Backend**: Firebase (Auth, Firestore)
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query
- **Forms**: react-hook-form + Zod validation
- **Charts**: Recharts

## Project Structure

```
src/
├── components/       # Custom components
│   └── ui/          # Shadcn UI primitives (do not edit directly)
├── contexts/        # React contexts (DataContext, ChallengeContext)
├── hooks/           # Custom hooks
├── lib/             # Utilities (cn, firebase config)
├── pages/           # Route pages
└── types/           # TypeScript types
```

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Code Conventions

- Use `@/` path alias for imports from `src/`
- Use Shadcn UI components from `@/components/ui/` for consistency
- Forms use react-hook-form with Zod schemas
- Data is managed through Firebase + DataContext
- Use `sonner` for toast notifications
- Use `date-fns` for date formatting

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

