import { DEFAULT_TEXTURES } from '../types';

const DEFAULT_STYLES = [
  "Keith Haring Street",
  "Basquiat Neo-Expressionist",
  "Takashi Murakami Superflat",
  "Yayoi Kusama Polka Dot",
  "Banksy Stencil Art",
  "Jeff Koons Balloon",
  "Shepard Fairey Obey",
  "David Hockney Pop",
  "Andy Warhol Pop Art",
  "Roy Lichtenstein Comic",
  "Henri Matisse Cut-outs",
  "Bridget Riley Op Art",
  "Modern Vector Minimal",
  "Organic Watercolor"
];

const DEFAULT_MOCKUPS = {
  apparel: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1503341455253-b2e723099de5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop",
  ],
  home: [
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?q=80&w=800&auto=format&fit=crop", 
    "https://plus.unsplash.com/premium_photo-1675808560942-83416b0808b2?q=80&w=800&auto=format&fit=crop",
  ],
  accessories: [
    "https://images.unsplash.com/photo-1578353022142-091753d59042?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1588645065097-9e7978255b91?q=80&w=800&auto=format&fit=crop",
  ]
};

const STORAGE_KEYS = {
  STYLES: 'pod_store_v5_styles',
  MOCKUPS: 'pod_store_v5_mockups',
  TEXTURES: 'pod_store_v5_textures',
  API_KEYS: 'pod_store_v5_api_keys'
};

export const getStyles = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.STYLES);
  return stored ? JSON.parse(stored) : DEFAULT_STYLES;
};

export const addStyle = (style: string): string[] => {
  const current = getStyles();
  const updated = [...current, style];
  localStorage.setItem(STORAGE_KEYS.STYLES, JSON.stringify(updated));
  return updated;
};

export const removeStyle = (style: string): string[] => {
  const current = getStyles();
  const updated = current.filter(s => s !== style);
  localStorage.setItem(STORAGE_KEYS.STYLES, JSON.stringify(updated));
  return updated;
};

export const getMockups = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.MOCKUPS);
  if (!stored) return JSON.parse(JSON.stringify(DEFAULT_MOCKUPS));
  try {
    const parsed = JSON.parse(stored);
    const defaults = DEFAULT_MOCKUPS;
    const validate = (arr: any, fallback: string[]) => 
      (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') ? arr : fallback;
    return {
      apparel: validate(parsed.apparel, defaults.apparel),
      home: validate(parsed.home, defaults.home),
      accessories: validate(parsed.accessories, defaults.accessories)
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_MOCKUPS));
  }
};

export const addMockup = (category: 'apparel' | 'home' | 'accessories', url: string) => {
  const current = getMockups();
  current[category] = [...(current[category] || []), url];
  localStorage.setItem(STORAGE_KEYS.MOCKUPS, JSON.stringify(current));
  return current;
};

export const removeMockup = (category: 'apparel' | 'home' | 'accessories', url: string) => {
  const current = getMockups();
  if (current[category]) {
    current[category] = current[category].filter((u: string) => u !== url);
    localStorage.setItem(STORAGE_KEYS.MOCKUPS, JSON.stringify(current));
  }
  return current;
};

export const getTextures = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.TEXTURES);
  return stored ? JSON.parse(stored) : DEFAULT_TEXTURES;
};

export const addTexture = (name: string, url: string) => {
  const current = getTextures();
  const updated = [...current, { name, url }];
  localStorage.setItem(STORAGE_KEYS.TEXTURES, JSON.stringify(updated));
  return updated;
};

export const removeTexture = (url: string) => {
  const current = getTextures();
  const updated = current.filter((t: any) => t.url !== url);
  localStorage.setItem(STORAGE_KEYS.TEXTURES, JSON.stringify(updated));
  return updated;
};

export const getApiKeys = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
  return stored ? JSON.parse(stored) : { gemini: '', stability: '', openai: '', huggingface: '' };
};

export const saveApiKeys = (keys: any) => {
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
};

export const resetToDefaults = () => {
  localStorage.removeItem(STORAGE_KEYS.STYLES);
  localStorage.removeItem(STORAGE_KEYS.MOCKUPS);
  localStorage.removeItem(STORAGE_KEYS.TEXTURES);
  localStorage.removeItem(STORAGE_KEYS.API_KEYS);
};