import { NextRequest, NextResponse } from 'next/server';
import { sendFBEvent } from '@/lib/fb-capi';

/**
 * POST /api/fb-event
 *
 * Proxy route that client components use to relay events to the
 * Facebook Conversions API. The server adds IP + User-Agent
 * automatically so PII never travels through the browser.
 *
 * Body: { event_name, event_id?, event_source_url?, user_data?, custom_data? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_name, event_id, event_source_url, user_data, custom_data } =
      body;

    if (!event_name) {
      return NextResponse.json(
        { success: false, error: 'event_name is required' },
        { status: 400 },
      );
    }

    // Extract IP and UA from the incoming request
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    // Fire-and-forget (don't block the response)
    sendFBEvent({
      event_name,
      event_id,
      event_source_url,
      action_source: 'website',
      user_data: {
        ...(user_data || {}),
        client_ip_address: ip,
        client_user_agent: userAgent,
      },
      custom_data,
    }).catch(() => {
      /* swallow — analytics must not break the app */
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FB Event API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process event' },
      { status: 500 },
    );
  }
}
