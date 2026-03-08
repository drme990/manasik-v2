'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '../ui/button';
import { getStoredReferral } from '@/components/providers/referral-provider';

const DEFAULT_PHONE = '201027282396';
const DEFAULT_TEXT =
  '%D8%AA%D8%B5%D9%81%D8%AD%D8%AA%20%D9%85%D9%88%D9%82%D8%B9%D9%83%D9%85%D8%9B%20%D9%85%D8%A7%20%D9%87%D9%8A%20%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D8%B0%D8%A8%D8%A7%D8%A6%D8%AD%20%D9%88%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%A6%D9%82%D8%9F';

export default function WhatsAppButton() {
  const [phone, setPhone] = useState(DEFAULT_PHONE);

  useEffect(() => {
    const refId = getStoredReferral(null);
    if (!refId) return;

    fetch(`/api/referral/${encodeURIComponent(refId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.phone) {
          setPhone(data.data.phone);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Button
      href={`https://api.whatsapp.com/send/?phone=${phone}&text=${DEFAULT_TEXT}`}
      target="_blank"
      variant="icon"
      size="custom"
      className="fixed bottom-4 left-4 z-50"
    >
      <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={24} height={24} />
    </Button>
  );
}
