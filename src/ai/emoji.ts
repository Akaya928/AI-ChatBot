const FACE_MAP: Record<string, string[]> = {
  happy: ["(◍•ᴗ•◍)", "(≧▽≦)", "(*^▽^*)", "ヾ(＾∇＾)", "╰(*°▽°*)╯", "(｡•̀ᴗ-)✧"],
  excited: ["o(>ω<)o", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "☆*:.｡.o(≧▽≦)o.｡.:*☆", "(ノ°▽°)ノ"],
  shy: ["(⁄ ⁄•⁄ω⁄•⁄ ⁄)", "(/ω＼)", "(*/ω＼*)", "(〃∀〃)", "(｡•́︿•̀｡)"],
  sad: ["(´；ω；`)", "(｡•́︿•̀｡)", "(╥﹏╥)", "(｡ŏ﹏ŏ)", "(〒﹏〒)"],
  angry: ["(╬ Ò﹏Ó)", "ヽ(｀⌒´)ノ", "(｀ε´)", "(#`皿´)", "(╯°□°）╯︵ ┻━┻"],
  surprised: ["Σ(°△°|||)", "(⊙_⊙)", "(°ロ°)", "w(°ｏ°)w", "∑(O_O;)"],
  love: ["(♡˙︶˙♡)", "(｡♡‿♡｡)", "(❤ω❤)", "♥(ˆ‿ˆԅ)", "(´▽`ʃ♡ƪ)"],
  confused: ["(・_・;)", "(￣～￣;)", "(・_・ヾ", "(・・)?", "(◎_◎;)"],
  sleepy: ["(－_－) zzZ", "(￣ρ￣)..zzZZ", "(￣。￣)～ｚｚｚ", "(￣o￣) zzZZzzZZ"],
  neutral: ["(._.)", "(￣▽￣)", "(・∀・)", "(´･ω･`)", "(￣▽￣*)ゞ"],
  proud: ["(￣^￣)ゞ", "(￣▽￣)V", "٩(ˊᗜˋ*)و", "(￣へ￣)", "o(￣▽￣)ｄ"],
  embarrassed: ["(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)", "(〃▽〃)", "(/▽＼)", "(๑•́ ₃ •̀๑)"],
  thoughtful: ["(ー_ーゞ", "(。・_・。)2", "(￢_￢)", "(。-`ω´-)", "ψ(._. )>"],
  worried: ["(･_･;", "(´-﹏-`；)", "(;´Д`)", "(;° ロ°)", "(ーー;)"],
  playful: ["(≖‿≖)", "(¬‿¬)", "(≧ε≦)", "(๑¯◡¯๑)", "(●´ω｀●)"],
  grateful: ["(人´∀｀)．☆．。．:*･°", "(_ _).｡o○", "(｡･ω･｡)ﾉ♡", "m(_ _)m"],
  determined: ["(•̀ᴗ•́)و", "(`･ω･´)", "(๑•̀ㅂ•́)و✧", "(•̀o•́)ง", "o(｀ω´*)o"],
};

const EMOTION_ALIAS: Record<string, string> = {
  joy: "happy",
  happiness: "happy",
  delight: "happy",
  cheerfulness: "happy",
  elation: "happy",
  pleasure: "happy",
  ecstasy: "happy",
  euphoria: "happy",
  enthusiasm: "excited",
  eagerness: "excited",
  thrill: "excited",
  exhilaration: "excited",
  shyness: "shy",
  bashful: "shy",
  timid: "shy",
  sadness: "sad",
  sorrow: "sad",
  grief: "sad",
  misery: "sad",
  melancholy: "sad",
  despair: "sad",
  depression: "sad",
  anger: "angry",
  rage: "angry",
  fury: "angry",
  irritation: "angry",
  annoyance: "angry",
  frustration: "angry",
  resentment: "angry",
  surprise: "surprised",
  astonishment: "surprised",
  amazement: "surprised",
  shock: "surprised",
  wonder: "surprised",
  affection: "love",
  adoration: "love",
  fondness: "love",
  devotion: "love",
  passion: "love",
  confusion: "confused",
  perplexity: "confused",
  bewilderment: "confused",
  puzzlement: "confused",
  drowsiness: "sleepy",
  fatigue: "sleepy",
  tiredness: "sleepy",
  exhaustion: "sleepy",
  neutrality: "neutral",
  calm: "neutral",
  serenity: "neutral",
  contentment: "neutral",
  pride: "proud",
  satisfaction: "proud",
  accomplishment: "proud",
  embarrassment: "embarrassed",
  awkwardness: "embarrassed",
  humiliation: "embarrassed",
  shame: "embarrassed",
  pensiveness: "thoughtful",
  contemplation: "thoughtful",
  reflection: "thoughtful",
  meditation: "thoughtful",
  worry: "worried",
  anxiety: "worried",
  fear: "worried",
  nervousness: "worried",
  apprehension: "worried",
  unease: "worried",
  playfulness: "playful",
  mischief: "playful",
  teasing: "playful",
  gratitude: "grateful",
  thankfulness: "grateful",
  appreciation: "grateful",
  determination: "determined",
  resolve: "determined",
  perseverance: "determined",
  ambition: "determined",
};

export function getFaceForEmotion(emotion: string): string {
  if (!emotion) return FACE_MAP.neutral[0];

  const normalized = emotion.toLowerCase().trim();
  const key = EMOTION_ALIAS[normalized] || normalized;
  const faces = FACE_MAP[key];

  if (faces && faces.length > 0) {
    return faces[Math.floor(Math.random() * faces.length)];
  }

  return FACE_MAP.neutral[0];
}

export function getAllFaces(): string[] {
  const result: string[] = [];
  for (const faces of Object.values(FACE_MAP)) {
    result.push(...faces);
  }
  return result;
}

export function getFacesForCategory(category: string): string[] {
  return FACE_MAP[category] || [];
}

export function getEmotionCategories(): string[] {
  return Object.keys(FACE_MAP);
}

export const STICKER_GUIDELINES = `
【表情包使用指南】
1. 优先使用颜文字(kaomoji)表达情绪，它们比表情包更自然可爱
2. 只有在对话氛围特别活跃、或对方明显期待表情包时才使用贴纸
3. 贴纸要贴合当前对话主题和情绪，不要莫名其妙发无关贴纸
4. 每次回复最多使用1个贴纸，避免刷屏
5. 如果找不到合适的贴纸，用颜文字代替
6. 贴纸关键词尽量简短准确，1-3个词为宜
   - 如: 开心/可爱/傲娇/摸头/打call/生气/委屈/害羞/睡觉/早安/晚安
7. 对于日常问候（早安/晚安/你好/再见）可以适当使用对应贴纸
8. 当对话带有强烈的情绪色彩（非常开心/非常伤心/特别可爱）时，贴纸效果更好

建议贴纸关键词：
  开心类: 开心 可爱 卖萌 撒花 庆祝 耶
  傲娇类: 傲娇 生气 哼 不理你 嫌弃
  撒娇类: 撒娇 委屈 哭哭 求抱抱 摸摸头
  互动类: 摸摸头 打call 加油 比心 亲亲
  日常类: 早安 晚安 吃饭 睡觉 写作业
  搞怪类: 吃瓜 暗中观察 无语 尴尬 溜了溜了
`;

export function pickFaceForResponse(emotion: string, content: string): string {
  const face = getFaceForEmotion(emotion);

  if (content.includes(face)) return content;

  const shouldAppend =
    !content.includes("(") ||
    Math.random() < 0.6;

  if (!shouldAppend) return content;

  const appendBefore = Math.random() < 0.3;
  if (appendBefore) {
    return face + " " + content;
  }
  return content + " " + face;
}
