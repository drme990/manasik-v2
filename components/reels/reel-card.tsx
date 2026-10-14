'use client';

import { memo } from 'react';
import { PlayIcon } from '@/components/reels/icons';
import type { Reel } from '@/lib/reels';

/** The row shows the first few; "see all" and every card open the full-screen viewer, which holds them all. */
export const SHOWN = 12;

/**
 * One reel in a row, exactly the app's card: the poster edge to edge at its full 9:16 size (132 × 235), the glossy
 * play mark, the title on a scrim — standing on a key's lip. Pressed, it sinks onto its lip. Only a picture here: no
 * video is loaded until the customer opens a reel.
 */
export const ReelCard = memo(function ReelCard({ reel, name, label, early, onOpen }: { reel: Reel; name: string; label: string; early: boolean; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="reel-card" aria-label={label} onClick={() => onOpen(reel.id)}>
      <span className="reel-card-clip">
        {reel.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- the posters come from the dashboard's storage at their own size
          <img src={reel.poster} alt="" className="reel-card-poster" loading={early ? 'eager' : 'lazy'} decoding="async" draggable={false} />
        ) : (
          <span className="reel-card-blank">
            <PlayIcon size={48} />
          </span>
        )}
        <span className="reel-card-rim" aria-hidden="true" />
        {reel.poster ? (
          <span className="reel-card-mark">
            <PlayIcon size={28} />
          </span>
        ) : null}
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
