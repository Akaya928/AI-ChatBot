import OpenAI from "openai";

let emotionClient: OpenAI | null = null;

function getEmotionClient(): OpenAI {
  if (!emotionClient) {
    emotionClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
    });
  }
  return emotionClient;
}

export interface EmotionResult {
  emotion: string;
  confidence: number;
  description: string;
}

const EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: ["开心", "高兴", "快乐", "哈哈", "嘻嘻", "好开心", "太好了", "nice", "耶"],
  sad: ["难过", "伤心", "哭", "呜呜", "难受", "心痛", "不开心", "想哭", "emo"],
  angry: ["生气", "愤怒", "气死", "烦", "恼火", "讨厌", "滚", "cnm", "tmd"],
  surprised: ["震惊", "天哪", "不会吧", "真的假的", "卧槽", "我靠", "什么", "啊"],
  love: ["爱", "喜欢", "想你", "宝贝", "亲亲", "mua", "心动", "❤", "♡"],
  worried: ["担心", "焦虑", "紧张", "害怕", "万一", "怎么办", "不安"],
  confused: ["不懂", "不明白", "什么鬼", "迷惑", "懵", "啥", "？?", "??"],
  sleepy: ["困", "累了", "想睡", "晚安", "睡了", "zzz", "好累", "疲惫"],
  excited: ["激动", "兴奋", "太好了", "期待", "冲", "牛逼", "厉害"],
  playful: ["逗", "开玩笑", "整蛊", "调皮", "略略略", "嘿嘿嘿"],
  grateful: ["谢谢", "感谢", "感恩", "多谢", "抱拳", "好人"],
  proud: ["骄傲", "自豪", "不愧是我", "我真棒", "成就感"],
  shy: ["害羞", "不好意思", "脸红", "///", "⁄⁄"],
  thoughtful: ["思考", "emmm", "嗯...", "让我想想", "这么说"],
  embarrassed: ["尴尬", "社死", "丢脸", "没脸见人", "尴尬癌"],
  determined: ["加油", "努力", "一定要", "必须", "冲鸭", "拼了"],
};

const EMOTION_CONFIDENCE: Record<string, number> = {
  happy: 0.9,
  sad: 0.85,
  angry: 0.85,
  surprised: 0.8,
  love: 0.85,
  worried: 0.75,
  confused: 0.7,
  sleepy: 0.8,
  excited: 0.85,
  playful: 0.75,
  grateful: 0.9,
  proud: 0.8,
  shy: 0.75,
  thoughtful: 0.6,
  embarrassed: 0.85,
  determined: 0.85,
};

export function quickAnalyze(text: string): EmotionResult {
  if (!text || !text.trim()) {
    return { emotion: "neutral", confidence: 0.5, description: "空消息" };
  }

  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[emotion] += 1;
      }
    }
  }

  let maxEmotion = "neutral";
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion;
    }
  }

  if (maxScore === 0) {
    if (text.includes("?")) return { emotion: "confused", confidence: 0.5, description: "关键词匹配: 含问号" };
    if (text.includes("!")) return { emotion: "excited", confidence: 0.4, description: "关键词匹配: 含感叹号" };
    if (text.endsWith("~") || text.endsWith("～")) return { emotion: "playful", confidence: 0.3, description: "关键词匹配: 波浪号结尾" };
    return { emotion: "neutral", confidence: 0.3, description: "关键词匹配: 无明显情绪" };
  }

  const confidence = Math.min(maxScore / 3, 0.95);
  return {
    emotion: maxEmotion,
    confidence,
    description: `关键词匹配: 匹配到${maxScore}个${maxEmotion}类关键词`,
  };
}

export async function aiAnalyze(
  text: string,
  recentContext?: string
): Promise<EmotionResult> {
  const quick = quickAnalyze(text);
  if (quick.confidence >= 0.85 && quick.emotion !== "neutral") {
    return quick;
  }

  try {
    const client = getEmotionClient();
    const contextStr = recentContext
      ? `\n最近对话:\n${recentContext}`
      : "";

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是一个情绪分析助手。分析用户消息的情绪，只回复一个单词。选项：happy, sad, angry, surprised, love, worried, confused, sleepy, excited, playful, grateful, proud, shy, thoughtful, embarrassed, determined, neutral",
        },
        {
          role: "user",
          content: `分析此消息的情绪，仅回复一个单词：\n${contextStr}\n消息: ${text}`,
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase() || "neutral";
    const validEmotions = [
      "happy", "sad", "angry", "surprised", "love",
      "worried", "confused", "sleepy", "excited", "playful",
      "grateful", "proud", "shy", "thoughtful", "embarrassed",
      "determined", "neutral",
    ];

    const emotion = validEmotions.find((e) => result.includes(e)) || quick.emotion;

    return {
      emotion,
      confidence: 0.7,
      description: `AI分析: ${result}`,
    };
  } catch (error: any) {
    console.error("[Emotion] AI情绪分析失败:", error.message);
    return quick;
  }
}

export async function analyze(
  text: string,
  recentContext?: string
): Promise<EmotionResult> {
  return aiAnalyze(text, recentContext);
}

export function getEmotionDescription(emotion: string): string {
  const descriptions: Record<string, string> = {
    happy: "开心的",
    sad: "有点难过的",
    angry: "气鼓鼓的",
    surprised: "惊讶的",
    love: "充满爱意的",
    worried: "担忧的",
    confused: "疑惑的",
    sleepy: "困倦的",
    excited: "兴奋的",
    playful: "在调皮",
    grateful: "感恩的",
    proud: "自豪的",
    shy: "害羞的",
    thoughtful: "在思考",
    embarrassed: "尴尬的",
    determined: "下定决心的",
    neutral: "平静的",
  };
  return descriptions[emotion] || "心情不错的";
}
