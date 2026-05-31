export interface Skill {
  name: string;
  init?: () => void;
  onMessage?: (userId: string, message: string, groupId?: string) => Promise<SkillResult | null>;
}

export interface SkillResult {
  handled: boolean;
  reply?: string;
}

const skills: Skill[] = [];

export function registerSkill(skill: Skill): void {
  skills.push(skill);
  if (skill.init) skill.init();
}

export async function runSkills(userId: string, message: string, groupId?: string): Promise<SkillResult | null> {
  for (const skill of skills) {
    if (skill.onMessage) {
      const result = await skill.onMessage(userId, message, groupId);
      if (result?.handled) return result;
    }
  }
  return null;
}
