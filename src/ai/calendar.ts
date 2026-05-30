import { Lunar, Solar } from "lunar-javascript";

interface Holiday {
  month: number;
  day: number;
  name: string;
  lunar?: boolean;
}

const SOLAR_HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: "元旦" },
  { month: 2, day: 14, name: "情人节" },
  { month: 3, day: 8, name: "妇女节" },
  { month: 3, day: 12, name: "植树节" },
  { month: 4, day: 1, name: "愚人节" },
  { month: 4, day: 5, name: "清明节" },
  { month: 4, day: 22, name: "世界地球日" },
  { month: 5, day: 1, name: "劳动节" },
  { month: 5, day: 4, name: "青年节" },
  { month: 5, day: 20, name: "520情人节" },
  { month: 6, day: 1, name: "儿童节" },
  { month: 7, day: 1, name: "建党节" },
  { month: 8, day: 1, name: "建军节" },
  { month: 9, day: 10, name: "教师节" },
  { month: 10, day: 1, name: "国庆节" },
  { month: 10, day: 31, name: "万圣节" },
  { month: 11, day: 11, name: "双十一" },
  { month: 12, day: 24, name: "平安夜" },
  { month: 12, day: 25, name: "圣诞节" },
  { month: 12, day: 31, name: "跨年夜" },
];

interface FloatingHoliday {
  month: number;
  weekOfMonth: number;
  dayOfWeek: number;
  name: string;
}

const FLOATING_HOLIDAYS: FloatingHoliday[] = [
  { month: 5, weekOfMonth: 2, dayOfWeek: 0, name: "母亲节" },
  { month: 6, weekOfMonth: 3, dayOfWeek: 0, name: "父亲节" },
  { month: 11, weekOfMonth: 4, dayOfWeek: 4, name: "感恩节" },
];

function getFloatingDate(now: Date, h: FloatingHoliday): number | null {
  const firstDay = new Date(now.getFullYear(), h.month - 1, 1).getDay();
  const offset = (h.dayOfWeek - firstDay + 7) % 7;
  const target = 1 + offset + (h.weekOfMonth - 1) * 7;
  if (target > 31) return null;
  return target;
}

const LUNAR_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 12, day: 8, name: "腊八节" },
  { month: 12, day: 30, name: "除夕" },
  { month: 1, day: 1, name: "春节" },
  { month: 1, day: 15, name: "元宵节" },
  { month: 2, day: 2, name: "龙抬头" },
  { month: 5, day: 5, name: "端午节" },
  { month: 7, day: 7, name: "七夕" },
  { month: 7, day: 15, name: "中元节" },
  { month: 8, day: 15, name: "中秋节" },
  { month: 9, day: 9, name: "重阳节" },
  { month: 10, day: 1, name: "寒衣节" },
  { month: 12, day: 23, name: "小年" },
];

export function getTodayHoliday(): string | null {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  for (const h of SOLAR_HOLIDAYS) {
    if (h.month === m && h.day === d) return h.name;
  }

  for (const h of FLOATING_HOLIDAYS) {
    const target = getFloatingDate(now, h);
    if (target === d) return h.name;
  }

  try {
    const lunar = Lunar.fromDate(now);
    for (const h of LUNAR_HOLIDAYS) {
      if (h.month === lunar.getMonth() && h.day === lunar.getDay()) return h.name;
    }
  } catch {}

  return null;
}

export function getDateContext(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  let text = `${y}年${m}月${d}日 周${weekday} ${hh}:${mm}`;

  const hour = now.getHours();
  if (hour >= 0 && hour < 6) text += " 深夜";
  else if (hour < 9) text += " 清晨";
  else if (hour < 12) text += " 上午";
  else if (hour < 14) text += " 中午";
  else if (hour < 18) text += " 下午";
  else text += " 晚上";

  for (const h of SOLAR_HOLIDAYS) {
    if (h.month === m && h.day === d) {
      text += `，今天是${h.name}`;
    }
  }

  for (const h of FLOATING_HOLIDAYS) {
    const target = getFloatingDate(now, h);
    if (target === d) {
      text += `，今天是${h.name}`;
    }
  }

  try {
    const lunar = Lunar.fromDate(now);
    for (const h of LUNAR_HOLIDAYS) {
      if (h.month === lunar.getMonth() && h.day === lunar.getDay()) {
        text += `，今天是${h.name}`;
      }
    }
    // 明天
    const tomorrow = new Date(now);
    tomorrow.setDate(d + 1);
    const lunar2 = Lunar.fromDate(tomorrow);
    for (const h of LUNAR_HOLIDAYS) {
      if (h.month === lunar2.getMonth() && h.day === lunar2.getDay()) {
        text += `，明天是${h.name}`;
      }
    }
  } catch {}

  return text;
}
