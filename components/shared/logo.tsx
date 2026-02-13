'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="block">
      <Image
        src="/logo-light.png"
        alt="Manasik Logo"
        width={150}
        height={40}
        className="dark:hidden w-37.5 h-10"
        priority
      />
      <Image
        src="/logo-dark.png"
        alt="Manasik Logo"
        width={150}
        height={40}
        className="hidden dark:block w-37.5 h-10"
        priority
      />
    </Link>
  );
}
