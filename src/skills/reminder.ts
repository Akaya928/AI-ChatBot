import { initReminders, addReminder, parseReminderIntent } from "../remind/scheduler";
import type { Skill } from "./registry";

export const reminderSkill: Skill = {
  name: "reminder",
  onMessage: async (userId, message, groupId) => {
    const intent = parseReminderIntent(message);
    if (!intent) return null;
    const dueAt = Date.now() + intent.minutes * 60 * 1000;
    addReminder(userId, intent.content, dueAt, groupId);
    const mins = intent.minutes;
    let timeStr: string;
    if (mins >= 10080) timeStr = `${Math.floor(mins / 10080)}周`;
    else if (mins >= 1440) timeStr = `${Math.floor(mins / 1440)}天${mins % 1440 >= 60 ? `${Math.floor((mins % 1440) / 60)}小时` : ""}`;
    else if (mins >= 60) timeStr = `${Math.floor(mins / 60)}小时${mins % 60 > 0 ? `${mins % 60}分钟` : ""}`;
    else timeStr = `${mins}分钟`;
    return { handled: true, reply: `好的，${timeStr}后提醒你：${intent.content}` };
  },
};
