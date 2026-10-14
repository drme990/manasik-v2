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

/**
 * One short video from the dashboard's reels list (the same list the mobile app shows). The array order is the
 * display order; `productId` links the reel to a product the customer can book from it.
 */
export interface Reel {
  id: string;
  /** Absolute https URL. */
  video: string;
  poster: string | null;
  caption: { ar: string; en: string };
  productId: string | null;
  platform: 'ghadaq' | 'manasik' | 'shared';
}

export interface AppearanceData {
  worksImages: WorksImages;
  audioReviews: AudioReview[];
  whatsAppDefaultMessage: string;
  bannerText: BannerText;
  documentationAnswer?: DocumentationAnswer;
  productsBanners: ProductBanner[];
  faqs?: FAQ[];
  /** Live numbers under "our work", counted from the orders on the server (rounded down). Absent on older servers. */
  liveStats?: { completedWorks?: number; happyClients?: number; countries?: number } | null;
  /** The dashboard's reels (shown on the website only while the «experience-reels» switch is on). */
  reels: Reel[];
  /** Abilities the server lists (`reelEngagement`: real likes and shares on the reels). */
  features: string[];
}
