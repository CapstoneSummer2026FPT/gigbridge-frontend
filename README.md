<div align="center">
  <h1>GigBridge</h1>
  <p><strong>The Next-Gen Freelance Marketplace Infrastructure.</strong></p>

  <p>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-24292e?style=flat&logo=react&logoColor=61dafb" alt="React" /></a>
    <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-24292e?style=flat&logo=typescript&logoColor=3178c6" alt="TypeScript" /></a>
    <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-6-24292e?style=flat&logo=vite&logoColor=646cff" alt="Vite" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-4-24292e?style=flat&logo=tailwindcss&logoColor=38bdf8" alt="Tailwind" /></a>
  </p>
</div>

---

## ✦ Core Features

- **AI Matching** — Automated talent recommendation pipelines and AI interview simulation engines.
- **Real-time Sync** — Live WebSocket communication for instant messaging and notification delivery using SignalR.
- **Milestone Contracts** — End-to-end digital agreement lifecycle including secure e-signing and payment processing.
- **Internationalization** — Native localized multi-language architecture (English / Vietnamese).
- **Market Analytics** — Interactive dashboards mapping industry trends, salary structures, and regional metrics.

---

## 🚀 Quick Start

Initialize the development server:

```bash
# Install dependencies
pnpm install

# Start the local development environment
pnpm dev
```

The application will be served at `http://localhost:5173`.

---

## 📂 Architecture

GigBridge follows a modular, domain-driven architecture separating global shells from feature boundaries.

```
src/
├── app/              # Application bootstrapping (router, global providers)
├── features/         # 21 domain-specific modules (jobs, profile, contracts...)
├── shared/           # Reusable UI primitives, helpers, and design tokens
├── api/              # Low-level HTTP requests and endpoint specifications
├── service/          # Shared services (Axios client, auth token interceptor)
├── hooks/            # Globally shared React stateful custom hooks
├── types/            # Centralized TypeScript interface definitions
└── mock_backend/     # MSW server mocks for offline/isolated mock development
```

### Module Boundary Layout

Inside `features/`, every domain feature encapsulates its own assets to keep the modules cohesive and self-contained:

```
features/<module-name>/
├── screens/         # Page entry points routed by React Router
├── components/      # UI components dedicated to this module
├── hooks/           # Domain data-fetching and state management hooks
├── styles/          # Custom styled rules or layout adjustments
└── index.ts         # Module barrel export (defines the public API)
```

---

## 🛠️ Stack & Technologies

- **Core Runtime** — React 18, Vite 6, TypeScript
- **UI Components** — Radix UI Headless Primitives, Material UI (MUI 7)
- **Styling & Layout** — Tailwind CSS v4, Custom Design Tokens
- **Navigation** — React Router v7
- **Data Flow** — Axios HTTP Client, SignalR Client WebSockets
- **Interactive Elements** — Recharts, GSAP, Motion
