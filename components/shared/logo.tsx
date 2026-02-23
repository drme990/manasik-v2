'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="block w-fit">
      <Image
        src="/logo-light.png"
        alt="مؤسسة مناسك"
        width={120}
        height={40}
        className="dark:hidden"
        priority
      />
      <Image
        src="/logo-dark.png"
        alt="مؤسسة مناسك"
        width={120}
        height={40}
        className="hidden dark:block"
        priority
      />
    </Link>
  );
}
