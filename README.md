# manasik-v2

Public storefront for the Manasik platform.

## Latest Updates (April 2026)

- Product calls now send explicit platform context:
  - `platform=manasik`
- Product media now fully uses the shared backend `media[]` contract:
  - images + videos
  - per-item visibility filtered by backend
- Checkout/payment flow improvements shipped for better reliability and retry outcomes.

## What This App Does

- Delivers the Manasik customer website and product catalog.
- Handles checkout, payment status, and pay-link experiences.
- Captures dynamic reservation data and referral context.
- Supports multi-currency pricing display and coupon validation flow.

## Architecture

- Next.js App Router storefront.
- API requests routed to `backend` via rewrite/proxy.
- Domain logic and validation are centralized in backend.

Request flow:

- Browser -> manasik-v2 -> backend APIs -> MongoDB + services

## Main Functional Areas

- Landing and localized content sections.
- Product listing/details with mixed media gallery.
- Checkout with reservation presets and blocked-date support.
- EasyKash payment lifecycle and status recovery.
- Referral tracking and analytics integration.
- SEO (`robots.ts`, `sitemap.ts`) and metadata.

## Main Routes

- `/`
- `/products`
- `/products/[slug]`
- `/checkout`
- `/payment/status`
- `/payment/pay-link/[token]`
- `/payment/custom-pay-link/[token]`
- `/calc-aqeqa`
- `/privacy`
- `/terms`
- `/auth/login`
- `/auth/register`
- `/user`

## Environment

Create `manasik-v2/.env.local`:

```env
BACKEND_URL=http://localhost:3000
BASE_URL=http://localhost:3001

NEXT_PUBLIC_FB_PIXEL_ID=
FB_PIXEL_ID=
FB_TEST_EVENT_CODE=
API_TOKEN=
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run lint`

## Local Run

```bash
cd manasik-v2
npm install
npm run dev
```

Default URL: `http://localhost:3001`

## Integration Notes

- Orders are source-tagged as `manasik`.
- Pricing, media filtering, coupon validation, reservation rules, and payment truth are backend-owned.
