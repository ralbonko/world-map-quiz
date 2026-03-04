import { countryToContinent } from "./regionData";
import { alpha2ToNumeric } from "./countryCodeMap";

export interface DetailedAnswer {
  countryCode: string;
  countryName: string;
  category: string;
  continent: string;
  knowledgeCorrect: boolean;
  mapCorrect: boolean;
  hintUsed: boolean;
  points: number;
  timestamp: number;
}

export interface PlayerStats {
  answers: DetailedAnswer[];
  totalScore: number;
  totalQuestions: number;
  currentStreak: number;
  bestStreak: number;
}

export function emptyStats(): PlayerStats {
  return { answers: [], totalScore: 0, totalQuestions: 0, currentStreak: 0, bestStreak: 0 };
}

const STORAGE_KEY = "world-map-quiz-stats";

export function saveStats(stats: PlayerStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return emptyStats();
  }
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getOverallAccuracy(stats: PlayerStats): number {
  if (stats.totalQuestions === 0) return 0;
  return stats.totalScore / stats.totalQuestions;
}

export function getKnowledgeAccuracy(stats: PlayerStats): number {
  if (stats.answers.length === 0) return 0;
  const correct = stats.answers.filter((a) => a.knowledgeCorrect).length;
  return correct / stats.answers.length;
}

export function getMapAccuracy(stats: PlayerStats): number {
  const eligible = stats.answers.filter((a) => !a.hintUsed);
  if (eligible.length === 0) return 0;
  const correct = eligible.filter((a) => a.mapCorrect).length;
  return correct / eligible.length;
}

interface BreakdownEntry {
  knowledge: number;
  map: number;
  total: number;
}

export function getCategoryBreakdown(stats: PlayerStats): Record<string, BreakdownEntry> {
  const result: Record<string, { kCorrect: number; mCorrect: number; mEligible: number; total: number }> = {};
  for (const a of stats.answers) {
    if (!result[a.category]) result[a.category] = { kCorrect: 0, mCorrect: 0, mEligible: 0, total: 0 };
    const entry = result[a.category];
    entry.total++;
    if (a.knowledgeCorrect) entry.kCorrect++;
    if (!a.hintUsed) {
      entry.mEligible++;
      if (a.mapCorrect) entry.mCorrect++;
    }
  }
  const out: Record<string, BreakdownEntry> = {};
  for (const [cat, v] of Object.entries(result)) {
    out[cat] = {
      knowledge: v.total > 0 ? v.kCorrect / v.total : 0,
      map: v.mEligible > 0 ? v.mCorrect / v.mEligible : 0,
      total: v.total,
    };
  }
  return out;
}

export function getRegionBreakdown(stats: PlayerStats): Record<string, BreakdownEntry> {
  const result: Record<string, { kCorrect: number; mCorrect: number; mEligible: number; total: number }> = {};
  for (const a of stats.answers) {
    const region = a.continent || "Unknown";
    if (!result[region]) result[region] = { kCorrect: 0, mCorrect: 0, mEligible: 0, total: 0 };
    const entry = result[region];
    entry.total++;
    if (a.knowledgeCorrect) entry.kCorrect++;
    if (!a.hintUsed) {
      entry.mEligible++;
      if (a.mapCorrect) entry.mCorrect++;
    }
  }
  const out: Record<string, BreakdownEntry> = {};
  for (const [region, v] of Object.entries(result)) {
    out[region] = {
      knowledge: v.total > 0 ? v.kCorrect / v.total : 0,
      map: v.mEligible > 0 ? v.mCorrect / v.mEligible : 0,
      total: v.total,
    };
  }
  return out;
}

export interface MissedCountry {
  countryName: string;
  countryCode: string;
  avgScore: number;
  attempts: number;
}

export function getMostMissedCountries(stats: PlayerStats, limit = 5): MissedCountry[] {
  const map: Record<string, { name: string; code: string; totalPoints: number; count: number }> = {};
  for (const a of stats.answers) {
    if (!map[a.countryCode]) map[a.countryCode] = { name: a.countryName, code: a.countryCode, totalPoints: 0, count: 0 };
    map[a.countryCode].totalPoints += a.points;
    map[a.countryCode].count++;
  }
  return Object.values(map)
    .map((v) => ({ countryName: v.name, countryCode: v.code, avgScore: v.totalPoints / v.count, attempts: v.count }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, limit);
}

function interpolateColor(score: number): string {
  // red → yellow → green
  const r0 = 0xe7, g0 = 0x4c, b0 = 0x3c; // red
  const r1 = 0xf1, g1 = 0xc4, b1 = 0x0f; // yellow
  const r2 = 0x2e, g2 = 0xcc, b2 = 0x71; // green

  let r: number, g: number, b: number;
  if (score <= 0.5) {
    const t = score / 0.5;
    r = Math.round(r0 + (r1 - r0) * t);
    g = Math.round(g0 + (g1 - g0) * t);
    b = Math.round(b0 + (b1 - b0) * t);
  } else {
    const t = (score - 0.5) / 0.5;
    r = Math.round(r1 + (r2 - r1) * t);
    g = Math.round(g1 + (g2 - g1) * t);
    b = Math.round(b1 + (b2 - b1) * t);
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Returns numeric code → hex color for map heatmap
export function getCountryHeatmapData(stats: PlayerStats): Record<string, string> {
  const scoreMap: Record<string, { total: number; count: number }> = {};
  for (const a of stats.answers) {
    if (!scoreMap[a.countryCode]) scoreMap[a.countryCode] = { total: 0, count: 0 };
    scoreMap[a.countryCode].total += a.points;
    scoreMap[a.countryCode].count++;
  }

  const result: Record<string, string> = {};
  for (const [alpha2, v] of Object.entries(scoreMap)) {
    const numericCode = alpha2ToNumeric[alpha2];
    if (numericCode) {
      result[numericCode] = interpolateColor(v.total / v.count);
    }
  }
  return result;
}

// Get continent for a country code (re-export convenience)
export function getContinentForCountry(code: string): string {
  return countryToContinent[code] || "Unknown";
}
