# manasik-v2

Public storefront for Manasik Foundation.

## Last Updated

- 2026-03-27

## Release Notes

- 2026-03-27: Added login and registration pages with form handling.
- 2026-03-19: Enhanced payment status page localization and payment details.
- 2026-03-18: Added pay-link token route handling and checkout UX refinements.
- 2026-03-17: Updated payment handling with productSlug and custom pay-link route support.
- 2026-03-16: Added retry-payment flow and improved payment status behavior.
- 2026-03-15: Added richer input components (icons, multi-name improvements).

## Architecture

- Next.js storefront application.
- Calls shared backend APIs in apps_backend using /api rewrites/proxying.
- Does not own canonical business logic or DB state.

Flow:

- Browser -> manasik-v2 -> /api/\* -> apps_backend -> MongoDB + payment gateway

## Stack

- Next.js 16.1.6
- TypeScript
- Tailwind v4
- next-intl (ar/en)
- next-themes
- react-icons

## Main Features

- Bilingual storefront with RTL support.
- Product browsing and checkout.
- Reservation data collection and multi-name support.
- Coupon support and referral tracking.
- EasyKash payment redirect/status UX.
- Retry flow for failed payments.
- SEO routes (robots/sitemap) and landing sections.

## Environment

Create manasik-v2/.env.local:

```env
BACKEND_URL=http://localhost:3000
BASE_URL=http://localhost:3001
NEXT_PUBLIC_FB_PIXEL_ID=
API_TOKEN=
FB_PIXEL_ID=
FB_TEST_EVENT_CODE=
```

## Scripts

- npm run dev
- npm run build
- npm start
- npm run lint

## Run Locally

```bash
cd manasik-v2
npm install
npm run dev
```

Default local URL:

- http://localhost:3001

## Integration Notes

- Orders from this app are source-tagged as manasik in backend.
- Keep payment behavior aligned with backend lifecycle and status contracts.
