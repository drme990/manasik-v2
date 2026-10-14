'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Container from '@/components/layout/container';
import { Section, SectionSubtitle, SectionTitle, SectionUpTitle } from '@/components/layout/section';
import { Clapperboard } from 'lucide-react';
import { ReelCard, cardsOf } from '@/components/reels/reel-card';
import { useReels } from '@/components/reels/use-reels';
import { checkReelVideos } from '@/lib/reels-gone';
import '@/components/reels/reels.css';

/** The viewer's code comes only when a reel is opened: the home page carries none of it until then. */
const ReelsViewer = dynamic(() => import('@/components/reels/reels-viewer'), { ssr: false });

/** How many cards fit the first screenful; their pictures are fetched first. */
const AHEAD = 3;
/** The cards' videos are asked about (one byte each) this long after the row is ready, clear of the page's own loading. */
const CHECK_AFTER_MS = 1200;

/**
 * The reels on the home page (owner, 2026-10-14), as the app's own row: equal portrait posters, each opening the
 * full-screen viewer on itself, and a last card that opens it on the first reel ("see all"). Rendered only while the
 * owner's «experience-reels» switch is on (app/[locale]/page.tsx); hidden when there is no reel to show.
 */
export default function ReelsSection() {
  const t = useTranslations('reels');
  const { reels, productsById, loading } = useReels();
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const cards = cardsOf(reels);

  // A card must not open onto a video the server no longer has (a deleted file a product still points at).
  // Each card's video is asked about once; one that is gone leaves the list, and the row with it.
  const videos = cards.map((reel) => reel.video).join('\n');
  useEffect(() => {
    if (!videos) return;
    const timer = setTimeout(() => checkReelVideos(videos.split('\n')), CHECK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [videos]);

  if (!loading && reels.length === 0) return null;

  return (
    <Section id="reels" className="reels">
      <SectionUpTitle>{t('upTitle')}</SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>
      <Container>
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x">
          {loading ? (
            <div className="reel-row" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="reel-card-skeleton" />
              ))}
            </div>
          ) : (
            <div className="reel-row" data-mo="row">
              {cards.map((reel, index) => {
                const name = reel.productName || reel.caption || t('clip', { number: index + 1 });
                return <ReelCard key={reel.id} reel={reel} name={name} label={t('open', { name })} early={index < AHEAD} onOpen={setOpen} />;
              })}
              {reels.length > 2 ? (
                <button type="button" className="reel-card" aria-label={t('seeAll')} onClick={() => setOpen(reels[0].id)}>
                  <span className="reel-card-clip">
                    <span className="reel-card-all">
                      <span className="reel-card-all-icon gradient-site gradient-text">
                        <Clapperboard size={26} aria-hidden="true" />
                      </span>
                      <span className="reel-card-all-title">{t('seeAll')}</span>
                      <span className="reel-card-all-hint">{t('count', { count: reels.length })}</span>
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </Container>
      {open ? <ReelsViewer reels={reels} productsById={productsById} start={open} onClose={close} /> : null}
    </Section>
  );
}
