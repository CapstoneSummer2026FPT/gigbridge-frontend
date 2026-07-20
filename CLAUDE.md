# GigBridge Frontend — CLAUDE.md

## Tech Stack

- **Runtime:** React 18.3 (TypeScript strict mode)
- **Build:** Vite 6 (via pnpm override), `@vitejs/plugin-react`
- **Styling:** Tailwind CSS 4 + MUI 7 + Radix UI primitives + shadcn/ui components
- **Routing:** React Router 7 (file-based in `src/app/router.tsx`)
- **State:** React Context + hooks (no Redux/Pinia)
- **HTTP:** Axios with interceptors (token refresh, 401 handling)
- **Real-time:** `@microsoft/signalr` (chat, notifications)
- **i18n:** i18next + `react-i18next` (en, vi) with browser detection
- **Forms:** react-hook-form
- **Animation:** GSAP, Motion (framer-motion), canvas-confetti
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library + jsdom
- **Drag & drop:** react-dnd
- **Code quality:** ESLint (strict), `noUnusedLocals`, `noUnusedParameters`

## Project Structure

```
src/
├── api/                          # API call wrappers per backend domain
│   ├── {domain}API/
│   │   ├── index.tsx             # Aggregates GET/POST/PUT into domainAPI object
│   │   ├── GET.tsx               # GET endpoints
│   │   ├── POST.tsx              # POST endpoints
│   │   └── PUT.tsx               # PUT endpoints
│   └── {domain}API.ts            # Simple domains (single file)
├── app/                          # App shell
│   ├── components/
│   │   ├── ProtectedRoute.tsx    # Auth guard + setup redirect
│   │   └── ui/                   # shadcn/ui components (Radix-based)
│   ├── layouts/                  # RootLayout
│   ├── providers/
│   │   ├── AppProvider.tsx       # Global state: user, auth, theme, role
│   │   └── api.tsx               # API context/config
│   ├── styles/                   # Router styles
│   └── router.tsx                # createBrowserRouter with all routes
├── config/                       # App configuration
├── features/                     # Domain features
│   └── {feature}/
│       ├── screens/              # Page-level components (default export)
│       ├── components/           # Feature-specific components
│       ├── hooks/                # Feature-specific hooks
│       ├── apis/                 # Feature-specific API calls
│       ├── styles/               # Feature-specific CSS
│       ├── utils/                # Feature-specific utilities
│       └── mock/                 # Mock data for development
├── hooks/                        # Shared custom hooks
│   ├── useScrollRestoration.ts
│   └── useTranslation.ts
├── i18n/                        # i18next config
├── locales/                     # Translation JSON files
│   ├── en/common.json
│   └── vi/common.json
├── mock_backend/                # MSW-like mock backend
│   ├── database/
│   ├── handlers/
│   └── types/
├── service/
│   └── apiService.ts            # Axios instance + interceptors + helpers
├── shared/                      # Shared across features
│   ├── components/              # AppLayout, Sidebar, TopNav, Button, etc.
│   ├── styles/                  # Global CSS
│   └── utils/                   # gigcoin, serviceFee, pdfGenerator, etc.
├── styles/                      # Global styles
├── test/                        # Test setup
└── types/                       # TypeScript types
    ├── common.ts                # ApiResponse<T>, ApiError
    ├── models/                  # Domain models (User, Job, Contract, etc.)
    └── {domain}.ts              # Feature-specific types
```

## Key Patterns

### 1. API Layer Organization

```
src/api/authAPI/
├── index.tsx     # Aggregates → export const authAPI = { login, register, ... }
├── GET.tsx       # authGetAPI = { verifyEmail, testAuth }
├── POST.tsx      # authPostAPI = { login, register, forgotPassword, ... }
└── PUT.tsx       # authPutAPI = { markSetupComplete }
```

- Split by HTTP method (GET/POST/PUT), aggregate in `index.tsx`
- Simple domains use a single file: `googleMeetAPI.ts`, `scheduleAPI.ts`
- Each function calls `apiService.get<T>()` / `apiService.post<T>()` with typed responses
- Endpoint path is relative to `API_BASE_URL` (default `http://localhost:5222/api`)

### 2. API Service (`src/service/apiService.ts`)

```typescript
// Base URL from env: VITE_API_BASE_URL || 'http://localhost:5222/api'
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  withCredentials: true,
});
```

- **Request interceptor**: Attaches `Bearer {token}` from `localStorage.getItem('access_token')`
- **Response interceptor**: On 401, attempts token refresh via `/auth/refresh`, retries original request. Falls back to logout on failure
- **Error handling**: Every `apiService.get/post/put/patch/delete` catches errors and returns `ApiResponse<T>` with `success: false` — never throws
- **Response normalization**: Handles both `success/statusCode/message/data` (backend format) and raw responses

### 3. State Management (AppProvider Context)

```typescript
// src/app/providers/AppProvider.tsx
interface AppContextValue {
  user: User | null;
  role: UserRole | null;
  theme: AppTheme;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  clientProfile: ClientProfile | null;
  freelancerProfile: FreelancerProfile | null;
  login(email, password): Promise<UserRole>;
  signup(email, password, fullName, role): Promise<void>;
  googleLogin(authCode, role?, isFromSignIn?): Promise<UserRole>;
  logout(redirectPath?): void;
  completeOnboarding(profileData): Promise<void>;
  markSetupComplete(): void;
}
```

- **Session persistence**: `localStorage` keys `gigbridge_session`, `gigbridge_user`, `access_token`
- **Session restore**: On mount, loads saved user from `localStorage`
- **User normalization**: `mapUserDTOToUser()` handles both camelCase (backend `DTO`) and PascalCase responses
- **Role normalization**: `normalizeRole()` accepts `UserRole` enum values (0/1/2) or string (`"client"`, `"freelancer"`, `"admin"`)

### 4. Routing (React Router 7)

All routes defined in `src/app/router.tsx` with `createBrowserRouter`:

```
RootLayout (AppProvider > Outlet)
├── / → LandingScreen (PublicRoute)
├── /auth/login → LoginScreen (PublicRoute)
├── /onboarding/profile-setup → ProfileSetupScreen
├── /client/dashboard → ClientDashboardScreen
├── /freelancer/dashboard → FreelancerDashboardScreen
├── /jobs/browse → BrowseJobsScreen
├── /jobs/post → PostJobScreen
├── /contracts → ContractListRoute (role-based)
├── /messages → MessagesScreen
├── /admin → AdminDashboardScreen (AdminRoute)
└── ... 80+ routes total
```

Route guard hierarchy:
- `PublicRoute` — authenticated users redirected to role dashboard
- `ProtectedRoute(requireAuth)` — unauthenticated → `/auth/login`
- `ProtectedRoute(requireAuth, requireSetup)` — also checks `user.is_setup`
- `AdminRoute` — checks admin role
- `OwnProfileEditRoute` — checks user owns the profile being edited

### 5. Feature Structure

Each feature follows this structure:

```
features/jobs/
├── screens/         # Page-level components (default export, used in router)
│   ├── BrowseJobsScreen.tsx
│   ├── PostJobScreen.tsx
│   ├── JobDetailScreen.tsx
│   └── MyJobsScreen.tsx
├── components/      # Feature-specific (not shared) components
│   ├── JobPostGuide.tsx
│   └── PostJobDraftModal.tsx
├── hooks/           # Feature-specific hooks
│   ├── usePostJob.ts
│   └── useJobDetail.ts
├── apis/            # Feature-specific API calls (if not in src/api/)
├── styles/          # Feature-specific CSS
├── utils/           # Utilities (jobDuration.ts, postJobAI.ts)
└── mock/            # Mock data for development
```

- **Screens** are page-level, connected to router
- **Components** are internal to the feature
- Shared UI primitives go in `src/app/components/ui/` (shadcn)
- Shared components go in `src/shared/components/`

### 6. Styling System

```
Tailwind CSS 4          → utility classes (primary, in screens)
MUI 7                   → Material-UI components where needed
shadcn/ui + Radix       → accessible primitives (in src/app/components/ui/)
Custom CSS              → per-feature in features/{feature}/styles/
AppLayout               → all authenticated screens use this wrapper
MeshGradientBackground → default background for all screens
```

- Theme: `'white'` or `'black'` (stored in `localStorage.gigbridge_theme`)
- CSS via Tailwind 4 + custom `.css` files
- No CSS modules — standard CSS files with BEM-like class names

### 7. Internationalization (i18n)

```typescript
// Usage in components
const { t } = useTranslation();  // from src/hooks/useTranslation.ts
t('auth.login')     // → looks up common.json → auth.login
t('common.welcome', { name: 'John' })  // interpolation
```

- **Default language:** Vietnamese (`vi`)
- **Fallback:** Vietnamese for unsupported languages
- **Detection order:** localStorage → browser language
- **Namespaces:** single `common` namespace
- **Type-safe:** via `react-i18next` types

### 8. TypeScript Types

```
src/types/
├── common.ts              # ApiResponse<T>, ApiError
├── index.ts               # Re-exports
├── models/
│   ├── User.ts            # User, AdminUserDto, UserRole enum
│   ├── Auth.ts            # LoginRequest, LoginResponse, UserDTO, etc.
│   ├── Job.ts             # JobPost, JobPostSkill, etc.
│   ├── Contract.ts        # Contract, Milestone, etc.
│   ├── Proposal.ts        # Proposal, ProposalAnswer
│   ├── Profile.ts         # ClientProfile, FreelancerProfile
│   ├── Message.ts         # Message, Conversation
│   └── ...                # Per domain model file
├── {domain}.ts            # Feature-specific types (flat files)
```

- `UserRole` enum matches backend: `Client = 0`, `Freelancer = 1`, `Admin = 2`
- All models use `snake_case` properties (frontend convention)
- Backend DTOs use `PascalCase` / `camelCase` — handled by `getField()` helper in AppProvider

### 9. SignalR Integration

```typescript
import * as signalR from '@microsoft/signalr';
import { getChatHubUrl, getNotificationHubUrl } from '../service/apiService';

// Token passed via query param (configured in backend JWT events)
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${getChatHubUrl()}?access_token=${token}`)
  .build();
```

- **ChatHub** → `/hubs/chat`
- **NotificationHub** → `/hubs/notification`

### 10. Mock Backend

`src/mock_backend/` contains a development mock backend with:
- `database/` — in-memory data stores
- `handlers/` — request handlers
- `types/` — type definitions

## Naming Conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Screens | `{PageName}Screen` | `BrowseJobsScreen` |
| Components | PascalCase, descriptive | `PostJobDraftModal` |
| Hooks | `use{Feature}` | `usePostJob`, `useJobDetail` |
| API files | `{method}.tsx` (uppercase) | `POST.tsx`, `GET.tsx` |
| API objects | `{domain}API` | `authAPI`, `jobAPI` |
| Types | PascalCase interfaces | `CreateJobPostRequest` |
| Enums | PascalCase | `UserRole`, `ContractStatus` |
| CSS files | PascalCase + `.css` | `manage-job-posts-screen.css` |
| Utils | camelCase | `formatGigCoin`, `jobDuration` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `GIGCOIN_CURRENCY_CODE` |

## Key Dependencies

| Category | Library | Purpose |
|----------|---------|---------|
| UI Framework | React 18, MUI 7, Radix, shadcn | Components and primitives |
| Styling | Tailwind 4, emotion | Styling utilities |
| Routing | React Router 7 | Browser routing |
| Forms | react-hook-form | Form state management |
| HTTP | Axios | API client |
| Real-time | @microsoft/signalr | WebSocket/chat |
| i18n | i18next, react-i18next | Translations |
| Charts | Recharts | Data visualization |
| Animation | GSAP, Motion, canvas-confetti | Animations |
| Drag & drop | react-dnd | Drag and drop |
| Calendar | react-day-picker | Date picking |
| Markdown | react-markdown + remark-gfm | Markdown rendering |
| Testing | Vitest, Testing Library | Unit/integration tests |

## Coding Rules

1. **File organization** — One default export per screen file. Screens in `screens/`, components in `components/`, hooks in `hooks/`.
2. **Immutability** — Use spread/functional updates. Never mutate state directly.
3. **API calls** — Always use `apiService` (not raw axios). Never use `fetch()` directly for backend calls.
4. **Error handling** — API errors return `ApiResponse` with `success: false`. Handle both `success` and `error` paths.
5. **State** — Use `useApp()` context for auth/role/theme. Local state for UI. No Redux.
6. **Translations** — Always use `t()` from `useTranslation()`. Never hardcode UI text.
7. **Types** — Define all API request/response types. Use `interface` for objects, `type` for unions.
8. **Token management** — Access token in `localStorage.access_token`. Session in `localStorage.gigbridge_session`.
9. **CSS** — Prefer Tailwind utilities. Feature CSS in `features/{name}/styles/`. Global styles in `src/styles/`.

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:5222/api    # Backend API URL
VITE_GOOGLE_CLIENT_ID=...                      # Google OAuth Client ID
```

## Useful Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev          # → http://localhost:5173

# Build
pnpm build

# Preview build
pnpm preview

# Tests
pnpm test         # vitest run

# Lint
pnpm lint         # via Vite/ESLint
```

## API Endpoints (Backend Mappings)

API endpoints call the backend at `{VITE_API_BASE_URL}/{endpoint}` (e.g., `http://localhost:5222/api/auth/login`):

| Frontend Module | Backend Prefix | Examples |
|----------------|---------------|---------|
| `authAPI` | `auth/` | login, register, refresh, forgot-password |
| `jobAPI` | `JobPosts/` | CRUD, draft, visibility, status |
| `contractAPI` | `Contracts/` | milestones, handoffs, escrow |
| `proposalAPI` | `Proposals/` | CRUD, answers, interview |
| `walletAPI` | `Wallet/` | deposit, history, withdrawal |
| `messageAPI` | `Messages/` | Conversations, messages |
| `profileAPI` | `Profiles/` | client/freelancer profiles |
| `notificationAPI` | `Notifications/` | user notifications |
| `adminAPI` | `Admin/` | users, jobs, cheating, reports |
