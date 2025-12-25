import { GoogleGenAI } from "@google/genai";
import { getApiKeys } from './storage';

const getClient = async () => {
  const storedKeys = await getApiKeys();
  const apiKey = storedKeys.gemini || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing. Set it in Admin or Environment.");
  return new GoogleGenAI({ apiKey });
};

const STYLE_MATRIX: Record<string, string> = {
  "Keith Haring Street": "bold black outlines, thick kinetic motion lines, flat primary colors, no shading, radiant energy icons, high-contrast pop art.",
  "Basquiat Neo-Expressionist": "raw scrawled textures, sketchy charcoal lines, crown symbols, skeletal anatomy, chaotic neo-expressionist composition, vibrant but gritty colors.",
  "Takashi Murakami Superflat": "Superflat aesthetic, no depth, smiling colorful flowers, anime-style eyes, vibrant psychedelic palette, high-detail repetitive patterns.",
  "Yayoi Kusama Polka Dot": "obsessive repetitive polka dots of varying scales, infinity net textures, high-contrast organic shapes, vibrant dots on solid backgrounds.",
  "Banksy Stencil Art": "stencil spray paint texture, heavy black shadows, gritty spray drips, realistic subject with ironic twist, monochrome with a single bright spot color.",
  "Jeff Koons Balloon": "hyper-reflective metallic surface, mirror-like chrome finish, balloon animal curves, distorted specular reflections, high-gloss plastic texture.",
  "Shepard Fairey Obey": "limited propaganda palette (red, cream, black), thick stylized outlines, decorative patterns inside shapes, stencil-cut aesthetic.",
  "Andy Warhol Pop Art": "silkscreen print texture, misaligned color layers, high-saturation ink, repetitive motif, grainy halftone artifacts.",
  "Roy Lichtenstein Comic": "Ben-Day dots, thick black comic book lines, primary yellow/red/blue, speech bubble aesthetic, vintage newspaper print feel.",
  "Henri Matisse Cut-outs": "organic paper-cut shapes, vibrant flat gouache colors, minimal abstract forms, hand-cut irregular edges.",
  "Bridget Riley Op Art": "geometric optical illusion, vibrating patterns, sharp hard-edge lines, high-contrast black and white or vibrant zinging colors.",
  "Modern Vector Minimal": "clean vector paths, geometric simplicity, minimal nodes, flat design, professional logo aesthetic."
};


// --- OPENAI ENHANCER ---
const enhanceOpenAI = async (prompt: string, style: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("OpenAI API Key missing for enhancement");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert prompt engineer for DALL-E 3. Convert ideas into detailed, high-fidelity image prompts." },
        { role: "user", content: `Convert this idea into a DALL-E 3 prompt. Style: "${style}". Idea: "${prompt}". Keep it focused, detailed, and under 50 words.` }
      ]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || prompt;
};

// --- POLLINATIONS ENHANCER ---
const enhancePollinations = async (prompt: string, style: string): Promise<string> => {
  const instruction = `Enhance this image prompt for Flux middleware. Style: ${style}. Idea: ${prompt}. Keep it concise, descriptive, and visual.`;
  const url = `https://text.pollinations.ai/${encodeURIComponent(instruction)}`;
  const response = await fetch(url);
  return await response.text();
};

export const enhancePrompt = async (simplePrompt: string, style: string, targetModel: string = 'gemini'): Promise<string> => {
  const keys = await getApiKeys();

  // 1. Dispatch based on Target Model
  try {
    if (targetModel === 'dalle' && keys.openai) {
      return await enhanceOpenAI(simplePrompt, style, keys.openai);
    }

    if (targetModel.includes('pollinations')) {
      return await enhancePollinations(simplePrompt, style);
    }

    // Default: Use Gemini
    const ai = await getClient();
    const technicals = STYLE_MATRIX[style] || "premium vector art, clean edges, high contrast";
    const modelInstruction = targetModel === 'stability' ? "Stable Diffusion XL" :
      targetModel === 'huggingface' ? "AI Art Generator" : "Gemini";

    const prompt = `Act as a senior prompt engineer for ${modelInstruction}. Convert the idea: "${simplePrompt}" into a high-fidelity image prompt. 
    Apply the "${style}" style using these technical traits: ${technicals}.
    The result MUST be an ISOLATED spot graphic on a SOLID PURE WHITE background. 
    Ensure a wide margin around the subject. No text. No frames. High contrast. Keep under 50 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text?.trim() || simplePrompt;
  } catch (e) {
    console.error("Enhancement Error:", e);
    // Fallback to simple prompt if enhancement fails
    return simplePrompt;
  }
};

export const generateDesign = async (prompt: string, style: string, referenceImageBase64?: string): Promise<string> => {
  const ai = await getClient();
  const technicals = STYLE_MATRIX[style] || "clean vector style";

  const coreInstruction = `Create an ISOLATED graphic on a SOLID WHITE background. Subject: ${prompt}.
  TECHNICAL STYLE: Strictly adhere to the ${style} aesthetic: ${technicals}.
  CONSTRAINTS: No background elements, no borders, no text, no mannequins. 
  Ensure clear separation between the art and the white background for easy removal.`;

  const parts: any[] = referenceImageBase64 ? [
    { inlineData: { mimeType: referenceImageBase64.match(/^data:(.+);base64/)?.[1] || 'image/png', data: referenceImageBase64.split(',')[1] } },
    { text: `Redraw this reference image as a ${style} masterpiece. ${coreInstruction}` }
  ] : [{ text: coreInstruction }];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const imageData = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (imageData) return `data:image/png;base64,${imageData}`;
    throw new Error("No image generated.");
  } catch (error: any) {
    throw new Error(error.message?.includes("PERMISSION_DENIED") ? "API Key error. Check Admin Panel." : error.message);
  }
};

export const editDesign = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = await getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } }, { text: prompt }],
      },
    });
    const imageData = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (imageData) return `data:image/png;base64,${imageData}`;
    throw new Error("Edit failed.");
  } catch (error: any) { throw error; }
};