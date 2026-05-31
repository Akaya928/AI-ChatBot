import OpenAI from "openai";
import { ConversationMemory } from "../context/memory";
import { buildSystemPrompt, buildTopicSummaryPrompt, buildProfileExtractionPrompt, buildImageReplyPrompt, AIConfig } from "./prompt";
import { getDateContext } from "./calendar";
import { getFaceForEmotion, pickFaceForResponse } from "./emoji";
import { getStickerSuggestion } from "./sticker";

let openaiClient: OpenAI | null = null;

export function getAIClient(config: AIConfig): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.ai?.apiKey || process.env.OPENAI_API_KEY || "",
      baseURL: config.ai?.baseURL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
    });
  }
  return openaiClient;
}

export class AIChatClient {
  private client: OpenAI;
  private config: AIConfig;
  private messageCounter: number = 0;
  private profileUpdateCounter: number = 0;
  private summaryUpdateCounter: number = 0;

  constructor(config: AIConfig) {
    this.client = getAIClient(config);
    this.config = config;
  }

  rawClient(): OpenAI {
    return this.client;
  }

  async chat(
    memory: ConversationMemory,
    userMessage: string,
    imageDescription?: string,
    additionalContext?: string
  ): Promise<{
    reply: string;
    face: string;
    sticker: { keyword: string; name: string; path: string } | null;
  }> {
    try {
      const topicSummary = memory.getTopicSummary();
      const profile = memory.getProfile();
      const isQQBestFriend = memory.getUserId() === this.config.character.bestFriend?.qq;
      const isVeryFamiliar = memory.isVeryFamiliar(isQQBestFriend);
      const familiarity = memory.getFamiliarityLevel(isQQBestFriend);
      const nicknames = memory.getNicknames();
      const userId = memory.getUserId();

      const emotionResult = "neutral";

      const systemPrompt = buildSystemPrompt(
        this.config,
        topicSummary,
        emotionResult,
        isVeryFamiliar,
        familiarity,
        isQQBestFriend,
        profile,
        nicknames
      );

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      const historyMessages = memory.getHistoryAsMessages(
        this.config.memory.shortTermLimit
      );
      messages.push(...historyMessages);

      let finalMessage = `[真实时间：${getDateContext()}] ${userMessage}`;

      if (userMessage.trim().length === 0 && imageDescription) {
        finalMessage = "[用户发送了一张图片，没有说话]";
      }

      if (imageDescription) {
        finalMessage = `[用户发送了一张图片，内容描述: ${imageDescription}]\n用户消息: ${finalMessage}`;
      }

      if (additionalContext) {
        finalMessage += `\n\n[附加上下文: ${additionalContext}]`;
      }

      messages.push({ role: "user", content: finalMessage });

      const response = await this.client.chat.completions.create({
        model: this.config.ai.model,
        messages: messages as any,
        max_tokens: this.config.ai.maxTokens,
        temperature: this.config.ai.temperature,
      });

      let reply = response.choices[0]?.message?.content || "";
      if (!reply || reply.trim().length === 0) {
        reply = "嗯嗯~";
      }

      const stickerSuggestion = getStickerSuggestion({
        emotion: emotionResult,
        userMessage: userMessage,
      });

      const face = getFaceForEmotion(emotionResult);

      memory.addMessage("user", userMessage);
      memory.addMessage("assistant", reply);

      this.messageCounter++;

      if (
        this.messageCounter % this.config.memory.profileExtractionInterval === 0
      ) {
        this.updateProfileInBackground(memory);
      }

      if (
        this.messageCounter % this.config.memory.summaryInterval === 0
      ) {
        this.updateSummaryInBackground(memory);
      }

      memory.save();

      return {
        reply,
        face,
        sticker: stickerSuggestion
          ? {
              keyword: stickerSuggestion.keyword,
              name: stickerSuggestion.sticker.name,
              path: stickerSuggestion.sticker.path,
            }
          : null,
      };
    } catch (error: any) {
      console.error("[AIChat] 对话失败:", error.message);
      return {
        reply: "呜...信号不太好呢，你再说一遍好不好~",
        face: "(´；ω；`)",
        sticker: null,
      };
    }
  }

  async updateProfileInBackground(memory: ConversationMemory): Promise<void> {
    try {
      const historyMessages = memory.getHistoryForProfileExtraction(
        this.config.memory.profileExtractionLimit
      );
      if (historyMessages.length < 5) return;

      const historyText = historyMessages
        .map(
          (m) =>
            `${m.role === "user" ? "用户" : this.config.character.name}: ${m.content}`
        )
        .join("\n");

      const existingProfile = memory.getProfile();
      const prompt = buildProfileExtractionPrompt(historyText, existingProfile, this.config.character.name);

      const response = await this.client.chat.completions.create({
        model: this.config.ai.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      });

      const newProfile = response.choices[0]?.message?.content || "";
      if (newProfile && newProfile.trim()) {
        memory.setProfile(newProfile.trim());
        console.log("[AIChat] 已更新用户档案");
      }
    } catch (error: any) {
      console.error("[AIChat] 更新档案失败:", error.message);
    }
  }

  async updateSummaryInBackground(memory: ConversationMemory): Promise<void> {
    try {
      const historyMessages = memory.getHistoryForProfileExtraction(
        this.config.memory.profileExtractionLimit
      );
      if (historyMessages.length < 5) return;

      const historyText = historyMessages
        .map(
          (m) =>
            `${m.role === "user" ? "用户" : this.config.character.name}: ${m.content}`
        )
        .join("\n");

      const prompt = buildTopicSummaryPrompt(historyText);

      const response = await this.client.chat.completions.create({
        model: this.config.ai.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
      });

      const summary = response.choices[0]?.message?.content || "";
      if (summary && summary.trim()) {
        memory.setTopicSummary(summary.trim());
        console.log("[AIChat] 已更新话题摘要");
      }
    } catch (error: any) {
      console.error("[AIChat] 更新摘要失败:", error.message);
    }
  }

  resetCounter(): void {
    this.messageCounter = 0;
  }
}

export function createAIChatClient(config: AIConfig): AIChatClient {
  return new AIChatClient(config);
}
