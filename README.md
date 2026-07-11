# TripLedger - Fleet & Billing Platform

TripLedger is a React/Vite driver trip billing application being grown into a SaaS-ready fleet and billing platform. The current MVP supports authenticated bill logging, bill preview, bill history, edit/delete flows, PDF export, WhatsApp sharing, local settings, and dark mode.

The app is intentionally structured so Supabase can be replaced later by a FastAPI, NestJS, or other API backend without rewriting UI components.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Supabase Auth and Database
- jsPDF
- pnpm

## Features

- Email/password login and signup through Supabase
- Email verification callback handling for local and Netlify deployments
- Optional TOTP-based Extra Login Verification through Supabase MFA
- Protected logger dashboard
- Driver, vehicle, guest, trip timing, package, kilometer, charge, advance, and notes fields
- Automatic bill calculations in shared utilities
- Garage time support and bill preview
- Save, update, delete, duplicate, and view bills
- User-specific history through Supabase RLS
- PDF export
- WhatsApp sharing
- Copy bill text
- Settings stored through a service layer
- Light/dark mode with local preference persistence

## Folder Structure

```text
src/
  app/                 App composition and page routing
  components/
    auth/              Login and signup UI
    history/           Bill history, view, edit, delete, selection
    layout/            Shell, navigation, profile menu
    logger/            Logger form and bill preview
    settings/          App settings UI
    shared/            Reusable app-level UI components
    ui/                Reusable primitives
  constants/           Defaults and fixed app values
  hooks/               UI-facing state and workflows
  repositories/        Persistence contracts and implementations
    supabase/          Supabase-specific data access
  services/            Business workflows used by hooks/UI
  types/               Shared TypeScript models
  utils/               Calculations, formatting, PDF, WhatsApp, time helpers
supabase/
  bills.sql            Database schema, indexes, trigger, and RLS policies
  phase1_mfa_rls.sql   Conditional MFA enforcement for protected bill rows
```

## Architecture

TripLedger follows a layered frontend architecture:

```text
UI Components
  -> Hooks
  -> Services
  -> Repository Interfaces
  -> Supabase Repository Implementations
```

Rules:

- UI components should not call Supabase directly.
- UI components should not contain bill calculation logic.
- Services define bill/auth workflows.
- Repositories handle persistence details.
- Supabase-specific code stays under `src/repositories/supabase`.
- Future API migration should mainly replace repository implementations.

For example:

- `src/hooks/useBills.ts` manages bill state for the UI.
- `src/services/billService.ts` exposes bill workflows.
- `src/repositories/billRepository.ts` defines the repository contract.
- `src/repositories/supabase/supabaseBillRepository.ts` maps app models to Supabase rows.
- `src/utils/calculations.ts` owns billing calculations.

## Environment Variables

Create a local `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Important:

- `.env` must stay local and must not be committed.
- Only use the Supabase public anon/publishable key in the frontend.
- Never use a Supabase service role key in this app.
- Restart the Vite dev server after changing `.env`.

## Supabase Setup

Run the SQL in `supabase/bills.sql` inside the Supabase SQL Editor.

The SQL creates:

- `public.bills`
- User ownership through `user_id`
- Indexes for user/date lookups
- An `updated_at` trigger
- Row Level Security policies for authenticated users

## Database Overview

The current `bills` table stores the MVP bill fields used by the app, including:

- Driver, vehicle, guest, salutation, and reporting details
- Trip dates and times
- Base package, base hours, base KM, and base amount
- Total KM, extra KM, extra KM rate, and amount
- Total hours, extra hours, extra hour rate, and amount
- Parking, FASTag, road parking, pending, advance, and total amounts
- Notes and WhatsApp number
- `created_at` and `updated_at`

Some compatibility columns are intentionally present, such as `customer_name`, `passenger_name`, `title_prefix`, `date`, `start_location`, `total_kilometers`, and `balance_amount`. These help preserve compatibility with earlier schema expectations and future migration paths.

## Authentication Flow

Supabase Auth is isolated behind:

- `src/repositories/authRepository.ts`
- `src/repositories/supabase/supabaseAuthRepository.ts`
- `src/services/authService.ts`
- `src/hooks/useAuth.ts`

The app checks the active session, protects the logger, and routes unauthenticated users to the auth screen. Signup emails return to `/auth/callback`, where TripLedger handles successful, invalid, and expired verification links without leaving the user on a blank page.

Users can optionally enable **Extra Login Verification** in Settings. This uses Supabase's official TOTP MFA flow:

1. Scan the enrollment QR code with an authenticator app.
2. Confirm enrollment with the current 6-digit code.
3. Future password logins stop at a verification screen until a valid authenticator code upgrades the session from `aal1` to `aal2`.

TripLedger does not generate, persist, or validate verification codes itself. TOTP secrets are shown only during enrollment and are not saved by the app.

### Supabase Auth URLs

In **Supabase Dashboard -> Authentication -> URL Configuration**, set:

```text
Site URL:
https://triploggy.netlify.app

Redirect URLs:
https://triploggy.netlify.app/auth/callback
http://localhost:5173/auth/callback
```

You may additionally use Supabase-supported wildcards for preview/development URLs, such as `https://triploggy.netlify.app/**` and `http://localhost:5173/**`.

If Vite starts on another port, add that exact callback URL as well (for example, `http://localhost:5175/auth/callback`).

Ensure TOTP enrollment is enabled in the project's Supabase MFA settings. No service-role key or additional frontend secret is required.

## RLS Overview

The `bills` table enables Row Level Security.

Policies ensure authenticated users can:

- Select only rows where `auth.uid() = user_id`
- Insert only rows where `auth.uid() = user_id`
- Update only rows where `auth.uid() = user_id`
- Delete only rows where `auth.uid() = user_id`

This keeps user bill history isolated across accounts.

After running `supabase/bills.sql`, also run `supabase/phase1_mfa_rls.sql`. It preserves user ownership and additionally requires an `aal2` session for users who have a verified MFA factor. Users who leave Extra Login Verification disabled continue using normal email/password sessions.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173/
```

For testing on a phone on the same network:

```bash
pnpm run dev -- --host 0.0.0.0
```

Then open the Network URL printed by Vite, for example:

```text
http://192.168.x.x:5173/
```

## Build

```bash
pnpm run build
```

The build runs TypeScript project checks and creates the production Vite bundle.

## Deployment Notes

For Netlify or similar static hosting:

- Build command: `pnpm run build`
- Publish directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider's environment settings.
- `netlify.toml` includes the SPA fallback required for direct visits to `/auth/callback`.

## Business Rules

- Base package values come from app settings and defaults.
- Extra hours are calculated from total hours minus base hours.
- Extra KM is calculated from total KM minus base KM.
- Total amount is calculated from base, extra KM, extra hour, parking, FASTag, road parking, and pending amounts.
- Amount and duration formatting should live in utilities, not components.
- WhatsApp and PDF formatting should stay isolated in their utility files.

## Troubleshooting

If the app says Supabase environment variables are missing:

1. Confirm `.env` exists in the project root.
2. Confirm the variable names start with `VITE_`.
3. Restart the dev server.

If bills do not save or load:

1. Confirm `supabase/bills.sql` was run in Supabase.
2. Confirm the user is logged in.
3. Check the browser console for Supabase errors.
4. Confirm RLS policies exist and target `auth.uid() = user_id`.

If the site cannot be reached:

1. Confirm the Vite dev server is running.
2. Open the exact URL printed by Vite.
3. Use `--host 0.0.0.0` when testing from a mobile device.

## Future Migration Path

To migrate from Supabase to FastAPI/PostgreSQL or another backend:

1. Keep UI components unchanged.
2. Keep hooks and service contracts stable where possible.
3. Add API-backed repository implementations, such as `apiBillRepository.ts` and `apiAuthRepository.ts`.
4. Map REST endpoints to repository methods.
5. Switch service construction from Supabase repositories to API repositories.

Target API shape can include:

- `POST /auth/login`
- `POST /auth/signup`
- `GET /bills`
- `POST /bills`
- `GET /bills/:id`
- `PUT /bills/:id`
- `DELETE /bills/:id`

## Engineering Standards

Future work should:

- Preserve the layered architecture.
- Reuse existing components, hooks, services, and utilities before adding new ones.
- Keep business logic out of UI components.
- Keep Supabase/API details out of UI components.
- Update TypeScript types when data changes.
- Update SQL and RLS policies when tables change.
- Run `pnpm run build` before considering work complete.
