'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useReels } from '@/components/reels/use-reels';
import { cardsOf } from '@/components/reels/reel-card';
import '@/components/reels/reels.css';

const ReelsViewer = dynamic(() => import('@/components/reels/reels-viewer'), { ssr: false });

/**
 * The products page's reels as story circles above the products (owner, 2026-10-16): a small row of round faces,
 * each opening the full-screen viewer on its clip, so the products stay on the first screen. The customers'
 * own videos first (titled «تجارب عملائنا بالفيديو»); with none, the site's clips under «شاهد بنفسك».
 * Hidden while there is no reel.
 */
export default function ReelsStories() {
  const t = useTranslations('reels');
  const { reels, productsById, loading } = useReels();
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);

  if (loading || reels.length === 0) return null;
  const customers = reels.filter((reel) => reel.review);
  const shown = cardsOf(customers.length ? customers : reels, 12);

  return (
    <section aria-label={customers.length ? t('storiesCustomers') : t('title')} className="mb-5">
      <h2 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-bold text-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
        {customers.length ? t('storiesCustomers') : t('title')}
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3.5 pb-1">
          {shown.map((reel, index) => {
            const name = reel.review?.name || reel.productName || reel.caption || t('clip', { number: index + 1 });
            return (
              <button
                key={reel.id}
                type="button"
                onClick={() => setOpen(reel.id)}
                aria-label={t('open', { name })}
                className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className="block h-[76px] w-[76px] rounded-full bg-gradient-to-tr from-success via-emerald-400 to-success p-[3px] transition-transform group-active:scale-95">
                  <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-background bg-card-bg">
                    {reel.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the posters come from the dashboard's storage
                      <img src={reel.poster} alt="" loading={index < 5 ? 'eager' : 'lazy'} decoding="async" draggable={false} className="h-full w-full object-cover" />
                    ) : (
                      // No poster: the clip's first frame (only its header is fetched).
                      <video src={`${reel.video}#t=0.1`} preload="metadata" muted playsInline disablePictureInPicture tabIndex={-1} aria-hidden="true" className="h-full w-full object-cover" />
                    )}
                  </span>
                </span>
                <span className="w-full truncate text-center text-xs text-secondary">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
      {open ? <ReelsViewer reels={reels} productsById={productsById} start={open} onClose={close} /> : null}
    </section>
  );
}
