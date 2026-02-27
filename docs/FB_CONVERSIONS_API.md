# Facebook Conversions API (CAPI) Integration

## Overview

This project integrates the **Facebook Conversions API** alongside the existing **Meta Pixel** (client-side) to send conversion events to Facebook from both the browser and the server. This dual approach provides:

- **Better data quality** — server-side events aren't blocked by ad blockers
- **Deduplication** — both client & server events share the same `event_id`, so Facebook counts them once
- **Richer user data** — server-side events include hashed PII (email, phone, name) for better matching

---

## Architecture

```
Browser (Client)                          Server
─────────────────                         ──────
Meta Pixel (fbq)  ─── PageView ──────►   Facebook

fb-pixel.ts       ─── ViewContent ───►   /api/fb-event ──► FB Conversions API
                  ─── InitiateCheckout    (adds IP + UA)
                  ─── AddPaymentInfo
                  ─── Purchase

                                         products/[id]/page.tsx ──► FB CAPI (ViewContent)
                                         api/payment/checkout   ──► FB CAPI (InitiateCheckout)
                                         api/payment/webhook    ──► FB CAPI (Purchase) ⭐ most critical
```

---

## Files

| File                               | Type      | Purpose                                                                                                                |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lib/fb-capi.ts`                   | Server    | Core FB Conversions API utility. Hashes PII with SHA-256, sends events to `graph.facebook.com/v21.0/{PIXEL_ID}/events` |
| `lib/fb-pixel.ts`                  | Client    | Helper that fires `window.fbq()` (pixel) AND relays the same event to `/api/fb-event` for server-side dedup            |
| `app/api/fb-event/route.ts`        | API Route | Proxy endpoint — client components POST here, server adds client IP + User-Agent, then forwards to FB CAPI             |
| `components/shared/meta-pixel.tsx` | Client    | Existing Meta Pixel script (loads `fbevents.js`, fires `PageView`)                                                     |

---

## Events Tracked

| Event                | Trigger                                | Client-Side (Pixel)                                | Server-Side (CAPI)                                           |
| -------------------- | -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| **PageView**         | Every page load                        | `meta-pixel.tsx` (automatic)                       | —                                                            |
| **ViewContent**      | Product detail page viewed             | `product-details-client.tsx` (useEffect on mount)  | `products/[id]/page.tsx` (SSR, fire-and-forget)              |
| **InitiateCheckout** | Checkout page loaded with product      | `checkout/page.tsx` (useEffect when product loads) | `api/payment/checkout/route.ts` (after order creation)       |
| **AddPaymentInfo**   | User proceeds to billing form (step 2) | `checkout/page.tsx` (useEffect on step change)     | —                                                            |
| **Purchase**         | Payment confirmed successful           | `payment/status/page.tsx` (useEffect on success)   | `api/payment/webhook/route.ts` (when order status = paid) ⭐ |

> **Purchase via webhook is the most critical event** — it fires server-side when Paymob confirms payment, ensuring it's captured even if the user closes the browser before the redirect.

---

## Environment Variables

Add these to your `.env` file:

```env
# REQUIRED — Facebook Graph API access token
# (Already exists in your .env as API_TOKEN)
API_TOKEN=EAAKrDYZ...your-token...

# OPTIONAL — Facebook Pixel ID (defaults to 1545349236553470 if omitted)
FB_PIXEL_ID=1545349236553470

# OPTIONAL — Test Event Code for Facebook Events Manager testing
# This makes events appear in Events Manager > Test Events tab
# REMOVE THIS IN PRODUCTION — it's only for testing
FB_TEST_EVENT_CODE=TEST12345
```

### How to get the values

| Variable             | Where to get it                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_TOKEN`          | [Facebook Business Settings > System Users](https://business.facebook.com/settings/system-users) — generate a token with `ads_management` and `business_management` permissions |
| `FB_PIXEL_ID`        | [Facebook Events Manager](https://business.facebook.com/events_manager2) — your Dataset/Pixel ID                                                                                |
| `FB_TEST_EVENT_CODE` | Events Manager > Test Events tab > shows a generated test code                                                                                                                  |

---

## How Deduplication Works

1. Client-side: `trackEvent()` in `fb-pixel.ts` generates a unique `event_id` (UUID)
2. It fires `fbq('track', 'EventName', params, { eventID: eventId })` — this sends to Facebook via the pixel
3. It simultaneously POSTs to `/api/fb-event` with the same `event_id` — this relays to the Conversions API
4. Facebook receives both events with the same `event_id` and deduplicates them (counts as one)

For server-only events (webhook Purchase), no client dedup is needed — the server event is the source of truth.

---

## How PII Hashing Works

The Conversions API requires user data to be **SHA-256 hashed** before sending. The `fb-capi.ts` library handles this automatically:

- **Hashed fields**: `em` (email), `ph` (phone), `fn` (first name), `ln` (last name), `country`, `external_id`
- **Not hashed** (transport fields): `client_ip_address`, `client_user_agent`, `fbc`, `fbp`

All hashing follows Facebook's requirements: lowercase, trimmed, then SHA-256.

---

## Testing

### 1. Enable test mode

Add to `.env`:

```env
FB_TEST_EVENT_CODE=TEST12345
```

(Use the actual code from your Events Manager > Test Events tab)

### 2. Open your app and perform actions

- View a product → should fire `ViewContent`
- Go to checkout → should fire `InitiateCheckout`
- Fill billing info (step 2) → should fire `AddPaymentInfo`
- Complete payment → should fire `Purchase`

### 3. Check Events Manager

Go to [Facebook Events Manager > Test Events](https://business.facebook.com/events_manager2) and verify events appear with correct data.

### 4. Remove test code

Once verified, **remove** `FB_TEST_EVENT_CODE` from `.env` so events go to production.

---

## Troubleshooting

| Issue                                         | Solution                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Events not appearing in Events Manager        | Check that `API_TOKEN` is valid and has correct permissions. Check server logs for `[FB CAPI]` messages   |
| Duplicate events in Events Manager            | Ensure `event_id` is being passed correctly — both pixel and CAPI should use the same ID                  |
| "No access token configured" warning          | `API_TOKEN` is missing or empty in `.env`                                                                 |
| Events show in Test Events but not production | Remove `FB_TEST_EVENT_CODE` from `.env`                                                                   |
| Low Event Match Quality score                 | Send more user data (email, phone, name, country) — the checkout and webhook events already include these |

---

## Data Flow Per Event

### ViewContent

```
User visits /products/[id]
  ├─ Server (page.tsx): trackViewContent() → FB CAPI (with IP + UA from headers)
  └─ Client (product-details-client.tsx): trackEvent('ViewContent') → pixel + /api/fb-event → FB CAPI
```

### InitiateCheckout

```
User visits /checkout
  ├─ Client (checkout/page.tsx): trackEvent('InitiateCheckout') → pixel + /api/fb-event → FB CAPI
  └─ Server (api/payment/checkout): trackInitiateCheckout() → FB CAPI (with email, phone, name)
```

### Purchase

```
Payment succeeds
  ├─ Server (api/payment/webhook): trackPurchase() → FB CAPI (with full billing data) ⭐
  └─ Client (payment/status): trackEvent('Purchase') → pixel + /api/fb-event → FB CAPI
```
