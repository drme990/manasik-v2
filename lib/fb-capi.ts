/**
 * Server-side Facebook CAPI relay for storefront server components.
 *
 * Instead of holding Meta credentials locally, this forwards the event
 * to the backend `/api/fb-event` bridge — the backend owns the pixel id
 * and access token and applies the correct PII hashing there.
 *
 * Used by the product detail `page.tsx` to fire ViewContent server-side.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export interface FBUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
  external_id?: string;
}

export interface FBCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
}

interface BridgeEvent {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  user_data?: FBUserData;
  custom_data?: FBCustomData;
}

async function postToBackendBridge(event: BridgeEvent): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/fb-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      // Fire-and-forget from a server component — don't let tracking
      // delay page render.
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function trackViewContent(opts: {
  productId: string;
  productName: string;
  value: number;
  currency: string;
  sourceUrl?: string;
  userData: FBUserData;
  eventId?: string;
}): Promise<boolean> {
  return postToBackendBridge({
    event_name: 'ViewContent',
    event_id: opts.eventId,
    event_source_url: opts.sourceUrl,
    user_data: opts.userData,
    custom_data: {
      content_ids: [opts.productId],
      content_type: 'product',
      content_name: opts.productName,
      value: opts.value,
      currency: opts.currency,
    },
  });
}
