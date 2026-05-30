import { ChatMessage } from "../context/memory";

interface StickerResult {
  keyword: string;
  found: boolean;
  sticker?: {
    path: string;
    url: string;
    name: string;
  };
}

const STICKER_STORE: Record<string, { name: string; path: string }[]> = {
  "开心": [
    { name: "开心转圈", path: "happy_spin" },
    { name: "嘿嘿笑", path: "happy_grin" },
    { name: "开心到飞起", path: "happy_fly" },
  ],
  "可爱": [
    { name: "可爱歪头", path: "cute_tilt" },
    { name: "猫猫探头", path: "cute_cat" },
    { name: "卖萌眨眼", path: "cute_wink" },
  ],
  "卖萌": [
    { name: "卖萌大眼", path: "moe_eyes" },
    { name: "撒娇卖萌", path: "moe_sajiao" },
  ],
  "撒花": [
    { name: "撒花庆祝", path: "celebrate_flower" },
    { name: "放烟花", path: "celebrate_firework" },
  ],
  "庆祝": [
    { name: "庆祝跳舞", path: "celebrate_dance" },
    { name: "拉礼炮", path: "celebrate_party" },
  ],
  "耶": [
    { name: "耶比心", path: "yeah_heart" },
    { name: "剪刀手", path: "yeah_peace" },
  ],
  "傲娇": [
    { name: "哼转头", path: "tsundere_turn" },
    { name: "傲娇脸红", path: "tsundere_blush" },
  ],
  "生气": [
    { name: "气鼓鼓", path: "angry_puff" },
    { name: "跺脚生气", path: "angry_stomp" },
    { name: "冒火", path: "angry_fire" },
  ],
  "哼": [
    { name: "哼不理你", path: "hmph_ignore" },
    { name: "哼扭头", path: "hmph_turn" },
  ],
  "不理你": [
    { name: "不理你背对", path: "ignore_back" },
    { name: "傲娇走开", path: "ignore_walk" },
  ],
  "嫌弃": [
    { name: "嫌弃脸", path: "disgust_face" },
    { name: "嫌弃推开", path: "disgust_push" },
  ],
  "撒娇": [
    { name: "撒娇蹭蹭", path: "sajiao_nuzzle" },
    { name: "撒娇打滚", path: "sajiao_roll" },
  ],
  "委屈": [
    { name: "委屈巴巴", path: "wronged_eyes" },
    { name: "委屈蹲墙角", path: "wronged_corner" },
    { name: "委屈对手指", path: "wronged_fingers" },
  ],
  "哭哭": [
    { name: "大哭", path: "cry_loud" },
    { name: "默默流泪", path: "cry_silent" },
    { name: "抱头痛哭", path: "cry_hug" },
  ],
  "求抱抱": [
    { name: "求抱抱伸手", path: "hug_reach" },
    { name: "要抱抱", path: "hug_want" },
  ],
  "摸摸头": [
    { name: "摸头", path: "pat_head" },
    { name: "疯狂摸头", path: "pat_head_fast" },
  ],
  "打call": [
    { name: "打call应援", path: "call_support" },
    { name: "荧光棒", path: "call_stick" },
  ],
  "加油": [
    { name: "加油打气", path: "cheer_up" },
    { name: "元气满满", path: "cheer_energy" },
  ],
  "比心": [
    { name: "比心", path: "heart_hands" },
    { name: "送你小心心", path: "heart_give" },
  ],
  "亲亲": [
    { name: "亲亲", path: "kiss_muah" },
    { name: "飞吻", path: "kiss_fly" },
  ],
  "早安": [
    { name: "早安太阳", path: "morning_sun" },
    { name: "起床啦", path: "morning_wake" },
  ],
  "晚安": [
    { name: "晚安好梦", path: "night_sleep" },
    { name: "盖好被子", path: "night_blanket" },
  ],
  "吃饭": [
    { name: "干饭人", path: "eat_rice" },
    { name: "好好吃饭", path: "eat_meal" },
  ],
  "睡觉": [
    { name: "睡觉zzz", path: "sleep_zzz" },
    { name: "困了", path: "sleep_tired" },
  ],
  "写作业": [
    { name: "刷题中", path: "study_write" },
    { name: "疯狂赶作业", path: "study_rush" },
  ],
  "吃瓜": [
    { name: "吃瓜群众", path: "meme_melon" },
    { name: "前排吃瓜", path: "meme_melon_front" },
  ],
  "暗中观察": [
    { name: "暗中观察", path: "meme_peek" },
    { name: "暗中观察探头", path: "meme_peek_out" },
  ],
  "无语": [
    { name: "无语望天", path: "meme_speechless" },
    { name: "无语擦汗", path: "meme_sweat" },
  ],
  "尴尬": [
    { name: "尴尬笑", path: "meme_awkward" },
    { name: "脚趾抠地", path: "meme_awkward_floor" },
  ],
  "溜了溜了": [
    { name: "溜了溜了", path: "meme_run" },
    { name: "光速跑路", path: "meme_run_fast" },
  ],
};

const STICKER_KEYWORD_ALIAS: Record<string, string> = {
  "高兴": "开心",
  "快乐": "开心",
  "嘻嘻": "开心",
  "哈哈": "开心",
  "好耶": "开心",
  "萌萌": "可爱",
  "萌": "可爱",
  "卡哇伊": "可爱",
  "喵": "可爱",
  "发脾气": "生气",
  "怒了": "生气",
  "火大": "生气",
  "气死": "生气",
  "气": "生气",
  "难过": "委屈",
  "伤心": "委屈",
  "呜呜": "委屈",
  "想哭": "委屈",
  "抱抱": "求抱抱",
  "抱": "求抱抱",
  "拥抱": "求抱抱",
  "摸头": "摸摸头",
  "鼓励": "加油",
  "冲": "加油",
  "辛苦了": "加油",
  "爱你": "比心",
  "喜欢": "比心",
  "mua": "亲亲",
  "么么": "亲亲",
  "啵": "亲亲",
  "早": "早安",
  "早上好": "早安",
  "晚": "晚安",
  "睡了": "晚安",
  "拜拜": "晚安",
  "bye": "晚安",
  "干饭": "吃饭",
  "恰饭": "吃饭",
  "饿": "吃饭",
  "外卖": "吃饭",
  "困": "睡觉",
  "累了": "睡觉",
  "休息": "睡觉",
  "学习": "写作业",
  "作业": "写作业",
  "考试": "写作业",
  "复习": "写作业",
};

export function searchSticker(keyword: string): StickerResult {
  const kw = keyword.trim();
  if (!kw) {
    return { keyword: kw, found: false };
  }

  const resolved = STICKER_KEYWORD_ALIAS[kw] || kw;
  const stickers = STICKER_STORE[resolved];

  if (stickers && stickers.length > 0) {
    const s = stickers[Math.floor(Math.random() * stickers.length)];
    return {
      keyword: resolved,
      found: true,
      sticker: {
        path: s.path,
        url: `sticker://${s.path}`,
        name: s.name,
      },
    };
  }

  const allKeys = Object.keys(STICKER_STORE);
  for (const key of allKeys) {
    if (key.includes(kw) || kw.includes(key)) {
      const stickers = STICKER_STORE[key];
      const s = stickers[Math.floor(Math.random() * stickers.length)];
      return {
        keyword: key,
        found: true,
        sticker: {
          path: s.path,
          url: `sticker://${s.path}`,
          name: s.name,
        },
      };
    }
  }

  return { keyword: kw, found: false };
}

export function shouldSearchSticker(
  emotion: string,
  content: string
): boolean {
  if (!content) return false;

  const strongEmotions = [
    "happy", "excited", "love", "grateful",
    "sad", "angry", "playful", "proud",
  ];
  if (strongEmotions.includes(emotion)) return true;

  const stickerTriggers = [
    "早安", "晚安", "吃饭", "睡觉",
    "开心", "可爱", "生气", "委屈",
    "抱抱", "摸摸头", "比心", "亲亲",
  ];
  for (const trigger of stickerTriggers) {
    if (content.includes(trigger)) return true;
  }

  return Math.random() < 0.25;
}

export function extractStickerKeyword(
  emotion: string,
  content: string,
  memoryProfile: string
): string {
  const emotionKeywordMap: Record<string, string> = {
    happy: "开心",
    excited: "耶",
    love: "比心",
    grateful: "比心",
    sad: "委屈",
    angry: "生气",
    playful: "卖萌",
    proud: "开心",
    shy: "可爱",
    embarrassed: "尴尬",
    worried: "委屈",
    confused: "无语",
    sleepy: "睡觉",
    determined: "加油",
  };

  const keyword = emotionKeywordMap[emotion];
  if (keyword) {
    const stickers = STICKER_STORE[keyword];
    if (stickers && stickers.length > 0) return keyword;
  }

  const contentKeywords = [
    "早安", "晚安", "吃饭", "睡觉", "写作业",
    "开心", "可爱", "生气", "委屈", "撒花",
    "抱抱", "摸摸头", "比心", "亲亲", "加油",
    "打call", "吃瓜", "暗中观察", "无语", "溜了溜了",
  ];

  for (const ck of contentKeywords) {
    if (content.includes(ck)) {
      const stickers = STICKER_STORE[ck];
      if (stickers && stickers.length > 0) return ck;
    }
  }

  return "开心";
}

export function getStickerSuggestion(
  analysis: {
    emotion: string;
    userMessage: string;
  }
): { keyword: string; sticker: { name: string; path: string } } | null {
  if (!shouldSearchSticker(analysis.emotion, analysis.userMessage)) {
    return null;
  }

  const keyword = extractStickerKeyword(
    analysis.emotion,
    analysis.userMessage,
    ""
  );
  const result = searchSticker(keyword);

  if (result.found && result.sticker) {
    return { keyword: result.keyword, sticker: result.sticker };
  }

  return null;
}
