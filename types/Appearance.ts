export interface WorksImages {
  row1: string[];
  row2: string[];
}

export interface BannerText {
  ar: string;
  en: string;
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

export interface AppearanceData {
  worksImages: WorksImages;
  audioReviews: AudioReview[];
  whatsAppDefaultMessage: string;
  bannerText: BannerText;
}
