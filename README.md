# manasik-v2

Public storefront for Manasik Foundation.

## What This App Does

- Presents the Manasik brand landing and product catalog.
- Runs customer checkout and payment status flows.
- Collects reservation/customization data for product-specific forms.
- Supports coupons, referral attribution, and multi-currency pricing display.
- Sends analytics tracking events through client + backend pipeline.

## Architecture

- Next.js App Router storefront.
- Proxies /api requests to apps_backend via rewrite/proxy setup.
- Keeps persistent logic and validations in the backend service.

Flow:

- Browser -> manasik-v2 -> /api/\* -> apps_backend -> MongoDB + EasyKash

## Feature Inventory

### Landing and Brand Experience

- Branded homepage sections with localized content.
- Dynamic appearance-driven content blocks.
- Bilingual UI (Arabic/English) with direction switching.

### Catalog and Product Pages

- Product listing and product details views.
- Product media gallery support (images + videos).
- Currency-aware product pricing display.
- Product badges and stock-aware presentation.

### Checkout and Reservation

- Multi-step checkout process.
- Customer billing/contact data collection.
- Country and currency context support.
- Coupon apply/validate path.
- Reservation fields generated from backend schema:
- text, textarea, number, date, select, radio, picture.
- Multi-name reservation input for supported fields.
- Blocked-date restrictions synced from backend booking settings.
- Partial-payment option when configured on product.

### Payment Journey

- EasyKash redirection for payment.
- Payment status page for success/failure/pending handling.
- Retry logic for failed/incomplete payments.
- Support for pay-link and custom pay-link token routes.

### Referral and Analytics

- Referral code capture from URL.
- Referral persistence through checkout session.
- Facebook Pixel tracking on client.
- Facebook CAPI forwarding through backend endpoint.

### SEO and Platform Basics

- robots.ts and sitemap.ts.
- Loading and not-found pages.
- Internationalized route handling.

## Main Routes

- /
- /products
- /products/[slug]
- /checkout
- /payment/status
- /payment/pay-link/[token]
- /payment/custom-pay-link/[token]
- /calc-aqeqa
- /privacy
- /terms
- /auth/login
- /auth/register
- /user

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS v4
- next-intl
- react-icons

## Environment Variables

Create manasik-v2/.env.local:

```env
BACKEND_URL=http://localhost:3000
BASE_URL=http://localhost:3001

NEXT_PUBLIC_FB_PIXEL_ID=
FB_PIXEL_ID=
FB_TEST_EVENT_CODE=
API_TOKEN=
```

## Scripts

- npm run dev
- npm run build
- npm start
- npm run lint

## Local Development

```bash
cd manasik-v2
npm install
npm run dev
```

Default local URL:

- http://localhost:3001

## Integration Notes

- Orders from this storefront are source-tagged as manasik in backend.
- Backend owns pricing, coupon validation, reservation rules, and payment state truth.
