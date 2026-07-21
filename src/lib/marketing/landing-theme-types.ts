export const LANDING_VARIANTS = ['harbor', 'market', 'route'] as const;

export type LandingVariantId = (typeof LANDING_VARIANTS)[number];

export const DEFAULT_LANDING_VARIANT: LandingVariantId = 'harbor';

export const LANDING_VARIANT_SETTING_KEY = 'landing_page_variant';

export type LandingVariantMeta = {
  id: LandingVariantId;
  name: string;
  tagline: string;
  description: string;
  swatches: [string, string, string];
  heroImage: string;
};

export const LANDING_VARIANT_META: Record<LandingVariantId, LandingVariantMeta> = {
  harbor: {
    id: 'harbor',
    name: '夜港街坊',
    tagline: '城市夜景 · 品牌沉浸',
    description: '深色全幅夜景 Hero，適合強調本地都會感與品牌識別。',
    swatches: ['#0c0a09', '#f97316', '#f5f5f4'],
    heroImage:
      'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1600&q=70',
  },
  market: {
    id: 'market',
    name: '街市晨光',
    tagline: '新鮮在地 · 日間明亮',
    description: '明亮日景與鮮食氛圍，適合強調美食、街市與日常採買。',
    swatches: ['#ecfdf5', '#0f766e', '#ea580c'],
    heroImage:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=70',
  },
  route: {
    id: 'route',
    name: '配送路線',
    tagline: '送到你家 · 流程優先',
    description: '以配送旅程為主視覺，適合強調下單到送達的清楚流程。',
    swatches: ['#0f172a', '#f97316', '#e2e8f0'],
    heroImage:
      'https://images.unsplash.com/photo-1526367790991-024597187cdc?auto=format&fit=crop&w=1600&q=70',
  },
};

export function isLandingVariantId(value: unknown): value is LandingVariantId {
  return typeof value === 'string' && (LANDING_VARIANTS as readonly string[]).includes(value);
}

export function parseLandingVariant(raw: unknown): LandingVariantId {
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/^"|"$/g, '');
    if (isLandingVariantId(cleaned)) return cleaned;
  }
  return DEFAULT_LANDING_VARIANT;
}
