'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '../ui/button';
import { getStoredReferral } from '@/components/providers/referral-provider';
import { useAppearance } from '@/components/providers/appearance-provider';
import { fetchDefaultPhones } from '@/lib/default-phones';
import { REF_EVENT } from '@/lib/referral';

const FALLBACK_MESSAGE = 'تصفحت موقعكم؛ ما هي أسعار الذبائح والعقائق؟';
export default function WhatsAppButton() {
  const [phone, setPhone] = useState<string | null>(null);
  const { appearance } = useAppearance();

  const encodedMessage = encodeURIComponent(
    appearance.whatsAppDefaultMessage?.trim() || FALLBACK_MESSAGE,
  );

  useEffect(() => {
    // The number follows the customer's code: his employee's number when he has a real code
    // (from his account, or the one this browser kept), the site's number otherwise. One answer
    // at a time, so a late answer can never put the other number back.
    let asked = 0;
    const show = async (ref: string) => {
      const mine = ++asked;
      let number: string | null = null;
      if (ref) {
        try {
          const res = await fetch(`/api/referral/${encodeURIComponent(ref)}`);
          const data = await res.json();
          if (data?.success && data.data?.phone) number = data.data.phone;
        } catch {
          number = null;
        }
      }
      if (!number) {
        const phones = await fetchDefaultPhones();
        number = phones?.manasik || null;
      }
      if (mine === asked && number) setPhone(number);
    };

    void show(getStoredReferral(null) || '');
    const onRef = (event: Event) => {
      const ref = (event as CustomEvent<{ ref?: string }>).detail?.ref || '';
      void show(ref);
    };
    window.addEventListener(REF_EVENT, onRef);
    return () => {
      asked = Number.MAX_SAFE_INTEGER;
      window.removeEventListener(REF_EVENT, onRef);
    };
  }, []);

  if (!phone) return null;

  return (
    <Button
      href={`https://api.whatsapp.com/send/?phone=${phone}&text=${encodedMessage}`}
      target="_blank"
      variant="icon"
      size="custom"
      className="fixed bottom-4 left-4 z-50"
    >
      <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={24} height={24} />
    </Button>
  );
}
