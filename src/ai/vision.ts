import OpenAI from "openai";

let visionClient: OpenAI | null = null;

export function getVisionClient(): OpenAI {
  if (!visionClient) {
    visionClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
    });
  }
  return visionClient;
}

export async function describeImage(
  imageUrl: string,
  customPrompt?: string
): Promise<string> {
  const client = getVisionClient();

  const prompt =
    customPrompt ||
    "请详细描述这张图片的内容。包括画面中的人物、物体、场景、动作、氛围和任何有趣的细节。用生动的中文描述，就像你在向朋友分享一张有趣的图片一样。";

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "deepseek-chat",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const description = response.choices[0]?.message?.content || "";
    return description;
  } catch (error: any) {
    console.error("[Vision] 图片描述失败:", error.message);
    return "收到一张图片，但暂时无法识别内容呢~";
  }
}

export async function describeImageBase64(
  base64Data: string,
  mimeType: string = "image/jpeg",
  customPrompt?: string
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  return describeImage(dataUrl, customPrompt);
}

export async function describeImageFromUrl(
  url: string,
  customPrompt?: string
): Promise<string> {
  const client = getVisionClient();

  const prompt =
    customPrompt ||
    "请描述这张图片中可能包含的情感或氛围。用户在聊天中发送了这张图片，请以朋友的角度评论这张图片（1-2句话），要自然活泼。";

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "deepseek-chat",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: url },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("[Vision] URL图片描述失败:", error.message);
    return "";
  }
}

export function extractImageUrlsFromMessage(message: string): string[] {
  const urls: string[] = [];

  const urlPattern = /https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s]*)?/gi;
  const matches = message.match(urlPattern);
  if (matches) {
    urls.push(...matches);
  }

  const cqImagePattern = /\[CQ:image,file=[^,\]]*(?:,url=([^\]]+))?\]/gi;
  let cqMatch: RegExpExecArray | null;
  while ((cqMatch = cqImagePattern.exec(message)) !== null) {
    if (cqMatch[1]) {
      urls.push(cqMatch[1]);
    }
  }

  return urls;
}

export function hasImageInMessage(message: string): boolean {
  return (
    /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp)/i.test(message) ||
    /\[CQ:image,/.test(message)
  );
}
