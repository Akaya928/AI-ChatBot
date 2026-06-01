import { BotEmotion } from "../context/memory";

// ============================================================
// PAD -> natural language mood descriptor
// ============================================================

export function describeMood(e: BotEmotion): string {
  const { valence, arousal } = e;
  if (valence > 0.5 && arousal > 0.5) return "开心兴奋";
  if (valence > 0.5 && arousal < -0.3) return "平静满足";
  if (valence > 0.5) return "开心";
  if (valence < -0.5 && arousal > 0.5) return "愤怒烦躁";
  if (valence < -0.5 && arousal < -0.3) return "低落消沉";
  if (valence < -0.5) return "难过";
  if (arousal > 0.3) return "有点兴奋";
  if (arousal < -0.3) return "有点困";
  if (valence > 0) return "心情不错";
  if (valence < 0) return "心情一般";
  return "平静";
}

// ============================================================
// Sticker keyword from PAD
// ============================================================

export function moodToStickerKeyword(e: BotEmotion): string {
  const { valence, arousal } = e;
  if (valence > 0.3 && arousal > 0.3) return "开心";
  if (valence > 0.3 && arousal < -0.2) return "睡觉";
  if (valence > 0.3) return "耶";
  if (valence < -0.3 && arousal > 0.3) return "生气";
  if (valence < -0.3 && arousal < -0.2) return "委屈";
  if (valence < -0.3) return "无语";
  if (arousal > 0.3) return "卖萌";
  if (arousal < -0.3) return "溜了";
  return "可爱";
}

// ============================================================
// Evolution: user emotion -> bot emotion delta
// ============================================================

export function userEmotionToBotDelta(userEmotion: string, isBestFriend: boolean): Partial<BotEmotion> {
  const scale = isBestFriend ? 1.5 : 1.0;
  const map: Record<string, Partial<BotEmotion>> = {
    happy: { valence: 0.08, arousal: 0.04 },
    excited: { valence: 0.10, arousal: 0.08 },
    love: { valence: 0.12, arousal: 0.02 },
    grateful: { valence: 0.06, arousal: 0.02 },
    sad: { valence: -0.10, arousal: -0.06 },
    angry: { valence: -0.08, arousal: 0.10 },
    playful: { valence: 0.04, arousal: 0.06 },
    surprised: { valence: 0.02, arousal: 0.08 },
    worried: { valence: -0.06, arousal: 0.04 },
    confused: { valence: -0.02, arousal: 0.02 },
    neutral: { valence: 0, arousal: -0.02 },
    sleepy: { valence: 0, arousal: -0.10 },
    determined: { valence: 0.04, arousal: 0.04 },
    thoughtful: { valence: 0.02, arousal: 0 },
    proud: { valence: 0.08, arousal: 0.04 },
    shy: { valence: 0.02, arousal: 0.04 },
    embarrassed: { valence: -0.02, arousal: 0.04 },
  };
  const d = map[userEmotion] || { valence: 0, arousal: 0 };
  return { valence: (d.valence || 0) * scale, arousal: (d.arousal || 0) * scale };
}

// ============================================================
// Time decay: drift toward neutral (0,0)
// ============================================================

export function timeDecay(e: BotEmotion, minutesSinceUpdate: number): Partial<BotEmotion> {
  const decay = Math.min(minutesSinceUpdate / 60, 1);
  return {
    valence: -e.valence * decay * 0.3,
    arousal: -e.arousal * decay * 0.2,
  };
}
