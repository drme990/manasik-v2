/**
 * Migration script: Product V2
 *
 * Migrates existing products from the legacy schema to the new
 * always-sizes / baseCurrency / partialPayment schema.
 *
 * Run with:
 *   npx tsx scripts/migrate-product-v2.ts
 *
 * What it does for each product:
 *  1. Sets `baseCurrency` from `mainCurrency || currency || 'SAR'`
 *  2. Sets `isActive = true` (new field, default on)
 *  3. Migrates `image` into `images[]` if not already present
 *  4. If no sizes exist, creates a single default size from product-level
 *     price, prices, easykashLinks, and feedsUp
 *  5. Migrates `allowPartialPayment`, `minimumPaymentType`, `minimumPayments`
 *     into the `partialPayment` sub-document
 *  6. Removes legacy fields:
 *     - price, currency, mainCurrency, prices
 *     - image, allowPartialPayment, minimumPayment, minimumPaymentType
 *     - minimumPayments, easykashLinks, feedsUp
 */

import mongoose from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.DATA_BASE_URL;
if (!MONGODB_URI) {
  console.error('DATA_BASE_URL is not defined in .env');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  const collection = db.collection('products');

  const products = await collection.find({}).toArray();
  console.log(`Found ${products.length} products to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const product of products) {
    // Skip if already migrated (has baseCurrency AND sizes with at least 1 entry)
    if (
      product.baseCurrency &&
      product.partialPayment &&
      Array.isArray(product.sizes) &&
      product.sizes.length >= 1
    ) {
      skipped++;
      continue;
    }

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, string> = {};

    // 1. baseCurrency
    $set.baseCurrency = product.mainCurrency || product.currency || 'SAR';

    // 2. isActive
    if (product.isActive === undefined) {
      $set.isActive = true;
    }

    // 3. images — merge legacy `image` into `images[]`
    const existingImages: string[] = product.images || [];
    if (
      product.image &&
      typeof product.image === 'string' &&
      !existingImages.includes(product.image)
    ) {
      existingImages.unshift(product.image);
    }
    $set.images = existingImages;

    // 4. Ensure sizes >= 1
    const existingSizes: unknown[] = product.sizes || [];
    if (existingSizes.length === 0) {
      // Build a default size from product-level fields
      $set.sizes = [
        {
          name: { ar: 'الافتراضي', en: 'Default' },
          price: product.price || 0,
          prices: product.prices || [],
          easykashLinks: product.easykashLinks || {
            fullPayment: '',
            halfPayment: '',
            customPayment: '',
          },
          feedsUp: product.feedsUp || 0,
        },
      ];
    }

    // 5. partialPayment sub-document
    $set.partialPayment = {
      isAllowed: product.allowPartialPayment || false,
      minimumType:
        product.minimumPaymentType ||
        product.minimumPayment?.type ||
        'percentage',
      minimumPayments: product.minimumPayments || [],
    };

    // 6. Remove legacy fields
    const legacyFields = [
      'price',
      'currency',
      'mainCurrency',
      'prices',
      'image',
      'allowPartialPayment',
      'minimumPayment',
      'minimumPaymentType',
      'minimumPayments',
      'easykashLinks',
      'feedsUp',
    ];
    for (const field of legacyFields) {
      $unset[field] = '';
    }

    await collection.updateOne({ _id: product._id }, { $set, $unset });

    migrated++;
    console.log(
      `  ✓ Migrated: ${product.name?.ar || product._id} → baseCurrency=${$set.baseCurrency}, sizes=${(($set.sizes as unknown[]) || existingSizes).length}`,
    );
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
