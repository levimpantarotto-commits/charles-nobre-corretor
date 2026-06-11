export function findMatchingSkill(text, skills) {
  if (!text || !Array.isArray(skills) || skills.length === 0) return null;
  const lower = String(text).toLowerCase();

  for (const skill of skills) {
    const matchers = Array.isArray(skill?.matchers) ? skill.matchers : [];
    for (const raw of matchers) {
      const trigger = String(raw || '').trim().toLowerCase();
      if (!trigger) continue;
      if (lower.includes(trigger)) {
        return { skill, trigger };
      }
    }
  }
  return null;
}

export function stripTrigger(text, trigger) {
  if (!text || !trigger) return text || '';
  const re = new RegExp(trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return String(text).replace(re, '').trim() || String(text).trim();
}
