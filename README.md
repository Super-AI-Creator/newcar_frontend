# NewCarSuperstore Frontend

Modern Next.js 14 (App Router) frontend for the NewCarSuperstore marketplace.

## Stack
- Next.js 14 + TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zod

## Setup
1. Install deps:
```bash
npm install
```

2. Configure env:
```bash
cp .env.local.example .env.local
```
Update values as needed.

3. Run dev server:
```bash
npm run dev
```

## Auth Flow
- Client uses Google Identity Services to obtain a Google ID token.
- POST to `/auth/google` to exchange for backend JWT.
- If the backend sets an httpOnly cookie, it will be used automatically.
- If not, the JWT is stored in memory + localStorage and attached as `Authorization: Bearer`.
- If the backend response indicates verification is required (e.g. `verification_required`, `requiresVerification`, or `status: "verification_required"`), the OTP flow is shown.

## API Endpoints Used
You can adjust these in `src/lib/api.ts` if your backend differs:
- `POST /auth/google`
- `GET /auth/me`
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /vehicles/filters`
- `GET /search`
- `GET /vehicles/{vin}`
- `POST /payments/estimate`
- `POST /docs/forward` (multipart upload)
- `GET /favorites`
- `POST /favorites/{vin}`
- `GET /messages`
- `POST /messages`
- `POST /credit-applications`
- `GET /dealer/inventory`
- `PUT /dealer/offers/{vin}`
- `POST /admin/sync-sheets`
- `GET /admin/sources`

## Pages
- `/` landing
- `/login` login + OTP
- `/search` search filters + results
- `/vehicles/[vin]` vehicle detail
- `/favorites`
- `/dashboard/customer`
- `/dashboard/dealer`
- `/admin`
