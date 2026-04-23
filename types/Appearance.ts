export interface WorksImages {
  row1: string[];
  row2: string[];
}

export interface BannerText {
  ar: string;
  en: string;
}

export interface AppearanceData {
  worksImages: WorksImages;
  audioReviews: { ar: string[]; en: string[] };
  whatsAppDefaultMessage: string;
  bannerText: BannerText;
}
