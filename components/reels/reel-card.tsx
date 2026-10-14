'use client';

import { memo } from 'react';
import { Play } from 'lucide-react';
import type { Reel } from '@/lib/reels';

/** The row shows the first few; "see all" and every card open the full-screen viewer, which holds them all. */
export const SHOWN = 12;

/**
 * One reel in a row — the app's row, in the site's own card (owner, 2026-10-14): the poster at its full 9:16 size
 * (132 × 235) in a rounded card with the site's stroke, the green play mark, the title on a scrim. Only a picture
 * here: no video is loaded until the customer opens a reel.
 */
export const ReelCard = memo(function ReelCard({ reel, name, label, early, onOpen }: { reel: Reel; name: string; label: string; early: boolean; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="reel-card" aria-label={label} onClick={() => onOpen(reel.id)}>
      <span className="reel-card-clip">
        {reel.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- the posters come from the dashboard's storage at their own size
          <img src={reel.poster} alt="" className="reel-card-poster" loading={early ? 'eager' : 'lazy'} decoding="async" draggable={false} />
        ) : (
          // No poster (a customer's video featured from the dashboard): the clip's own first frame stands for it —
          // only its header is fetched (owner, 2026-10-14: the card showed nothing).
          <span className="reel-card-blank">
            <video src={`${reel.video}#t=0.1`} preload="metadata" muted playsInline disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-hidden="true" className="reel-card-poster" />
          </span>
        )}
        <span className="reel-card-rim" aria-hidden="true" />
        <span className="reel-card-mark gradient-site gradient-text">
          <Play size={14} fill="currentColor" aria-hidden="true" />
        </span>
        <span className="reel-card-name">{name}</span>
      </span>
    </button>
  );
});

/** The first cards the row shows: one per product picture (it opens on the product's first clip; the viewer holds them all). */
export function cardsOf(reels: readonly Reel[], limit: number = SHOWN): Reel[] {
  const seen = new Set<string>();
  const unique: Reel[] = [];
  for (const reel of reels) {
    const key = reel.productId ? `${reel.productId}|${reel.poster ?? ''}` : reel.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(reel);
    if (unique.length >= limit) break;
  }
  return unique;
}
