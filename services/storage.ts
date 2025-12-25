import { DEFAULT_TEXTURES } from '../types';
import { supabase } from './supabase';

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

// Helper to fetch data with default fallback
const fetchSetting = async (key: string, defaultValue: any) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) return defaultValue;
    return data.value;
  } catch (e) {
    console.error(`Error fetching ${key}:`, e);
    return defaultValue;
  }
};

// Helper to save data
const saveSetting = async (key: string, value: any) => {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
    return false;
  }
};

export const getStyles = async (): Promise<string[]> => {
  return await fetchSetting('styles', DEFAULT_STYLES);
};

export const addStyle = async (style: string): Promise<string[]> => {
  const current = await getStyles();
  const updated = [...current, style];
  await saveSetting('styles', updated);
  return updated;
};

export const removeStyle = async (style: string): Promise<string[]> => {
  const current = await getStyles();
  const updated = current.filter(s => s !== style);
  await saveSetting('styles', updated);
  return updated;
};

export const getMockups = async () => {
  return await fetchSetting('mockups', DEFAULT_MOCKUPS);
};

export const addMockup = async (category: 'apparel' | 'home' | 'accessories', url: string) => {
  const current = await getMockups();
  current[category] = [...(current[category] || []), url];
  await saveSetting('mockups', current);
  return current;
};

export const removeMockup = async (category: 'apparel' | 'home' | 'accessories', url: string) => {
  const current = await getMockups();
  if (current[category]) {
    current[category] = current[category].filter((u: string) => u !== url);
    await saveSetting('mockups', current);
  }
  return current;
};

export const getTextures = async () => {
  return await fetchSetting('textures', DEFAULT_TEXTURES);
};

export const addTexture = async (name: string, url: string) => {
  const current = await getTextures();
  const updated = [...current, { name, url }];
  await saveSetting('textures', updated);
  return updated;
};

export const removeTexture = async (url: string) => {
  const current = await getTextures();
  const updated = current.filter((t: any) => t.url !== url);
  await saveSetting('textures', updated);
  return updated;
};

export const getApiKeys = async () => {
  return await fetchSetting('api_keys', { gemini: '', stability: '', openai: '', huggingface: '' });
};

export const saveApiKeys = async (keys: any) => {
  await saveSetting('api_keys', keys);
};

export const resetToDefaults = async () => {
  await saveSetting('styles', DEFAULT_STYLES);
  await saveSetting('mockups', DEFAULT_MOCKUPS);
  await saveSetting('textures', DEFAULT_TEXTURES);
  await saveSetting('api_keys', { gemini: '', stability: '', openai: '', huggingface: '' });
};