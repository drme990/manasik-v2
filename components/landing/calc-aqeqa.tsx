'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import Container from '../layout/container';
import { Section } from '../layout/section';
import Button from '../ui/button';
import { useTranslations } from 'next-intl';

/** The demo's steps: boys and girls, as if pressed on the calculator one «+» at a time. */
const STEPS: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [2, 1],
];
const STEP_MS = 1100;
const HOLD_MS = 2200;

/** The calculator's own counter, small and not pressable (the card is a preview of it). */
function MiniCounter({ title, hint, value, pressed }: { title: string; hint: string; value: number; pressed: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-site border p-3 transition-colors duration-300 ${value > 0 ? 'border-primary/60 bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))]' : 'border-stroke bg-card-bg'}`}>
      <div className="text-center">
        <p className="text-base font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-secondary">{hint}</p>
      </div>
      <div className="flex w-full items-center justify-between gap-1" dir="ltr">
        <span className={`grid size-8 place-items-center rounded-full border border-stroke text-foreground ${value === 0 ? 'opacity-30' : ''}`}>
          <LuMinus size={14} />
        </span>
        <span key={value} className={`aqeqa-pop min-w-6 text-center text-2xl font-bold tabular-nums ${value ? 'text-primary' : 'text-secondary'}`}>{value}</span>
        <span className={`aqeqa-plus grid size-8 place-items-center rounded-full bg-primary text-white shadow-[0_6px_16px_-6px_var(--primary)] ${pressed ? 'is-pressed' : ''}`}>
          <LuPlus size={14} />
        </span>
      </div>
    </div>
  );
}

/**
 * «احسب عقيقتك» as a small, living preview of the calculator itself (owner, 2026-10-17: «مستوحاه من الحاسبة فعلًا»):
 * its two counters fill in by themselves — a boy, a girl, another boy — the sheep pop in one by one and the
 * «عدد الذبائح المطلوب» chip counts with them; then it starts again. It plays only on screen, and stands still at
 * one boy and one girl for whoever asked the phone for less motion. The key breathes so it is pressed.
 */
export function AqeqaCard() {
  const t = useTranslations('landing.calcAqeqa');
  const tc = useTranslations('calcAqeqa');
  const box = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(2);
  const [pressed, setPressed] = useState<'m' | 'f' | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let i = 0;
    let visible = false;
    const tick = () => {
      if (!visible) return;
      i = (i + 1) % STEPS.length;
      const [m, f] = STEPS[i];
      const [pm, pf] = STEPS[(i + STEPS.length - 1) % STEPS.length];
      setPressed(m > pm ? 'm' : f > pf ? 'f' : null);
      setStep(i);
      setTimeout(() => setPressed(null), 220);
      timer = setTimeout(tick, i === STEPS.length - 1 ? HOLD_MS : STEP_MS);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (timer) clearTimeout(timer);
      if (visible) timer = setTimeout(tick, 500);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const [males, females] = STEPS[step];
  const required = males * 2 + females;

  return (
    <div ref={box} data-mo="pop" className="aqeqa-card w-full bg-card-bg flex flex-col items-center gap-5 rounded-site border border-stroke p-5 mx-auto text-center">
      <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
      <div className="w-full" aria-hidden="true">
        <div className="grid grid-cols-2 gap-2.5">
          <MiniCounter title={tc('males')} hint={tc('perBoy')} value={males} pressed={pressed === 'm'} />
          <MiniCounter title={tc('females')} hint={tc('perGirl')} value={females} pressed={pressed === 'f'} />
        </div>
        <div className="mt-3 flex min-h-[78px] flex-col items-center justify-center gap-2">
          {required > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {Array.from({ length: required }, (_, i) => (
                  <Image key={i} src="/icons3d/sheep-face.svg" alt="" width={30} height={30} unoptimized className="aqeqa-pop" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
              <p key={required} className="aqeqa-pop inline-flex items-center gap-2 rounded-full border border-primary/40 bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))] px-3.5 py-1 text-sm font-bold text-primary">
                <ShieldCheck size={15} aria-hidden />
                {tc('requiredCount', { count: required })}
              </p>
            </>
          ) : (
            <p className="text-sm text-secondary">{tc('hint')}</p>
          )}
        </div>
      </div>
      <p className="text-secondary text-base leading-relaxed">{t('description')}</p>
      <Button className="aqeqa-cta w-full" href="/calc-aqeqa">
        {t('button')}
      </Button>
    </div>
  );
}

export default function CalcAqeqa() {
  return (
    <Section id="calc-aqeqa">
      <Container>
        <AqeqaCard />
      </Container>
      <div className="gbf gbf-lg gbf-bottom h-1"></div>
    </Section>
  );
}
