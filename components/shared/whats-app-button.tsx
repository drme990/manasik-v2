import Image from 'next/image';
import Button from '../ui/button';

export default function WhatsAppButton() {
  return (
    <Button
      href="https://api.whatsapp.com/send/?phone=201027282396&text=%D8%AA%D8%B5%D9%81%D8%AD%D8%AA%20%D9%85%D9%88%D9%82%D8%B9%D9%83%D9%85%D8%9B%20%D9%85%D8%A7%20%D9%87%D9%8A%20%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D8%B0%D8%A8%D8%A7%D8%A6%D8%AD%20%D9%88%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%A6%D9%82%D8%9F"
      target="_blank"
      variant="icon"
      size="custom"
      className="fixed bottom-4 left-4 z-50"
    >
      <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={24} height={24} />
    </Button>
  );
}
