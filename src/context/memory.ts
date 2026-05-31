import * as fs from "fs";
import * as path from "path";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
}

interface MemoryData {
  shortTermHistory: ChatMessage[];
  profile: string;
  nicknames: string[];
  messageCount: number;
  topicSummary: string;
  bestFriendName: string;
  totalTurns: number;
  deepConvCount: number;
  activeDays: string[];
  lastActive: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ConversationMemory {
  private userId: string;
  private shortTermHistory: ChatMessage[] = [];
  private profile: string = "";
  private nicknames: string[] = [];
  private messageCount: number = 0;
  private topicSummary: string = "";
  private bestFriendName: string = "";
  private totalTurns: number = 0;
  private deepConvCount: number = 0;
  private activeDays: string[] = [];
  private lastActive: number = 0;
  private skipDecay: boolean = false;
  private savePath: string;

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
      .map((m) => `${m.role === "user" ? "用户" : "Bot"}: ${m.content}`)
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
  }

  private calcScore(skipDecay: boolean = false): number {
    const msgScore = Math.min(this.messageCount * 0.04, 40);
    const dayScore = Math.min(this.activeDays.length * 1.5, 30);
    const deepScore = Math.min(this.deepConvCount * 3, 20);

    if (skipDecay) {
      return Math.round(msgScore + dayScore + deepScore + 10);
    }

    const daysSince = this.activeDays.length > 0
      ? (Date.now() - this.lastActive) / (1000 * 60 * 60 * 24)
      : 999;
    const decay = Math.min(daysSince * 2, 30);
    const activePenalty = this.lastActive > 0 && daysSince > 7 ? decay : 0;

    let recency = 0;
    if (daysSince < 7) recency = 10;
    else if (daysSince < 14) recency = 6;
    else if (daysSince < 30) recency = 3;

    let score = Math.round(msgScore + dayScore + deepScore + recency - activePenalty);
    return Math.max(0, score);
  }

  getFamiliarityLevel(skipDecay: boolean = false): string {
    const score = this.calcScore(skipDecay);
    if (score < 15) return "陌生人";
    if (score < 40) return "认识的人";
    if (score < 60) return "普通朋友";
    if (score < 80) return "好朋友";
    return "很熟的朋友";
  }

  getFamiliarityScore(skipDecay: boolean = false): number {
    return this.calcScore(skipDecay);
  }

  isVeryFamiliar(skipDecay: boolean = false): boolean {
    return this.calcScore(skipDecay) >= 80;
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  getUserId(): string {
    return this.userId;
  }

  getBestFriendName(): string {
    return this.bestFriendName;
  }

  setBestFriendName(name: string): void {
    if (name && name.trim()) this.bestFriendName = name.trim();
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
        messageCount: this.messageCount,
        topicSummary: this.topicSummary,
        bestFriendName: this.bestFriendName,
        totalTurns: this.totalTurns,
        deepConvCount: this.deepConvCount,
        activeDays: this.activeDays,
        lastActive: this.lastActive,
      };
      fs.writeFileSync(this.savePath, JSON.stringify(allData, null, 2), "utf-8");
    } catch (err) {
      console.error("[Memory] 保存记忆失败:", err);
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
      this.messageCount = data.messageCount || 0;
      this.topicSummary = data.topicSummary || "";
      this.bestFriendName = data.bestFriendName || "";
      this.totalTurns = data.totalTurns || 0;
      this.deepConvCount = data.deepConvCount || 0;
      this.activeDays = data.activeDays || [];
      this.lastActive = data.lastActive || 0;
      console.log(`[Memory] 已加载用户 ${this.userId} 的记忆 (${this.messageCount} 条消息, 好感度 ${this.skipDecay ? 100 : this.calcScore()})`);
    } catch (err) {
      console.error("[Memory] 加载记忆失败:", err);
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
