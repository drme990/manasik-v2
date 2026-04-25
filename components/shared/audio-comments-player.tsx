'use client';

import { useTranslations } from 'next-intl';
import { LuPlay } from 'react-icons/lu';
import Button from '../ui/button';
import { AudioReview } from '@/types/Appearance';
import { useAudioPlayer } from '../providers/audio-player-provider';

interface AudioCommentsPlayerProps {
  audioReviews: AudioReview[];
}

export default function AudioCommentsPlayer({
  audioReviews,
}: AudioCommentsPlayerProps) {
  const t = useTranslations('productDetails');
  const { isOpen, isPlaying, openPlayer } = useAudioPlayer();

  if (!audioReviews.length) return null;

  return (
    <Button
      variant="primary"
      className="w-full flex items-center justify-center gap-3 group relative overflow-hidden"
      onClick={() => openPlayer(audioReviews)}
    >
      <div className="relative flex items-center justify-center">
        {isOpen && isPlaying ? (
          <span className="absolute h-10 w-10 rounded-full border-2 border-white border-t-stroke animate-spin" />
        ) : (
          <>
            <span className="absolute inline-flex h-9 w-9 rounded-full bg-white/40 animate-ping [animation-duration:2s]" />
            <span className="absolute inline-flex h-9 w-9 rounded-full bg-white/30 animate-ping [animation-duration:2s] [animation-delay:300ms]" />
          </>
        )}
        <div className="relative z-10 flex items-center justify-center h-9 w-9 rounded-full border border-white">
          <LuPlay
            size={18}
            className="transition-transform group-hover:scale-110 text-white"
          />
        </div>
      </div>
      <span className="font-medium">{t('audioCommentsButton')}</span>
    </Button>
  );
}
