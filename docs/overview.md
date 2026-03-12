# VenCap — Technical Documentation

**VenCap** is a single-player venture capital fund management simulator. You manage a VC fund over a 10-year (120-month) lifecycle — sourcing deals, building portfolio companies, navigating market cycles, and answering to your LPs.

---

## Architecture at a Glance

```
src/
├── engine/              # Pure TypeScript simulation (zero React imports)
│   ├── types.ts         # All interfaces, enums, type definitions
│   ├── gameState.ts     # Zustand store + advanceTime() core loop
│   ├── mockData.ts      # Procedural startup & market data generation
│   ├── dynamicEvents.ts # Monthly event system (14 templates)
│   ├── lpSentiment.ts   # LP trust engine (8-factor scoring)
│   ├── talentMarket.ts  # Talent pool generation & hiring mechanics
│   └── vcRealism.ts     # Ownership caps, check sizes, deployment guards
│
├── components/          # Shared UI components
│   ├── ui/              # shadcn/ui primitives (16+ components)
│   ├── NavBar.tsx       # Persistent navigation (desktop + mobile)
│   ├── DealCard.tsx     # Startup deal display card
│   ├── InvestModal.tsx  # Investment dialog with validation
│   ├── Charts.tsx       # 4 Recharts visualizations
│   └── Onboarding.tsx   # 5-step first-time tutorial
│
├── pages/               # Route-level page components
│   ├── Index.tsx        # Fund setup wizard (4 steps)
│   ├── Dashboard.tsx    # Command center & time advancement
│   ├── Deals.tsx        # Deal pipeline & investment
│   ├── Portfolio.tsx    # Active investment management
│   ├── Incubator.tsx    # Batch mentoring program
│   ├── Lab.tsx          # Venture studio (build from scratch)
│   ├── News.tsx         # Market intelligence feed
│   ├── Reports.tsx      # Annual LP reports
│   └── Results.tsx      # End-of-fund scorecard & rebirth
│
├── App.tsx              # Router, providers, layout shell
└── main.tsx             # Entry point
```

---

## Tech Stack

| Layer      | Technology                       | Version           |
| ---------- | -------------------------------- | ----------------- |
| Framework  | React                            | 19.x              |
| Language   | TypeScript                       | 5.9 (strict mode) |
| Build      | Vite                             | 7.x               |
| Styling    | Tailwind CSS v4                  | 4.2               |
| Components | shadcn/ui (Radix primitives)     | Latest            |
| State      | Zustand (persist → localStorage) | 5.x               |
| Routing    | React Router                     | 7.x               |
| Charts     | Recharts                         | 3.x               |
| Icons      | Lucide React                     | 0.575             |
| Toasts     | Sonner                           | 2.x               |

---

## Key Design Decisions

**Engine isolation** — All simulation logic lives in `src/engine/` as pure TypeScript functions. No React imports. This means the game engine can be tested, ported, or run server-side without any UI dependency.

**Zustand over Redux** — Lightweight, minimal boilerplate. The `persist` middleware handles localStorage serialization automatically. Single store, single source of truth.

**shadcn/ui over full component libraries** — Copy-paste ownership of components. No version lock-in. Components live in `src/components/ui/` and are fully customizable.

**Dark-first design** — Bloomberg terminal aesthetic. Slate-900 base, indigo accents, oklch color space. Professional, data-dense, scannable.

**No backend** — Everything runs client-side. Game state persists in localStorage under the key `vencap-game-state`. This keeps deployment trivial (static hosting) and eliminates auth complexity for MVP.

---

## Documentation Index

| Document                      | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| [Frontend](./frontend.md)     | Pages, components, routing, UI patterns, state flow |
| [Engine](./engine.md)         | Game state, simulation core, data generation        |
| [Game Logic](./game-logic.md) | Algorithms, formulas, modifier system, scoring      |
| [Next Steps](./next-steps.md) | Post-MVP roadmap, improvements, known gaps          |

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build
npm run preview    # preview production build
```

## TypeScript Strictness

The project enforces aggressive TS rules:

- `noUnusedLocals` / `noUnusedParameters`
- `verbatimModuleSyntax` — requires `import type` for type-only imports
- `noFallthroughCasesInSwitch`
- Full `strict` mode

Path alias: `@/*` maps to `./src/*` (configured in both `vite.config.ts` and `tsconfig`).
