import * as fs from "fs";
import * as path from "path";
import { getTodayHoliday } from "../ai/calendar";

export interface Reminder {
  id: string;
  userId: string;
  content: string;
  dueAt: number;
  groupId?: string;
  createdAt: number;
  notified: boolean;
}

const SAVE_PATH = path.join(process.cwd(), "data", "reminders.json");

let reminders: Reminder[] = [];
let scannerInterval: ReturnType<typeof setInterval> | null = null;
let sendCallback: ((userId: string, content: string) => void) | null = null;

export function initReminders(onSend: (userId: string, content: string) => void, bestFriendQQ?: string): void {
  sendCallback = onSend;
  load();
  startScanner();

  if (bestFriendQQ) {
    const holiday = getTodayHoliday();
    if (holiday) {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      if (target.getTime() > now.getTime()) {
        const exists = reminders.some(r =>
          r.userId === bestFriendQQ && r.content.includes("节日祝福") && !r.notified
        );
        if (!exists) {
          addReminder(bestFriendQQ, `节日祝福：今天是${holiday}，记得给好朋友发个祝福哦~`, target.getTime());
        }
      }
    }
  }

  console.log(`[Remind] 已加载 ${reminders.length} 条提醒`);
}

function load(): void {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      reminders = JSON.parse(fs.readFileSync(SAVE_PATH, "utf-8"));
    }
  } catch {
    reminders = [];
  }
}

function save(): void {
  try {
    const dir = path.dirname(SAVE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SAVE_PATH, JSON.stringify(reminders, null, 2), "utf-8");
  } catch (e) {
    console.error("[Remind] 保存失败:", e);
  }
}

function startScanner(): void {
  if (scannerInterval) clearInterval(scannerInterval);
  scannerInterval = setInterval(() => {
    const now = Date.now();
    const due = reminders.filter(r => !r.notified && r.dueAt <= now);
    for (const r of due) {
      r.notified = true;
      const prefix = r.groupId ? "[来自群聊] " : "";
      const content = `⏰ 提醒：${r.content}`;
      if (sendCallback) {
        sendCallback(r.userId, content);
      }
      console.log(`[Remind] 已通知 ${r.userId}: ${r.content}`);
    }
    if (due.length > 0) save();
  }, 30000);
}

export function addReminder(userId: string, content: string, dueAt: number, groupId?: string): Reminder {
  const r: Reminder = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    content,
    dueAt,
    groupId,
    createdAt: Date.now(),
    notified: false,
  };
  reminders.push(r);
  save();
  console.log(`[Remind] 新增: ${userId} → ${new Date(dueAt).toLocaleString()} → ${content}`);
  return r;
}

export function getUserReminders(userId: string): Reminder[] {
  return reminders.filter(r => r.userId === userId && !r.notified);
}

export function cancelReminder(id: string): boolean {
  const idx = reminders.findIndex(r => r.id === id);
  if (idx >= 0) {
    reminders[idx].notified = true;
    save();
    return true;
  }
  return false;
}

export function parseReminderIntent(text: string): { content: string; minutes: number } | null {
  // 分钟后
  let m = text.match(/(\d+)\s*分钟后?[提醒我]*(.+)/);
  if (m) return { content: m[2].trim() || "待办事项", minutes: parseInt(m[1]) };

  // 小时后
  m = text.match(/(\d+)\s*小时后?[提醒我]*(.+)/);
  if (m) return { content: m[2].trim() || "待办事项", minutes: parseInt(m[1]) * 60 };

  // 天后
  m = text.match(/(\d+)\s*天后?[提醒我]*(.+)/);
  if (m) return { content: m[2].trim() || "待办事项", minutes: parseInt(m[1]) * 1440 };

  // 周后
  m = text.match(/(\d+)\s*周后?[提醒我]*(.+)/);
  if (m) return { content: m[2].trim() || "待办事项", minutes: parseInt(m[1]) * 10080 };

  // 反向: 提醒我 xxx X分钟后
  m = text.match(/提醒我(.+?)(\d+)\s*分钟后?/);
  if (m) return { content: m[1].trim(), minutes: parseInt(m[2]) };
  m = text.match(/提醒我(.+?)(\d+)\s*天后?/);
  if (m) return { content: m[1].trim(), minutes: parseInt(m[2]) * 1440 };

  // 反向: 提醒 xxx X分钟后 (群聊常见)
  m = text.match(/提醒(.+?)(\d+)\s*分钟后?/);
  if (m) return { content: m[1].trim(), minutes: parseInt(m[2]) };

  // 明天几点
  m = text.match(/明天[早晚]?上?(\d+)点(?:提醒我|叫我|喊我|告诉我|通知我)(.+)/);
  if (m) {
    const hour = parseInt(m[1]);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0);
    const min = Math.round((target.getTime() - Date.now()) / 60000);
    return { content: m[2].trim() || "待办事项", minutes: Math.max(1, min) };
  }

  return null;
}
