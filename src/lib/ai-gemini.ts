import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";

const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

/**
 * Lấy danh sách các model Gemini ưu tiên theo biến môi trường và fallback ổn định
 */
export function getGeminiCandidateModels(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const list = configured
    ? [configured, ...DEFAULT_FALLBACK_MODELS]
    : DEFAULT_FALLBACK_MODELS;
  return Array.from(new Set(list));
}

/**
 * Lấy tên model chính cho các luồng chat có tool/function calling
 */
export function getDefaultGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

/**
 * Lấy API Key Gemini đã chuẩn hóa (trả về null nếu chưa cấu hình)
 */
export function getGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY || "";
  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  return cleaned || null;
}

/**
 * Gọi Gemini lần lượt qua danh sách model dự phòng nếu model đầu gặp lỗi 404/không khả dụng
 */
export async function generateGeminiContentWithFallback(
  prompt: string,
  generationConfig?: GenerationConfig
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const candidates = getGeminiCandidateModels();
  let lastError: unknown = null;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(generationConfig ? { generationConfig } : {}),
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Không thể kết nối tới mô hình Gemini");
}
