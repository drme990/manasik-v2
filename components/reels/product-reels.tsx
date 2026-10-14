'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { ReelCard } from '@/components/reels/reel-card';
import { useReels } from '@/components/reels/use-reels';
import { checkReelVideos } from '@/lib/reels-gone';
import '@/components/reels/reels.css';

const ReelsViewer = dynamic(() => import('@/components/reels/reels-viewer'), { ssr: false });

/**
 * This product's reels on its page (owner, 2026-10-14): the same cards as the home row, only the clips linked to this
 * product; a tap opens the full-screen viewer on that clip (with every reel behind it). Nothing is drawn when the
 * product has no reel. Rendered only while the «experience-reels» switch is on.
 */
export default function ProductReels({ productId }: { productId: string }) {
  const t = useTranslations('reels');
  const { reels, productsById, loading } = useReels();
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const own = useMemo(() => reels.filter((reel) => reel.productId === productId), [reels, productId]);
  const videos = own.map((reel) => reel.video).join('\n');
  useEffect(() => {
    if (!videos) return;
    const timer = setTimeout(() => checkReelVideos(videos.split('\n')), 1200);
    return () => clearTimeout(timer);
  }, [videos]);

  if (loading || own.length === 0) return null;

  return (
    <section className="reels flex flex-col gap-3" aria-labelledby="product-reels-title">
      <h2 id="product-reels-title" className="text-base font-bold">
        {t('title')}
      </h2>
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x">
        <div className="reel-row">
          {own.map((reel, index) => {
            const name = reel.caption || reel.productName || t('clip', { number: index + 1 });
            return <ReelCard key={reel.id} reel={reel} name={name} label={t('open', { name })} early={index < 3} onOpen={setOpen} />;
          })}
        </div>
      </div>
      {open ? <ReelsViewer reels={reels} productsById={productsById} start={open} onClose={close} /> : null}
    </section>
  );
}
