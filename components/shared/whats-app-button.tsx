import Image from 'next/image';
import Button from '../ui/button';

export default function WhatsAppButton() {
  return (
    <Button
      href="https://wa.me/201027282396"
      variant="icon"
      size="custom"
      className="fixed bottom-4 left-4 z-50"
    >
      <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={24} height={24} />
    </Button>
  );
}
