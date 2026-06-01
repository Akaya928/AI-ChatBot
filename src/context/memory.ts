import * as fs from "fs";
import * as path from "path";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
}

export interface BotEmotion {
  valence: number;
  arousal: number;
  updatedAt: number;
}

interface MemoryData {
  shortTermHistory: ChatMessage[];
  profile: string;
  nicknames: string[];
  userNicknames: string[];
  messageCount: number;
  topicSummary: string;
  totalTurns: number;
  deepConvCount: number;
  activeDays: string[];
  lastActive: number;
  botEmotion: BotEmotion;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ConversationMemory {
  private userId: string;
  private shortTermHistory: ChatMessage[] = [];
  private profile: string = "";
  private nicknames: string[] = [];
  private userNicknames: string[] = [];
  private messageCount: number = 0;
  private topicSummary: string = "";
  private bestFriendName: string = "";
  private totalTurns: number = 0;
  private deepConvCount: number = 0;
  private activeDays: string[] = [];
  private lastActive: number = 0;
  private skipDecay: boolean = false;
  private savePath: string;
  private botEmotion: BotEmotion = { valence: 0, arousal: 0, updatedAt: Date.now() };

  setSkipDecay(v: boolean): void { this.skipDecay = v; }

  constructor(userId: string, dataDir: string = "data") {
    this.userId = userId;
    this.savePath = path.join(dataDir, "memory.json");
    this.load();
  }

  addMessage(role: "user" | "assistant", content: string, name?: string): void {
    const msg: ChatMessage = { role, content };
    if (name) msg.name = name;
    this.shortTermHistory.push(msg);
    this.messageCount++;

    const d = today();
    if (!this.activeDays.includes(d)) {
      this.activeDays.push(d);
    }
    this.lastActive = Date.now();
  }

  recordTurn(): void {
    this.totalTurns++;
  }

  recordDeepConversation(): void {
    this.deepConvCount++;
  }

  getHistoryAsMessages(limit: number = 20): ChatMessage[] {
    return this.shortTermHistory.slice(-limit);
  }

  getHistoryForProfileExtraction(limit: number = 50): ChatMessage[] {
    return this.shortTermHistory.slice(-limit);
  }

  getHistoryAsText(limit: number = 50): string {
    return this.shortTermHistory
      .slice(-limit)
      .map((m) => `${m.role === "user" ? "鐢ㄦ埛" : "Bot"}: ${m.content}`)
      .join("\n");
  }

  getProfile(): string {
    return this.profile;
  }

  setProfile(profile: string): void {
    if (profile && profile.trim()) this.profile = profile.trim();
  }

  getTopicSummary(): string {
    return this.topicSummary;
  }

  setTopicSummary(summary: string): void {
    if (summary && summary.trim()) this.topicSummary = summary.trim();
  }

  getNicknames(): string[] {
    return [...this.nicknames];
  }

  addNickname(nickname: string): void {
    if (nickname && !this.nicknames.includes(nickname)) {
      this.nicknames.push(nickname);
    }
  }

  clearNicknames(): void {
    this.nicknames = [];
    this.userNicknames = [];
  }

  addUserNickname(name: string): void {
    if (name && !this.userNicknames.includes(name)) {
      this.userNicknames.push(name);
    }
  }

  getUserNicknames(): string[] {
    return [...this.userNicknames];
  }

  getBotEmotion(): BotEmotion {
    return { ...this.botEmotion };
  }

  updateBotEmotion(delta: Partial<BotEmotion>): void {
    this.botEmotion.valence = Math.max(-1, Math.min(1, this.botEmotion.valence + (delta.valence || 0)));
    this.botEmotion.arousal = Math.max(-1, Math.min(1, this.botEmotion.arousal + (delta.arousal || 0)));
    this.botEmotion.updatedAt = Date.now();
  }

  getUserId(): string { return this.userId; }

  isVeryFamiliar(skipDecay: boolean = false): boolean {
    return this.calcScore(skipDecay) >= 80;
  }

  getFamiliarityLevel(skipDecay: boolean = false): string {
    const score = this.calcScore(skipDecay);
    if (score < 15) return "stranger";
    if (score < 40) return "acquaintance";
    if (score < 60) return "friend";
    if (score < 80) return "good friend";
    return "close friend";
  }

  private calcScore(skipDecay: boolean = false): number {
    const msgScore = Math.min(this.messageCount * 0.04, 40);
    const dayScore = Math.min(this.activeDays.length * 1.5, 30);
    const deepScore = Math.min(this.deepConvCount * 3, 20);
    if (skipDecay) return Math.round(msgScore + dayScore + deepScore + 10);
    const daysSince = this.activeDays.length > 0 ? (Date.now() - this.lastActive) / 86400000 : 999;
    const decay = Math.min(daysSince * 2, 30);
    const activePenalty = this.lastActive > 0 && daysSince > 7 ? decay : 0;
    let recency = 0;
    if (daysSince < 7) recency = 10;
    else if (daysSince < 14) recency = 6;
    else if (daysSince < 30) recency = 3;
    return Math.max(0, Math.round(msgScore + dayScore + deepScore + recency - activePenalty));
  }

  clearHistory(): void {
    this.shortTermHistory = [];
    this.messageCount = 0;
    this.totalTurns = 0;
    this.deepConvCount = 0;
    this.activeDays = [];
    this.lastActive = 0;
  }

  save(): void {
    try {
      let allData: Record<string, MemoryData> = {};
      const dir = path.dirname(this.savePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.savePath)) {
        try { allData = JSON.parse(fs.readFileSync(this.savePath, "utf-8")); } catch { allData = {}; }
      }
      allData[this.userId] = {
        shortTermHistory: this.shortTermHistory.slice(-200),
        profile: this.profile,
        nicknames: this.nicknames,
        userNicknames: this.userNicknames,
        botEmotion: this.botEmotion,
        messageCount: this.messageCount,
        topicSummary: this.topicSummary,
        totalTurns: this.totalTurns,
        deepConvCount: this.deepConvCount,
        activeDays: this.activeDays,
        lastActive: this.lastActive,
      };
      fs.writeFileSync(this.savePath, JSON.stringify(allData, null, 2), "utf-8");
    } catch (err) {
      console.error("[Memory] 淇濆瓨璁板繂澶辫触:", err);
    }
  }

  load(): void {
    try {
      if (!fs.existsSync(this.savePath)) return;
      const raw = fs.readFileSync(this.savePath, "utf-8");
      const allData: Record<string, MemoryData> = JSON.parse(raw);
      const data = allData[this.userId];
      if (!data) return;
      this.shortTermHistory = data.shortTermHistory || [];
      this.profile = data.profile || "";
      this.nicknames = data.nicknames || [];
      this.userNicknames = data.userNicknames || [];
      this.botEmotion = data.botEmotion || { valence: 0, arousal: 0, updatedAt: Date.now() };
      this.messageCount = data.messageCount || 0;
      this.topicSummary = data.topicSummary || "";
      this.totalTurns = data.totalTurns || 0;
      this.deepConvCount = data.deepConvCount || 0;
      this.activeDays = data.activeDays || [];
      this.lastActive = data.lastActive || 0;
      console.log("[Memory] loaded user " + this.userId + " (" + this.messageCount + " msgs, score " + (this.skipDecay ? 100 : this.calcScore()) + ")");
    } catch (err) {
      console.error("[Memory] 鍔犺浇璁板繂澶辫触:", err);
    }
  }
}

let globalMemories: Map<string, ConversationMemory> = new Map();

export function getMemory(userId: string, dataDir: string = "data", isBestFriend: boolean = false): ConversationMemory {
  if (!globalMemories.has(userId)) {
    const mem = new ConversationMemory(userId, dataDir);
    mem.setSkipDecay(isBestFriend);
    globalMemories.set(userId, mem);
  }
  return globalMemories.get(userId)!;
}

export function saveAllMemories(): void {
  globalMemories.forEach((mem) => mem.save());
}

export function getProfileByUserId(userId: string, dataDir: string = "data"): string {
  const savePath = path.join(dataDir, "memory.json");
  try {
    if (!fs.existsSync(savePath)) return "";
    const raw = fs.readFileSync(savePath, "utf-8");
    const allData: Record<string, MemoryData> = JSON.parse(raw);
    const data = allData[userId];
    return data?.profile || "";
  } catch {
    return "";
  }
}

export function saveMemoryPeriodically(intervalMs: number = 30000): NodeJS.Timeout {
  return setInterval(() => saveAllMemories(), intervalMs);
}
