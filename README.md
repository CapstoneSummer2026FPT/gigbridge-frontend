# GigBridge Frontend

React single-page application for the GigBridge freelance marketplace.

## Requirements

- Node.js 22.12 LTS or Node.js 24+
- npm 10 or newer
- A running GigBridge API

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` when the API is not available at the default development
address:

```dotenv
VITE_API_BASE_URL=http://localhost:5222/api
```

The application is served at `http://localhost:5173`.

## Production build

```bash
npm run verify
```

`verify` runs the TypeScript compiler, the complete Vitest suite, and the Vite
production build. Set `VITE_API_BASE_URL` to the public API URL during the build,
or route the same-origin `/api`, `/hubs/chat`, and `/hubs/notification` paths to
the backend. Production builds never fall back to localhost.

Every production build removes `dist` before Vite runs and audits the generated
HTML, JavaScript, and CSS for retired runtime code. When deploying without
Vercel, replace the remote release directory atomically or use a sync operation
that deletes remote files missing from the new `dist`; never overlay a new
`dist` onto an older asset directory.

## Architecture

```text
src/
├── app/       application providers, guards, layouts, and lazy routes
├── api/       endpoint-specific HTTP adapters
├── features/  domain screens, components, and hooks
├── service/   shared Axios client and authentication refresh flow
├── shared/    reused components and utilities
└── types/     API and UI contracts
```

The runtime uses real API data. Development mock routes and production fallback
fixtures are intentionally not included.

## Main stack

- React 18
- TypeScript 6
- Vite 7 and Tailwind CSS 4
- React Router 7
- Axios and SignalR
- Vitest and Testing Library
