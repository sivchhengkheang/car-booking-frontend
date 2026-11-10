# DriveKH — Frontend

Next.js 16 (App Router) web application for **DriveKH**, a car rental platform across Cambodia with instant streaming pages, KOOMPI ID OAuth + JWT authentication, Baray KHQR checkout, Google Maps fleet exploration, and an Admin/Host management dashboard.

## Tech Stack

- **Framework**: Next.js 16.3.8 (Turbopack) & React 19
- **Styling**: Tailwind CSS & `lucide-react` icons
- **Authentication**: KOOMPI ID OAuth (`@kid-oauth/sdk`) + Express JWT with automatic token refresh

## Key Routes

| Route | Description |
| --- | --- |
| `/` | Instant-loading vehicle catalog with filters, 4-column desktop grid, and Google Maps city/province explorer |
| `/booking` | Vehicle gallery, availability calendar, duration presets, and 15-minute reservation hold |
| `/booking/checkout` | Required driver details & ID upload, hold countdown, and Baray KHQR checkout retry flow |
| `/booking/success` | Booking voucher and pick-up pass |
| `/booking/my` | Customer trip history and reviews |
| `/booking/inspection` | Digital pick-up and return condition inspection |
| `/saved`, `/compare`, `/basket` | Saved vehicles, side-by-side comparison, and rental basket |
| `/auth/login`, `/auth/register` | Email/password & KOOMPI ID sign-in |
| `/auth/kid/callback`, `/auth/kid/profile` | KOOMPI ID PKCE callback and user profile |
| `/dashboard` | Host & Admin overview with KPI cards, charts, and paginated recent bookings |
| `/dashboard/cars` | Fleet management (`All fleet` / `My fleet`), create/edit vehicle with photos, status & delete |
| `/dashboard/bookings` | Booking lifecycle management (confirm pick-up, complete return, cancel) |
| `/dashboard/users` | Admin user list, search, role assignment (`CUSTOMER` / `HOST` / `ADMIN`), suspend/activate |
| `/dashboard/payments` | Admin payment history, date/status filters, CSV export, and refunds |

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_KID_CLIENT_ID=<your-kid-client-id>
NEXT_PUBLIC_KID_REDIRECT_URI=http://localhost:3000/auth/kid/callback

KID_CLIENT_ID=<your-kid-client-id>
KID_CLIENT_SECRET=<your-kid-client-secret>
KID_REDIRECT_URI=http://localhost:3000/auth/kid/callback
KID_BASE_URL=https://api.kid.koompi.org
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Build the production bundle
- `npm start` — Run the production server
- `npm run lint` — Run ESLint
