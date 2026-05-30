import "dotenv/config";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";
import { getMemory, saveAllMemories, saveMemoryPeriodically, ConversationMemory } from "./context/memory";
import { AIChatClient, createAIChatClient } from "./ai/client";
import { analyze } from "./emotion/analyzer";
import { describeImage, hasImageInMessage, extractImageUrlsFromMessage } from "./ai/vision";
import { getFaceForEmotion, pickFaceForResponse } from "./ai/emoji";
import { getStickerSuggestion, searchSticker } from "./ai/sticker";
import { AIConfig } from "./ai/prompt";
import { initReminders, addReminder, parseReminderIntent } from "./remind/scheduler";

function loadAIConfig(): AIConfig {
  const configPath = path.join("data", "config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  }

  return {
    character: {
      name: "小明",
      nicknames: ["明明", "阿明"],
      age: 20,
      gender: "男",
      personality: "幽默开朗，偶尔毒舌，乐于助人",
      hobbies: ["打游戏", "追番", "篮球"],
      speechStyle: "随性自然，爱用梗和网络用语",
      catchphrase: "笑死、确实",
      bestFriend: {
        qq: "",
        nickname: "",
        description: ""
      },
      dailyRoutine: "白天上课，晚上打游戏",
      dislikes: "早起、写论文",
      background: "大三计算机系学生，梦想进大厂当全栈",
    },
    ai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
      model: process.env.AI_MODEL || "deepseek-chat",
      maxTokens: 1024,
      temperature: 0.8,
    },
    memory: {
      profileExtractionInterval: 10,
      summaryInterval: 20,
      shortTermLimit: 20,
      profileExtractionLimit: 50,
    },
    bot: {
      debugText: "你好呀，今天心情怎么样~",
      stickerSearchEnabled: true,
      emojiEnabled: true,
    },
  };
}

const config = loadAIConfig();
const aiClient = createAIChatClient(config);

const WS_ENDPOINT = process.env.BOT_WS_ENDPOINT || "ws://127.0.0.1:6700";
const BOT_SELF_ID = process.env.BOT_SELF_ID || "";

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;
const RECONNECT_DELAY = 5000;
const processedMessages = new Set<string | number>();

function getPrefixes(memory: ConversationMemory): string[] {
  const customNicknames = memory.getNicknames();
  const allPrefixes = [config.character.name, ...config.character.nicknames, ...customNicknames];
  return allPrefixes;
}

function extractText(rawMessage: any): string {
  if (typeof rawMessage === "string") {
    return rawMessage
      .replace(/\[CQ:[^\]]+\]/g, "")
      .trim();
  }

  if (typeof rawMessage === "object" && rawMessage !== null) {
    if (Array.isArray(rawMessage)) {
      return rawMessage
        .filter((el: any) => el?.type === "text")
        .map((el: any) => el?.data?.text || "")
        .join(" ")
        .trim();
    }
    if (rawMessage.type === "text") {
      return (rawMessage.data?.text || "").trim();
    }
  }

  return "";
}

function parseGroupMessage(
  text: string,
  memory: ConversationMemory
): { isAddressed: boolean; strippedText: string; matchedPrefix: string } {
  if (!text) return { isAddressed: false, strippedText: "", matchedPrefix: "" };

  for (const prefix of getPrefixes(memory)) {
    if (text.includes(prefix)) {
      const idx = text.indexOf(prefix);
      let stripped = text.substring(idx + prefix.length).trim();
      stripped = stripped.replace(/^[~～!！。，,\s]+/, "").trim();
      return { isAddressed: true, strippedText: stripped, matchedPrefix: prefix };
    }
  }

  if (BOT_SELF_ID) {
    const atMention = `[CQ:at,qq=${BOT_SELF_ID}]`;
    if (text.includes(atMention)) {
      let stripped = text.replace(atMention, "").trim();
      stripped = stripped.replace(/\[CQ:[^\]]+\]/g, "").trim();
      return { isAddressed: true, strippedText: stripped, matchedPrefix: "@mention" };
    }
  }

  return { isAddressed: false, strippedText: text, matchedPrefix: "" };
}

function detectAndStoreNickname(text: string, memory: ConversationMemory): void {
  if (!text) return;

  const patterns = [
    /叫我\s*[""'']?([^\s"'”'，,。！？.!?]{1,10})[""'']?\s*(?:吧|哈|啦|哦|嘛)?/,
    /可以叫我\s*[""'']?([^\s"'”'，,。！？.!?]{1,10})[""'']?/,
    /叫我\s*[""'']?([^\s"'”'，,。！？.!?]{1,10})[""'']?\s*就好/,
    /名字[是叫]?\s*[""'']?([^\s"'”'，,。！？.!?]{1,10})[""'']?/,
    /我是\s*[""'']?([^\s"'”'，,。！？.!?]{1,10})[""'']?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1];
      if (
        name.length >= 1 &&
        name.length <= 10 &&
        !["你", "我", "他", "她", "它", "是", "的", "了", "吗"].includes(name)
      ) {
        memory.addNickname(name);
        memory.save();
        console.log(`[Nickname] 检测到昵称: ${name}`);
        break;
      }
    }
  }
}

interface OneBotMessage {
  post_type?: string;
  message_type?: string;
  sub_type?: string;
  message_id?: number;
  user_id?: number;
  group_id?: number;
  raw_message?: string;
  message?: any;
  sender?: {
    user_id?: number;
    nickname?: string;
    card?: string;
  };
  self_id?: number;
  time?: number;
}

function ts(msg: string): void {
  const d = new Date();
  const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  console.log(`[${ts}] ${msg}`);
}

async function handleMessage(data: OneBotMessage): Promise<void> {
  try {
    const messageType = data.message_type;
    const userId = String(data.user_id || data.sender?.user_id || "unknown");
    const groupId = data.group_id ? String(data.group_id) : null;
    const rawMessage = data.raw_message || "";
    const messageArray = data.message;
    const selfId = BOT_SELF_ID;

    let text = extractText(rawMessage);
    if (!text && messageArray) {
      text = extractText(messageArray);
    }
    if (!text) {
      text = rawMessage;
    }

    const isGroup = messageType === "group";
    const memory = getMemory(userId);

    let userMessage: string;
    let isAddressed: boolean;

    if (isGroup) {
      const parsed = parseGroupMessage(text, memory);
      if (!parsed.isAddressed) return;
      isAddressed = true;
      userMessage = parsed.strippedText;
      console.log(
        `[Group] 群${groupId} 用户${userId} 前缀:${parsed.matchedPrefix} 消息:${userMessage}`
      );
    } else {
      isAddressed = true;
      userMessage = text;
      ts(`[Private] 用户${userId} 消息:${userMessage}`);
    }

    if (!userMessage || userMessage.trim().length === 0) {
      userMessage = config.bot.debugText || "你好呀";
    }

    const reminderIntent = parseReminderIntent(userMessage);
    if (reminderIntent) {
      const dueAt = Date.now() + reminderIntent.minutes * 60 * 1000;
      addReminder(userId, reminderIntent.content, dueAt, groupId || undefined);
      const mins = reminderIntent.minutes;
      let timeStr: string;
      if (mins >= 10080) timeStr = `${Math.floor(mins / 10080)}周`;
      else if (mins >= 1440) timeStr = `${Math.floor(mins / 1440)}天${mins % 1440 >= 60 ? `${Math.floor((mins % 1440) / 60)}小时` : ""}`;
      else if (mins >= 60) timeStr = `${Math.floor(mins / 60)}小时${mins % 60 > 0 ? `${mins % 60}分钟` : ""}`;
      else timeStr = `${mins}分钟`;
      sendMessage(data, `好的，${timeStr}后提醒你：${reminderIntent.content}`);
      return;
    }

    if (userMessage === "reset" || userMessage === "/reset") {
      memory.clearHistory();
      sendMessage(data, "短时记忆已清空，画像保留不变，重新开始吧~");
      return;
    }

    const imageUrls = extractImageUrlsFromMessage(rawMessage);
    let imageDescription = "";

    if (imageUrls.length > 0) {
      try {
        const descriptions = await Promise.all(
          imageUrls.slice(0, 3).map((url) => describeImage(url))
        );
        imageDescription = descriptions.filter(Boolean).join("; ");
        console.log(`[Vision] 图片描述: ${imageDescription.substring(0, 100)}...`);
      } catch (err: any) {
        console.error("[Vision] 图片识别失败:", err.message);
      }
    }

    detectAndStoreNickname(userMessage, memory);

    const emotionResult = await analyze(userMessage);
    ts(`[Emotion] 情绪: ${emotionResult.emotion} (${emotionResult.description})`);

    const result = await aiClient.chat(memory, userMessage, imageDescription);

    memory.recordTurn();
    if (emotionResult.confidence > 0.7) {
      memory.recordDeepConversation();
    }

    let finalReply = result.reply;

    if (config.bot.emojiEnabled && result.face) {
      finalReply = pickFaceForResponse(emotionResult.emotion, finalReply);
    }

    ts(`[Reply] 回复: ${finalReply.substring(0, 100)}`);

    sendMessage(data, finalReply);

    if (result.sticker && config.bot.stickerSearchEnabled) {
      ts(`[Sticker] 贴纸: ${result.sticker.name}`);
      sendSticker(data, result.sticker.path, result.sticker.name);
    }
  } catch (error: any) {
    console.error("[Bot] 消息处理失败:", error.message);
    try {
      sendMessage(data, "呜...出了点小问题，待会再来找我聊天吧~ (´；ω；`)");
    } catch {}
  }
}

function sendMessage(data: OneBotMessage, text: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("[Bot] WebSocket未连接，无法发送消息");
    return;
  }

  const isGroup = data.message_type === "group";

  const payload: any = {
    action: isGroup ? "send_group_msg" : "send_private_msg",
    params: {
      message: text,
    },
    echo: String(data.message_id || Date.now()),
  };

  if (isGroup && data.group_id) {
    payload.params.group_id = data.group_id;
  } else {
    payload.params.user_id = data.user_id;
  }

  ws.send(JSON.stringify(payload));
}

function sendSticker(data: OneBotMessage, stickerPath: string, stickerName: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const isGroup = data.message_type === "group";

  const payload: any = {
    action: isGroup ? "send_group_msg" : "send_private_msg",
    params: {
      message: `[CQ:image,file=${stickerPath}]`,
    },
    echo: `sticker_${Date.now()}`,
  };

  if (isGroup && data.group_id) {
    payload.params.group_id = data.group_id;
  } else {
    payload.params.user_id = data.user_id;
  }

  ws.send(JSON.stringify(payload));
}

function connectWebSocket(): void {
  if (ws) {
    try { ws.removeAllListeners(); ws.close(); } catch {}
    ws = null;
  }
  console.log(`[Bot] 正在连接 WebSocket: ${WS_ENDPOINT}`);

  ws = new WebSocket(WS_ENDPOINT);

  ws.on("open", () => {
    console.log("[Bot] WebSocket 已连接");
    reconnectAttempts = 0;

    const lifecyclePayload = {
      action: "get_status",
      echo: "init_status",
    };
    ws?.send(JSON.stringify(lifecyclePayload));
    console.log("[Bot] 已请求Bot状态");
  });

  ws.on("message", (raw: WebSocket.Data) => {
    try {
      const data: any = JSON.parse(raw.toString());

      if (data.post_type === "message") {
        if (processedMessages.has(data.message_id)) return;
        processedMessages.add(data.message_id);
        if (processedMessages.size > 1000) processedMessages.clear();
        handleMessage(data);
      }

      if (data.post_type === "notice") {
        handleNotice(data);
      }

      if (data.post_type === "meta_event") {
        handleMetaEvent(data);
      }

      if (data.echo) {
        handleEcho(data);
      }
    } catch (err: any) {
      console.error("[Bot] 消息解析失败:", err.message);
    }
  });

  ws.on("close", (code: number, reason: Buffer) => {
    console.log(`[Bot] WebSocket 断开 (code=${code}, reason=${reason.toString()})`);
    ws = null;
    scheduleReconnect();
  });

  ws.on("error", (err: Error) => {
    console.error("[Bot] WebSocket 错误:", err.message);
    ws?.close();
    ws = null;
    scheduleReconnect();
  });
}

function scheduleReconnect(): void {
  saveAllMemories();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error(`[Bot] 重连次数已达上限(${MAX_RECONNECT_ATTEMPTS})，停止重连`);
    return;
  }

  if (reconnectAttempts === 3) {
    ts("[Bot] 连续断连3次，尝试自动重启NapCat...");
    try {
      const http = require("http");
      const req = http.request({ hostname: "127.0.0.1", port: 5777, path: "/api/actions/napcat/start", method: "POST" }, (res: any) => {
        res.on("data", () => {});
        res.on("end", () => {
          ts("[Bot] NapCat重启指令已发送，30秒后重新连接");
          reconnectAttempts = 0;
          setTimeout(() => connectWebSocket(), 30000);
        });
      });
      req.on("error", () => {});
      req.end();
    } catch (e) {
      ts("[Bot] NapCat自动重启失败");
    }
  }

  const delay = Math.min(RECONNECT_DELAY * reconnectAttempts, 60000);
  ts(`[Bot] 将在 ${delay / 1000}s 后尝试第 ${reconnectAttempts} 次重连...`);

  reconnectTimer = setTimeout(() => {
    connectWebSocket();
  }, delay);
}

function handleNotice(data: any): void {
  const noticeType = data.notice_type;
  if (noticeType === "notify") return;

  if (noticeType === "friend_add") {
    ts(`[Notice] 新好友添加: ${data.user_id}`);
  } else if (noticeType === "group_increase") {
    ts(`[Notice] 新成员入群: ${data.group_id} -> ${data.user_id}`);
  } else if (noticeType === "group_decrease") {
    ts(`[Notice] 成员离开群: ${data.group_id} -> ${data.user_id}`);
  }
}

function handleMetaEvent(data: any): void {
  const metaType = data.meta_event_type;

  if (metaType === "lifecycle") {
    console.log(`[Lifecycle] ${data.sub_type}`);
  }

  if (metaType === "heartbeat") {
    if (data.status?.online !== undefined) {
      const online = data.status.online;
      if (!online) {
        console.warn("[Heartbeat] Bot可能离线");
      }
    }
  }
}

function handleEcho(data: any): void {
  const echo = data.echo;
  if (echo === "init_status") {
    console.log("[Bot] Bot状态:", JSON.stringify(data.data || data));
  }
}

const memorySaveInterval = saveMemoryPeriodically(30000);

console.log("========================================");
console.log(`  ${config.character.name} QQ机器人启动中...`);
console.log("  基于 OneBot v11 协议");
console.log("========================================");
console.log(`  WebSocket: ${WS_ENDPOINT}`);
console.log(`  机器人QQ: ${BOT_SELF_ID}`);
console.log(`  AI模型: ${config.ai.model}`);
console.log(`  角色: ${config.character.name} (${config.character.age}岁 ${config.character.gender})`);
console.log("========================================");

initReminders((userId, content) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: "send_private_msg",
      params: { user_id: Number(userId), message: content },
    }));
  }
}, config.character.bestFriend?.qq, async (holiday: string): Promise<string> => {
  const client = aiClient.rawClient();
  const resp = await client.chat.completions.create({
    model: config.ai.model,
    messages: [
      { role: "system", content: `你是${config.character.name}，${config.character.personality}。${config.character.speechStyle}。` },
      { role: "user", content: `今天是${holiday}，你想给你最好的朋友${config.character.bestFriend?.nickname || ""}发一条节日祝福。请用你的语气写一条简短自然的祝福（30字以内），带一个表情符号。` }
    ],
    temperature: 0.9,
    max_tokens: 80,
  });
  return resp.choices[0]?.message?.content || `🎉 ${holiday}快乐！`;
});

connectWebSocket();

process.on("SIGINT", () => {
  console.log("\n[Bot] 正在关闭...");
  saveAllMemories();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  clearInterval(memorySaveInterval);
  ws?.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Bot] 正在关闭...");
  saveAllMemories();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  clearInterval(memorySaveInterval);
  ws?.close();
  process.exit(0);
});
