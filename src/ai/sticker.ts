import * as fs from "fs";
import * as path from "path";

interface StickerResult {
  keyword: string;
  found: boolean;
  sticker?: {
    path: string;
    url: string;
    name: string;
  };
}

function loadStickers(): Record<string, string[]> {
  try {
    const p = path.join(process.cwd(), "data", "stickers.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return {};
}

function searchOnline(kw: string): StickerResult | null {
  try {
    const c = require("child_process");
    const u = `https://image.so.com/j?q=${encodeURIComponent(kw + " gif")}&src=srp&sn=${Math.floor(Math.random() * 3)}`;
    const r = c.execSync(`curl -s -m 3 -H "User-Agent: Mozilla/5.0" "${u}"`, { encoding: "utf8" });
    const j = JSON.parse(r);
    const items = j?.list || [];
    if (items.length > 0) {
      const item = items[Math.floor(Math.random() * items.length)];
      const img = item.img || item.thumb || "";
      if (img) return { keyword: kw, found: true, sticker: { path: img, url: img, name: kw } };
    }
  } catch {}
  return null;
}

export function searchSticker(keyword: string): StickerResult {
  const kw = keyword.trim();
  if (!kw) return { keyword: kw, found: false };
  const store = loadStickers();
  const urls = store[kw] || [];
  if (urls.length > 0) {
    const url = urls[Math.floor(Math.random() * urls.length)];
    return { keyword: kw, found: true, sticker: { path: url, url, name: kw } };
  }
  const fallback = searchOnline(kw);
  if (fallback) return fallback;
  return { keyword: kw, found: false };
}

const stickerTriggers = [
  "早安", "晚安", "吃饭", "睡觉",
  "开心", "可爱", "生气", "委屈",
  "抱抱", "摸摸头", "比心", "加油",
  "吃瓜", "无语", "溜了",
];

export function shouldSearchSticker(emotion: string, content: string): boolean {
  if (!content) return false;
  if (/表情包|贴纸|发个图|来个图|斗图|表情/.test(content)) return true;
  const strong = ["happy","excited","love","sad","angry","playful","proud","grateful","thoughtful","surprised"];
  if (strong.includes(emotion)) return Math.random() < 0.6;
  return false;
}

const emotionKeywordMap: Record<string, string> = {
  happy: "开心", excited: "耶", love: "比心", grateful: "比心",
  sad: "委屈", angry: "生气", playful: "卖萌", proud: "开心",
  shy: "可爱", embarrassed: "无语", worried: "委屈",
  confused: "无语", sleepy: "睡觉", determined: "加油",
};

function extractStickerKeyword(emotion: string, content: string): string {
  const kw = emotionKeywordMap[emotion];
  if (kw && loadStickers()[kw]) return kw;

  for (const ck of stickerTriggers) {
    if (content.includes(ck) && loadStickers()[ck]) return ck;
  }

  return "开心";
}

const faceEmotionMap: Record<string, string> = {
  happy: "0", sad: "5", angry: "4", surprised: "0",
  love: "66", confused: "8", worried: "5", neutral: "0",
  excited: "0", playful: "2", shy: "7", proud: "0",
  embarrassed: "9", sleepy: "10", grateful: "76", determined: "0",
};

export function getFaceForEmotion(emotion: string): string {
  return faceEmotionMap[emotion] || "0";
}

export function shouldSearchStickerForEmotion(emotion: string): boolean {
  return loadStickers() && !!emotionKeywordMap[emotion];
}

export function getStickerSuggestion(analysis: {
  emotion: string;
  userMessage: string;
}): { keyword: string; sticker: { name: string; path: string } } | null {
  if (!shouldSearchSticker(analysis.emotion, analysis.userMessage)) return null;
  const kw = extractStickerKeyword(analysis.emotion, analysis.userMessage);
  console.log("[Sticker] keyword:", kw, "emotion:", analysis.emotion);
  const result = searchSticker(kw);
  console.log("[Sticker] result:", result.found, result.sticker?.url?.slice(0,40));
  if (result.found && result.sticker) return { keyword: result.keyword, sticker: result.sticker };
  return null;
}
