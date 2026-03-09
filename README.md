# Manasik Foundation — Public Web App

A bilingual (Arabic / English) **Next.js 16** public-facing application for **Manasik Foundation**, offering Islamic charitable services including Aqiqah, sacrifices, vows, and charity. Built with a custom green theme and full RTL support.

## Latest Updates (2026-03-09)

- Checkout was refactored into 2 clear steps: **Billing Information** then **Reservation Details**.
- Coupon input was moved into the **Order Summary** card so users can apply/remove coupons at any time.
- Terms agreement and payment option buttons (**Pay Full / Pay Half / Custom**) were moved into Billing step.
- Reservation step is still auto-skipped when product `reservationFields` are empty.
- Added a themed custom date picker for reservation fields of type `date`.
- Upgrade modal discount countdown now appears at the top in large centered minute/second cards.
- Product `upgradeFeatures` are now independent from `upgradeTo`, so even last-tier products can still define comparison features.

---

## Architecture

This app is a **client-only frontend**. It has no direct database connection. All API calls are proxied via Next.js rewrites to the shared `next-backend` Next.js serverless API.

```
User → manasik-v2 (:3001) → /api/* rewrite → next-backend (:3000) → MongoDB Atlas
```

---

## Tech Stack

| Concern        | Technology                              |
| -------------- | --------------------------------------- |
| Framework      | Next.js 16.1.6 (App Router)             |
| Language       | TypeScript                              |
| Styling        | Tailwind CSS v4                         |
| i18n           | next-intl v4 (Arabic RTL + English LTR) |
| Theme          | next-themes (light / dark)              |
| Icons          | Lucide React + React Icons              |
| Marquee        | react-fast-marquee                      |
| Currency flags | country-flag-icons                      |

---

## Features

- **Bilingual** — Arabic (RTL primary) and English, via `next-intl`
- **Product catalog** — Browse and purchase Islamic services
- **Aqiqah calculator** — Interactive cost estimator
- **Checkout flow** — Billing details, currency selection, coupon codes, referral tracking, partial payments, order notes
- **Referral tracking** — `?ref=` parameter captured on **any** page and persisted in sessionStorage via `ReferralProvider`, so the referral survives navigation to checkout
- **Payment** — EasyKash hosted payment page (handled by backend)
- **Order confirmation emails** — Sent automatically by backend on paid status
- **Multi-currency pricing** — Rates fetched from backend
- **Country-based visibility** — Products and prices filtered by country
- **Works gallery** — Two-row image slider managed from admin panel
- **SEO** — Dynamic `sitemap.xml`, `robots.txt`, Open Graph tags
- **PWA** — `site.webmanifest` for installable experience
- **Facebook Pixel** — Client-side + server-side Conversions API events

### Brand

- Primary: **#33ad6c** (green)
- Gradient: `#1f8a54 → #33ad6c → #5cc48f`
- Dark mode: navy `rgb(0, 15, 47)`
- Fonts: Satoshi (English), Expo Arabic

---

## Getting Started

### Prerequisites

- Node.js 18+
- `next-backend` running on port 3000 (or configured via `BACKEND_URL`)

### Install & run

```bash
cd manasik-v2
npm install
npm run dev -p 3001   # http://localhost:3001
```

### Environment variables

Create a `.env.local` file:

```env
# Backend API (the shared Next.js serverless API)
BACKEND_URL=http://localhost:3000

# Public site URL (used in meta tags / canonical)
BASE_URL=http://localhost:3001

# Facebook Pixel — client-side
NEXT_PUBLIC_FB_PIXEL_ID=your-pixel-id

# Facebook Conversions API — server-side
API_TOKEN=your-facebook-access-token
FB_PIXEL_ID=your-pixel-id
FB_TEST_EVENT_CODE=       # optional, for test events
```

> `NEXT_PUBLIC_*` variables are exposed to the browser. All others are server-only.

---

## Scripts

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start development server with Turbopack |
| `npm run build` | Production build                        |
| `npm start`     | Start production server                 |
| `npm run lint`  | Run ESLint                              |

---

## Related Projects

| Project         | Role                                     |
| --------------- | ---------------------------------------- |
| `next-backend/` | Shared API server (required to run)      |
| `ghadaq/`       | Sister public app for Ghadaq Association |
| `admin_panel/`  | Admin dashboard for both platforms       |

### Public-Facing

- **Bilingual** — Arabic (RTL) and English (LTR) support via `next-intl`
- **Product Catalog** — Browse and purchase Islamic services across multiple categories
- **Aqiqah Calculator** — Interactive calculator for estimating Aqiqah ceremony costs
- **Checkout Flow** — Full order flow with customer details, currency selection, and coupon support
- **Payment Gateway** — **EasyKash** Direct Payment API for secure online payments
- **Multi-Currency Pricing** — Real-time exchange rates, auto-pricing per country
- **Country-Based Routing** — Prices and visibility filtered by customer country
- **Testimonials Slider** — Marquee-based customer testimonial section
- **Referral System** — `?ref=` parameter captured on any landing page via `ReferralProvider` (sessionStorage), automatically passed through to checkout and order flow
- **Our Works Gallery** — Two-row image slider showcasing completed works, managed from the admin panel
- **SEO Ready** — Dynamic `sitemap.xml`, `robots.txt`, Open Graph meta tags
- **Light / Dark Theme** — User-switchable via `next-themes`
- **PWA Support** — `site.webmanifest` for installable experience

### Design & Branding

- Custom green gradient (`#1f8a54 → #33ad6c → #5cc48f`) as the primary brand color
- Navy blue dark mode background (`rgb(0, 15, 47)`)
- Light mode on white (`#fcfcfa`)
- Satoshi (English) and Expo Arabic fonts

---

## 🛠️ Tech Stack

| Category             | Technology                                 |
| -------------------- | ------------------------------------------ |
| Framework            | Next.js 16.1.6 (App Router, Turbopack)     |
| Language             | TypeScript                                 |
| Database             | MongoDB + Mongoose v9                      |
| Styling              | Tailwind CSS v4 with CSS custom properties |
| Internationalization | next-intl v4.8.2                           |
| Image Upload         | Cloudinary v2                              |
| Payment              | EasyKash Direct Payment API                |
| Icons                | Lucide React + React Icons                 |
| Theme                | next-themes v0.4.6                         |
| Marquee              | react-fast-marquee                         |
| Currency Flags       | country-flag-icons                         |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally or a cloud instance
- Cloudinary account (for image assets managed via admin)
- EasyKash account (for payment processing)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local   # or create manually (see below)

# 3. Seed countries data (required for currency/country features)
npm run seed:countries

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Important:** The admin panel (`admin_panel/`) must be used to create products, manage orders, and configure settings. This app does not have its own admin interface.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Database ──────────────────────────────────────────────────────
DATA_BASE_URL=mongodb://localhost:27017/manasik

# ── Application ───────────────────────────────────────────────────
BASE_URL=http://localhost:3000
NODE_ENV=development

# ── EasyKash Payment Gateway ──────────────────────────────────────
EASYKASH_API_KEY=your-easykash-api-key
EASYKASH_HMAC_SECRET=your-easykash-hmac-secret

> `DATA_BASE_URL` must point to **the same MongoDB database** used by the admin panel and the ghadaq app. All three apps share one database.

---

## 📁 Project Structure

```

manasik-v2/
├── app/ # Next.js App Router
│ ├── page.tsx # Homepage (landing page)
│ ├── layout.tsx # Root layout with fonts, providers
│ ├── globals.css # Global styles, CSS theme variables
│ ├── loading.tsx # Global loading UI
│ ├── not-found.tsx # 404 page
│ ├── robots.ts # robots.txt generator
│ ├── sitemap.ts # Dynamic sitemap generator
│ ├── products/ # Product listing & detail pages
│ ├── checkout/ # Checkout & order form
│ ├── payment/ # Payment success/failure status page
│ ├── calc-aqeqa/ # Aqiqah calculator page
│ ├── privacy/ # Privacy policy page
│ ├── terms/ # Terms & conditions page
│ └── api/ # Public API routes (no auth)
│ ├── appearance/ # GET works images (manasik-specific)
│ ├── countries/ # GET active countries
│ ├── coupons/validate # POST validate coupon code
│ ├── currency/rates # GET exchange rates
│ ├── payment/checkout # POST create EasyKash payment
│ ├── payment/webhook # POST EasyKash callback handler
│ ├── payment/status # GET order status by orderNumber
│ ├── payment/referral-info # GET referral info
│ └── products/ # GET products (public)
├── components/
│ ├── landing/ # Homepage sections (hero, works, testimonials, etc.)
│ ├── layout/ # Header, footer, navigation
│ ├── shared/ # Shared components (currency selector, etc.)
│ ├── providers/ # Context providers (theme, currency, cart)
│ └── ui/ # Base UI components (Button, Input, etc.)
├── hooks/
│ └── currency-hook.tsx # Currency context hook
├── i18n/
│ └── request.ts # next-intl server config
├── lib/ # Server utilities
│ ├── db.ts # MongoDB connection
│ ├── cloudinary.ts # Cloudinary config
│ ├── countries.ts # Country helpers
│ ├── coupon.ts # Coupon validation logic
│ ├── currency.ts # Currency conversion utilities
│ ├── easykash.ts # EasyKash Direct Payment API integration
│ ├── rate-limit.ts # API rate limiting
│ └── utils.ts # Shared utility functions
├── messages/
│ ├── ar.json # Arabic translations
│ └── en.json # English translations
├── models/ # Mongoose models (shared DB schema)
│ ├── Appearance.ts # Works images (per-project: 'manasik')
│ ├── Country.ts # Countries & currencies
│ ├── Coupon.ts # Discount coupons
│ ├── Order.ts # Customer orders
│ ├── Product.ts # Islamic service products
│ ├── Referral.ts # Referral partners
│ └── User.ts # Admin users (read-only from client)
├── types/ # TypeScript interfaces
├── public/ # Static assets
│ ├── fonts/ # Satoshi & Expo Arabic fonts
│ ├── icons/ # App icons & PWA icons
│ ├── testimonials/ # Testimonial images
│ ├── works/ # Fallback works images
│ └── site.webmanifest # PWA manifest
├── scripts/
│ ├── seed-countries.ts # Populate countries collection
│ └── migrate-product-v2.ts # Data migration helper
└── docs/ # Integration documentation
├── EASYKASH_INTEGRATION.md
└── FB_CONVERSIONS_API.md

````

---

## 🔧 Available Scripts

```bash
npm run dev            # Start development server (port 3000, Turbopack)
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run seed:countries # Seed countries & currencies into MongoDB
````

---

## 💳 Payment System

Payments are processed via **EasyKash Direct Payment API**. The checkout page (`/checkout`) collects customer details and creates a payment via `/api/payment/checkout`, which redirects the user to EasyKash for payment. After payment, EasyKash sends a callback to `/api/payment/webhook` with HMAC SHA-512 signature verification.

| Feature      | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| **Checkout** | Customer details → EasyKash redirect → payment status page     |
| **Webhook**  | HMAC-verified callback updates order status                    |
| **Status**   | `/payment/status?orderNumber=xxx` shows real-time order status |

---

## 🌍 Internationalization

- Supported locales: `ar` (Arabic, RTL) and `en` (English, LTR)
- Language detection via URL prefix (e.g. `/ar/products`, `/en/products`)
- Translations stored in `messages/ar.json` and `messages/en.json`
- Configured via `next-intl` with server-side locale resolution in `i18n/request.ts`

---

## 🖼️ Our Works Gallery

Images displayed in the homepage "Our Works" section are managed from:
**Admin Panel → Appearance → Manasik tab**

The homepage fetches `/api/appearance` which filters works images for the `manasik` project from MongoDB. Changes made in the admin panel reflect immediately after the next page load.

---

## 🔐 Security

- No admin authentication in this app — all write operations go through the admin panel
- Payment webhooks verified using EasyKash HMAC SHA-512 signature
- API rate limiting on checkout and payment routes
- Input validation on all API endpoints

---

## 📄 License

Private and proprietary to **Manasik Foundation**.
