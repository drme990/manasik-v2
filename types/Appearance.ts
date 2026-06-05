export interface WorksImages {
  row1: string[];
  row2: string[];
}

export interface BannerText {
  ar: string;
  en: string;
}

export interface DocumentationAnswer {
  ar: string;
  en: string;
}

export interface ProductBanner {
  id: string;
  imageUrl: string;
  platform: 'ghadaq' | 'manasik' | 'shared';
  language: 'ar' | 'en' | 'shared';
  link: string;
}

export interface AudioReview {
  id: string;
  url: string;
  nameAr: string;
  nameEn: string;
  userImage: string;
  platform: 'ghadaq' | 'manasik' | 'shared';
  language: 'ar' | 'en' | 'shared';
  isMain: boolean;
}

export interface FAQ {
  id: string;
  question: { ar: string; en: string };
  answer: { ar: string; en: string };
  platform: 'ghadaq' | 'manasik' | 'shared';
  showOnProductDetails: boolean;
}

export interface AppearanceData {
  worksImages: WorksImages;
  audioReviews: AudioReview[];
  whatsAppDefaultMessage: string;
  bannerText: BannerText;
  documentationAnswer?: DocumentationAnswer;
  productsBanners: ProductBanner[];
  faqs?: FAQ[];
}
