/**
 * Seed script: Populates the database with the initial set of supported countries.
 *
 * Usage: npx tsx scripts/seed-countries.ts
 *
 * Countries:
 *   Egypt, Saudi Arabia, Kuwait, Qatar, UAE, Bahrain, Jordan,
 *   Turkey, USA, UK, Germany, France, Italy
 */

import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.DATA_BASE_URL || 'mongodb://localhost:27017/manasik';

const countries = [
  {
    code: 'EG',
    name: { ar: 'مصر', en: 'Egypt' },
    currencyCode: 'EGP',
    currencySymbol: 'ج.م',
    flagEmoji: '🇪🇬',
    isActive: true,
  },
  {
    code: 'SA',
    name: { ar: 'السعودية', en: 'Saudi Arabia' },
    currencyCode: 'SAR',
    currencySymbol: 'ر.س',
    flagEmoji: '🇸🇦',
    isActive: true,
  },
  {
    code: 'KW',
    name: { ar: 'الكويت', en: 'Kuwait' },
    currencyCode: 'KWD',
    currencySymbol: 'د.ك',
    flagEmoji: '🇰🇼',
    isActive: true,
  },
  {
    code: 'QA',
    name: { ar: 'قطر', en: 'Qatar' },
    currencyCode: 'QAR',
    currencySymbol: 'ر.ق',
    flagEmoji: '🇶🇦',
    isActive: true,
  },
  {
    code: 'AE',
    name: { ar: 'الإمارات', en: 'United Arab Emirates' },
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    flagEmoji: '🇦🇪',
    isActive: true,
  },
  {
    code: 'BH',
    name: { ar: 'البحرين', en: 'Bahrain' },
    currencyCode: 'BHD',
    currencySymbol: 'د.ب',
    flagEmoji: '🇧🇭',
    isActive: true,
  },
  {
    code: 'JO',
    name: { ar: 'الأردن', en: 'Jordan' },
    currencyCode: 'JOD',
    currencySymbol: 'د.أ',
    flagEmoji: '🇯🇴',
    isActive: true,
  },
  {
    code: 'TR',
    name: { ar: 'تركيا', en: 'Turkey' },
    currencyCode: 'TRY',
    currencySymbol: '₺',
    flagEmoji: '🇹🇷',
    isActive: true,
  },
  {
    code: 'US',
    name: { ar: 'الولايات المتحدة الأمريكية', en: 'United States' },
    currencyCode: 'USD',
    currencySymbol: '$',
    flagEmoji: '🇺🇸',
    isActive: true,
  },
  {
    code: 'GB',
    name: { ar: 'بريطانيا', en: 'United Kingdom' },
    currencyCode: 'GBP',
    currencySymbol: '£',
    flagEmoji: '🇬🇧',
    isActive: true,
  },
  {
    code: 'DE',
    name: { ar: 'ألمانيا', en: 'Germany' },
    currencyCode: 'EUR',
    currencySymbol: '€',
    flagEmoji: '🇩🇪',
    isActive: true,
  },
  {
    code: 'FR',
    name: { ar: 'فرنسا', en: 'France' },
    currencyCode: 'EUR',
    currencySymbol: '€',
    flagEmoji: '🇫🇷',
    isActive: true,
  },
  {
    code: 'IT',
    name: { ar: 'إيطاليا', en: 'Italy' },
    currencyCode: 'EUR',
    currencySymbol: '€',
    flagEmoji: '🇮🇹',
    isActive: true,
  },
];

async function seed() {
  console.log('🌍 Connecting to database...');
  await mongoose.connect(MONGODB_URI);

  // Import model after connection
  const { default: Country } = await import('../models/Country');

  console.log('🌱 Seeding countries...');

  for (const country of countries) {
    const existing = await Country.findOne({ code: country.code });
    if (existing) {
      console.log(`  ⏭️  ${country.code} (${country.name.en}) already exists, skipping.`);
      continue;
    }

    await Country.create(country);
    console.log(`  ✅ ${country.code} (${country.name.en}) created.`);
  }

  console.log(`\n✨ Done! ${countries.length} countries processed.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
