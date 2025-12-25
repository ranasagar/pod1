
import { GoogleGenAI } from "@google/genai";
import { getApiKeys } from './storage';

type AIModel = 'auto' | 'gemini' | 'stability' | 'dalle' | 'huggingface' | 'pollinations';

interface GenerationResult {
  url: string;
  provider: string;
}

const getKeys = () => {
  const keys = getApiKeys();
  return {
    gemini: keys.gemini || process.env.API_KEY,
    stability: keys.stability,
    openai: keys.openai,
    huggingface: keys.huggingface
  };
};

// --- HELPER: RESIZE IMAGE ---
const resizeForApi = (base64Str: string, targetW: number = 1024, targetH: number = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context missing"));

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);

        const scale = Math.max(targetW / img.width, targetH / img.height);
        const x = (targetW / 2) - (img.width / 2) * scale;
        const y = (targetH / 2) - (img.height / 2) * scale;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load reference image."));
    img.src = base64Str;
  });
};

// --- HELPER: CONVERT BLOB TO BASE64 ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- POLLINATIONS.AI (FREE, NO KEY) ---
const generatePollinations = async (prompt: string, style: string, refImageBase64?: string): Promise<string> => {
  // Force centered, die-cut style to avoid square edges
  const fullPrompt = encodeURIComponent(`isolated ${style} design, ${prompt}. centered in middle, wide white margin background, organic die-cut edges, vector spot illustration. no crop, no frame, no square borders.`);
  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Pollinations API failed");
  const blob = await response.blob();
  return await blobToBase64(blob);
};

const getKeys = async () => {
  const keys = await getApiKeys();
  return {
    gemini: keys.gemini || process.env.API_KEY,
    stability: keys.stability,
    openai: keys.openai,
    huggingface: keys.huggingface
  };
};

// --- HUGGING FACE (FREE TIER KEY) ---
const generateHuggingFace = async (prompt: string, style: string, apiKey: string, refImageBase64?: string): Promise<string> => {
  if (!apiKey) throw new Error("Hugging Face Access Token missing. Please add it in Admin settings.");

  const model = "stabilityai/stable-diffusion-xl-base-1.0";
  const apiURL = `https://api-inference.huggingface.co/models/${model}`;

  const payload = {
    inputs: `${style} style vector art. ${prompt}. Centered spot graphic, isolated on white background. Wide white borders. Organic contour.`,
    parameters: {
      negative_prompt: "square, rectangle, frame, border, edge-to-edge, full bleed, cropped, photo background, t-shirt object, mannequin, fabric",
      num_inference_steps: 25,
      guidance_scale: 7.5
    }
  };

  try {
    const response = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try { errorJson = JSON.parse(errorText); } catch (e) { errorJson = { error: errorText }; }

      if (errorJson.error && typeof errorJson.error === 'string' && errorJson.error.includes("loading")) {
        throw new Error("Model is loading (Cold Start). Try again in 30s.");
      }
      throw new Error(`Hugging Face Error (${response.status}): ${errorJson.error || response.statusText}`);
    }

    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error("Connection failed (CORS blocked). Fallback recommended.");
    }
    throw error;
  }
};

// --- GEMINI PROVIDER ---
const generateGemini = async (prompt: string, style: string, apiKey: string, refImageBase64?: string): Promise<string> => {
  if (!apiKey) throw new Error("Gemini API key missing");

  const ai = new GoogleGenAI({ apiKey });
  let parts: any[] = [];

  if (refImageBase64) {
    const resizedBase64 = await resizeForApi(refImageBase64, 1024, 1024);
    const matches = resizedBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid reference image data");

    parts = [
      { inlineData: { mimeType: matches[1], data: matches[2] } },
      { text: `Transform this image into a ${style} vector design. Subject: ${prompt}. Centered spot graphic on white background. Ensure wide white margins around the subject. No straight edges or frames.` }
    ];
  } else {
    parts = [{ text: `Generate isolated ${style} vector art. Subject: ${prompt}. Solid white background. Center the design with a wide white margin around it (die-cut style). Do NOT fill the entire canvas. No square borders.` }];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Gemini produced no image data");
};

// --- STABILITY AI PROVIDER ---
const generateStability = async (prompt: string, style: string, apiKey: string, refImageBase64?: string): Promise<string> => {
  if (!apiKey) throw new Error("Stability API key missing");

  const isImg2Img = !!refImageBase64;
  const apiHost = 'https://api.stability.ai';
  const engineId = 'stable-diffusion-xl-1024-v1-0';
  const url = isImg2Img
    ? `${apiHost}/v1/generation/${engineId}/image-to-image`
    : `${apiHost}/v1/generation/${engineId}/text-to-image`;

  const formData = new FormData();

  if (isImg2Img && refImageBase64) {
    const resizedBase64 = await resizeForApi(refImageBase64, 1024, 1024);
    const res = await fetch(resizedBase64);
    const blob = await res.blob();

    formData.append('init_image', blob);
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35');
  }

  formData.append('text_prompts[0][text]', `${style} style vector art. ${prompt}. Centered spot graphic, isolated on white background. Wide margins. Organic edges.`);
  formData.append('text_prompts[0][weight]', '1');
  formData.append('text_prompts[1][text]', 'square, rectangle, border, frame, edge-to-edge, full bleed, cropped, t-shirt object, fabric texture');
  formData.append('text_prompts[1][weight]', '-1');
  formData.append('cfg_scale', '7');
  formData.append('samples', '1');
  formData.append('steps', '30');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Stability Error: ${err.message || JSON.stringify(err)}`);
  }

  const result = await response.json();
  if (!result.artifacts || !result.artifacts[0]) throw new Error("Stability returned no artifacts");
  return `data:image/png;base64,${result.artifacts[0].base64}`;
};

// --- OPENAI (DALL-E) PROVIDER ---
const generateOpenAI = async (prompt: string, style: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("OpenAI API key missing");

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: `Isolated ${style} vector art for printing. ${prompt}. Centered spot graphic on white background with wide margins. Organic contour. No square frames or cropping.`,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return `data:image/png;base64,${result.data[0].b64_json}`;
};

// --- MAIN GENERATION CONTROLLER ---
export const generateDesignWithFallback = async (
  prompt: string,
  style: string,
  refImageBase64?: string,
  preferredModel: AIModel = 'auto'
): Promise<GenerationResult> => {

  const keys = await getKeys();
  let errorLog: string[] = [];

  const tryProvider = async (name: string, fn: () => Promise<string>): Promise<GenerationResult | null> => {
    try {
      console.log(`[AI Service] Attempting ${name}...`);
      const url = await fn();
      console.log(`[AI Service] ${name} Success.`);
      return { url, provider: name };
    } catch (e: any) {
      console.warn(`[AI Service] ${name} failed:`, e.message);
      errorLog.push(`${name}: ${e.message}`);
      return null;
    }
  };

  // 1. Direct Selection
  if (preferredModel !== 'auto') {
    let result = null;
    if (preferredModel === 'gemini') result = await tryProvider('Gemini', () => generateGemini(prompt, style, keys.gemini, refImageBase64));
    if (preferredModel === 'stability') result = await tryProvider('Stability', () => generateStability(prompt, style, keys.stability, refImageBase64));
    if (preferredModel === 'dalle') result = await tryProvider('DALL-E', () => generateOpenAI(prompt, style, keys.openai));
    if (preferredModel === 'huggingface') result = await tryProvider('Hugging Face (SDXL)', () => generateHuggingFace(prompt, style, keys.huggingface, refImageBase64));
    if (preferredModel === 'pollinations') result = await tryProvider('Pollinations (Flux)', () => generatePollinations(prompt, style, refImageBase64));

    // SAFE FALLBACK: If explicit selection fails, try Pollinations before giving up
    if (!result) {
      console.warn(`[AI Service] Selected model ${preferredModel} failed. Falling back to Pollinations.`);
      const fallback = await tryProvider('Pollinations (Fallback)', () => generatePollinations(prompt, style, refImageBase64));
      if (fallback) {
        return { ...fallback, provider: `Pollinations (Fallback from ${preferredModel})` };
      }
      throw new Error(`Selected model ${preferredModel} failed. ${errorLog.join(' | ')}`);
    }
    return result;
  }

  // 2. Auto Fallback Chain (Prioritize Free/Cheapest)

  // Try Pollinations first (Free, no key)
  const polResult = await tryProvider('Pollinations (Flux)', () => generatePollinations(prompt, style, refImageBase64));
  if (polResult) return polResult;

  if (keys.gemini) {
    const result = await tryProvider('Gemini', () => generateGemini(prompt, style, keys.gemini, refImageBase64));
    if (result) return result;
  }

  if (keys.huggingface) {
    const result = await tryProvider('Hugging Face', () => generateHuggingFace(prompt, style, keys.huggingface, refImageBase64));
    if (result) return result;
  }

  if (keys.stability) {
    const result = await tryProvider('Stability', () => generateStability(prompt, style, keys.stability, refImageBase64));
    if (result) return result;
  }

  if (keys.openai) {
    const result = await tryProvider('DALL-E', () => generateOpenAI(prompt, style, keys.openai));
    if (result) return result;
  }

  throw new Error(`All providers failed. Errors: ${errorLog.join(' | ')}`);
};
```
