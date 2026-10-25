// D2.5 Open-loops regex covering English and common Hinglish
export const ACTION_PATTERNS = [
  // English
  /\b(will|shall|need to|needs to|must|should|have to)\b/i,
  /\b(to send|to share|to check|to prepare|to call|to follow up|to review|to update|to arrange|to visit|to collect)\b/i,
  /\b(by monday|by tuesday|by wednesday|by thursday|by friday|by saturday|by sunday|by tomorrow|by next week|by eod|by today)\b/i,
  /\b(action|pending|to-do|todo|followup|follow up)\b/i,
  // Hinglish
  /\b(karna hai|karega|karegi|bhejna hai|dekh lo|karwa do|follow up karo|check karo|dena hai|batana hai)\b/i
];

export function isActionLikeText(text: string): boolean {
  if (!text || text.trim().length < 5) return false;
  return ACTION_PATTERNS.some(pat => pat.test(text));
}
