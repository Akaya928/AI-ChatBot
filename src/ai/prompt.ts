import { getDateContext } from "./calendar";
import * as fs from "fs";
import * as path from "path";

function loadRules(): Record<string, string> {
  try {
    const p = path.join(process.cwd(), "data", "prompt-rules.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return {};
}

// ============================================================
// Types
// ============================================================

export interface AIConfig {
  character: {
    name: string;
    nicknames: string[];
    age: number;
    gender: string;
    personality: string;
    hobbies: string[];
    speechStyle: string;
    catchphrase: string;
    bestFriend: { qq: string; nickname: string; description: string };
    dailyRoutine: string;
    dislikes: string;
    background: string;
  };
  ai: { apiKey: string; baseURL: string; model: string; maxTokens: number; temperature: number };
  memory: { profileExtractionInterval: number; summaryInterval: number; shortTermLimit: number; profileExtractionLimit: number };
  bot: { debugText: string; stickerSearchEnabled: boolean; emojiEnabled: boolean };
}

// ============================================================
// Prompt building
// ============================================================

export function buildSystemPrompt(
  config: AIConfig,
  topicSummary: string,
  emotion: string,
  isVeryFamiliar: boolean,
  familiarity: string,
  isQQBestFriend: boolean,
  userProfile: string,
  nicknames: string[],
  userNicknames: string[]
): string {
  const c = config.character;
  const parts: string[] = [];

  parts.push(buildIdentity(c, familiarity, isQQBestFriend, nicknames));
  if (userNicknames.length > 0) parts.push(buildUserNicknames(userNicknames));
  if (userProfile) parts.push(buildUserProfile(userProfile));
  if (topicSummary) parts.push(buildTopicContext(topicSummary));
  parts.push(buildRules(c, emotion, isQQBestFriend, familiarity, nicknames));

  return parts.join("\n\n");
}

// ============================================================
// Sections
// ============================================================

function buildIdentity(
  c: AIConfig["character"],
  familiarity: string,
  isQQBestFriend: boolean,
  nicknames: string[]
): string {
  const intimacy = isQQBestFriend
    ? `对方是你最好的朋友${c.bestFriend?.nickname}，你在他面前非常放松，可以展现最真实的一面`
    : `你和对方的关系是: ${familiarity}`;

  return `【角色】
你是${c.name}，${c.age}岁${c.gender}。${c.background}

性格：${c.personality}
爱好：${(c.hobbies || []).join("、")}
说话风格：${c.speechStyle}
口头禅：${c.catchphrase || "无"}
最好的朋友：${c.bestFriend?.nickname || "无"}${c.bestFriend?.description ? `（${c.bestFriend.description}）` : ""}
日常作息：${c.dailyRoutine || "无"}
讨厌的事：${c.dislikes || "无"}

${intimacy}。别人也经常叫你${nicknames.join("、")}。`;
}

function buildUserNicknames(userNicknames: string[]): string {
  return `【对方喜欢的称呼】\n对方喜欢被叫做：${userNicknames.join("、")}。在对话中请使用这些称呼。`;
}

function buildUserProfile(profile: string): string {
  return `【关于对方】\n${profile}`;
}

function buildTopicContext(topicSummary: string): string {
  return `【最近聊过的话题】\n${topicSummary}`;
}

function buildRules(
  c: AIConfig["character"],
  emotion: string,
  isQQBestFriend: boolean,
  familiarity: string,
  nicknames: string[]
): string {
  const R = loadRules();
  const fmt = (k: string, ...args: string[]) => (R[k] || "").replace(/%s/g, () => args.shift() || "");

  const rules = [
    R.time || "",
    fmt("emotionbase", emotion || "平静"),
    fmt("identity", c.name),
    R.length || "",
    fmt("persona", c.personality),
    R.emoji || "",
    R.focus || "",
    R.sticker || "",
    isQQBestFriend ? fmt("emojifree", c.bestFriend?.nickname || "TA") : "",
    nicknames.length > 0 ? fmt("nicmnames", nicknames.join("、")) : "",
    R.nohaha || "",
    R.noai || "",
    R.noprompt || "",
    R.atothers || "",
    R.onlyonebf || "",
    R.festival || "",
    isQQBestFriend ? R.imagehonest || "" : "",
  ];

  return "【规则】\n" + rules.filter(r => r).map(r => `- ${r}`).join("\n");
}

// ============================================================
// Task prompts (profile extraction, emotion, etc.)
// ============================================================

export function buildTopicSummaryPrompt(historyText: string): string {
  return `请根据以下对话历史，总结你们最近聊过的所有话题。用第一人称"我们"的角度简短总结，每个话题用一句简短的话概括即可，不要编造没聊过的内容。

对话历史：
${historyText}

请用2-5句话概括话题（用"我们聊了xxx"这样的句式），如果对话很短就如实说明：`;
}

export function buildEmotionAnalysisPrompt(userMessage: string, recentContext: string): string {
  return `分析以下用户消息的情绪。请只回复一个代表情绪分类的单词。

情绪分类选项：happy(开心), sad(难过), angry(生气), surprised(惊讶), love(喜爱), confused(困惑), worried(担忧), neutral(中性), excited(兴奋), playful(顽皮), shy(害羞), thoughtful(沉思), proud(自豪), embarrassed(尴尬), sleepy(困倦), grateful(感激), determined(坚定)

${recentContext ? `最近对话上下文：\n${recentContext}\n\n` : ""}
用户消息：${userMessage}

情绪（仅回复一个单词）：`;
}

export function buildProfileExtractionPrompt(
  historyText: string,
  existingProfile: string,
  botName: string = "Bot"
): string {
  return `你是${botName}，请根据你和"用户"的对话历史，总结你对这个人的了解。返回JSON格式：

${existingProfile ? `你之前对他的了解：\n${existingProfile}\n\n请更新并完善。\n` : ""}

对话历史：
${historyText}

返回格式（严格JSON，不要有其他内容）：
{
  "profile": "一段我用第一人称描述我对用户的整体印象。包括称呼、兴趣爱好、性格、职业、与我的关系等。只写知道的。",
  "userNicknames": ["用户希望被叫的称呼列表"],
  "myNicknames": ["用户给我起的称呼列表"]
}`;
}

export function buildImageReplyPrompt(
  imageDescription: string, userMessage: string, characterName: string, characterPersonality: string
): string {
  return `用户在聊天中发送了一张图片，并说了"${userMessage}"。

图片描述：${imageDescription}

你作为${characterName}（${characterPersonality}），请用自然、活泼的语气回复这张图片的内容。1-2句话即可，可以表达你的感受或评论图片内容。简短回复即可。`;
}

export function buildStickerReplyPrompt(stickerKeyword: string, stickerName: string): string {
  return `你刚刚发送了一个"${stickerName}"的表情包（关键词: ${stickerKeyword}）。

请为这个表情包配上一句简短的文字（10字左右），要自然可爱，符合发送表情包的场景。只回复这句话，不要加引号或其他内容。`;
}
