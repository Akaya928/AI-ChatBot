interface Holiday {
  month: number;
  day: number;
  name: string;
  lunar?: boolean;
}

const HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: "元旦" },
  { month: 2, day: 14, name: "情人节" },
  { month: 3, day: 8, name: "妇女节" },
  { month: 4, day: 1, name: "愚人节" },
  { month: 5, day: 1, name: "劳动节" },
  { month: 5, day: 4, name: "青年节" },
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
  { month: 2, day: 0, name: "除夕", lunar: true },
  { month: 1, day: 0, name: "春节", lunar: true },
  { month: 1, day: 15, name: "元宵节", lunar: true },
  { month: 5, day: 5, name: "端午节", lunar: true },
  { month: 7, day: 7, name: "七夕", lunar: true },
  { month: 8, day: 15, name: "中秋节", lunar: true },
  { month: 9, day: 9, name: "重阳节", lunar: true },
];

const APPROX_LUNAR_2026: Record<string, string> = {
  "2-14": "除夕", "2-15": "春节", "3-1": "元宵",
  "5-29": "端午", "8-13": "七夕", "10-4": "中秋", "10-24": "重阳",
};

export function getTodayHoliday(): string | null {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  const fixed = HOLIDAYS.filter(h => !h.lunar && h.month === m && h.day === d);
  if (fixed.length > 0) return fixed[0].name;

  const lunarKey = `${m}-${d}`;
  if (APPROX_LUNAR_2026[lunarKey]) return APPROX_LUNAR_2026[lunarKey];

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

  const fixedHolidays = HOLIDAYS.filter(h => !h.lunar && h.month === m && h.day === d);
  for (const h of fixedHolidays) {
    text += `，今天是${h.name}`;
  }

  const lunarKey = `${m}-${d}`;
  if (APPROX_LUNAR_2026[lunarKey]) {
    text += `，今天是${APPROX_LUNAR_2026[lunarKey]}`;
  }

  const tomorrowKey = `${m}-${d + 1}`;
  if (APPROX_LUNAR_2026[tomorrowKey]) {
    text += `，明天是${APPROX_LUNAR_2026[tomorrowKey]}`;
  }

  const yesterdayKey = `${m}-${d - 1}`;
  if (APPROX_LUNAR_2026[yesterdayKey]) {
    text += `，昨天是${APPROX_LUNAR_2026[yesterdayKey]}`;
  }

  return text;
}
