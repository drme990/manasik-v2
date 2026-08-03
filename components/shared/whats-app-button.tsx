'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '../ui/button';
import { getStoredReferral } from '@/components/providers/referral-provider';
import { useAppearance } from '@/components/providers/appearance-provider';
import { fetchDefaultPhones } from '@/lib/default-phones';

const FALLBACK_MESSAGE = 'تصفحت موقعكم؛ ما هي أسعار الذبائح والعقائق؟';

export default function WhatsAppButton() {
  const [phone, setPhone] = useState<string | null>(null);
  const { appearance } = useAppearance();

  const encodedMessage = encodeURIComponent(
    appearance.whatsAppDefaultMessage?.trim() || FALLBACK_MESSAGE,
  );

  useEffect(() => {
    // Populate the default phone from the backend (cached).
    fetchDefaultPhones().then((phones) => {
      if (phones?.manasik) setPhone(phones.manasik);
    });

    // Override with the referral's phone if a referral is stored.
    const refId = getStoredReferral(null);
    if (!refId) return;

    fetch(`/api/referral/${encodeURIComponent(refId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.phone) {
          setPhone(data.data.phone);
        }
      })
      .catch(() => { });
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
