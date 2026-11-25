import type { ProspectLetter } from '../types';

export interface ProspectCompanyCheckMatch {
  letterId: string;
  letterNumber: string;
  companyName: string;
  companyAddress: string;
  letterDate: string;
  mitraId: string;
  mitraName: string;
  mitraMemberCode: string;
  matchType: 'exact' | 'similar' | 'own';
  matchReason: string;
  score: number;
}

export interface ProspectCompanyCheckResult {
  blocked: boolean;
  exactMatches: ProspectCompanyCheckMatch[];
  similarMatches: ProspectCompanyCheckMatch[];
  ownMatches: ProspectCompanyCheckMatch[];
}

const LEGAL_PREFIXES = new Set([
  'pt',
  'cv',
  'ud',
  'pd',
  'fa',
  'po',
  'yayasan',
  'koperasi',
  'perum',
  'firma',
  'perkumpulan',
  'perseroan',
  'klinik',
  'rs',
  'rsud',
  'rsia',
  'toko',
  'warung',
  'bengkel',
  'apotek',
  'apotik',
]);

const LEGAL_SUFFIXES = new Set(['tbk', 'persero', 'ltd', 'inc', 'corp', 'llc', 'sdn', 'bhd']);

// Very common Indonesian company words that alone shouldn't trigger false-positive similarity
const GENERIC_COMPANY_WORDS = new Set([
  'indonesia',
  'nusantara',
  'indo',
  'group',
  'grup',
  'global',
  'internasional',
  'international',
  'nasional',
  'jaya',
  'abadi',
  'makmur',
  'sentosa',
  'mandiri',
  'sejahtera',
  'sukses',
  'perkasa',
  'utama',
  'prima',
  'karya',
  'sinar',
  'bintang',
  'berkah',
  'mulia',
  'pratama',
  'indah',
  'bersama',
  'teknologi',
  'solusi',
  'mitra',
  'putra',
  'putri',
  'cahaya',
  'sumber',
  'rezeki',
  'rejeki',
  'agung',
  'lestari',
  'maju',
  'bangun',
  'cipta',
  'kencana',
  'graha',
  'buana',
  'persada',
  'energi',
  'niaga',
  'usaha',
  'dagang',
  'jasa',
  'konstruksi',
  'properti',
  'logistik',
  'trans',
  'transport',
  'trading',
  'ekspres',
  'express',
  'digital',
  'media',
  'kreatif',
  'creative',
  'konsultan',
  'consulting',
]);

export interface NormalizedCompanyName {
  raw: string;
  fullNormalized: string;
  entityPrefix: string;
  coreName: string;
  compactCore: string;
  tokens: string[];
}

export function normalizeCompanyName(raw: string): NormalizedCompanyName {
  const cleaned = String(raw || '')
    .toLowerCase()
    // Normalize dotted abbreviations like P.T., C.V., U.D., P.D., F.A. before stripping punctuation
    .replace(/\bp\s*\.\s*t\s*\.?(?=\s|$)/gi, 'pt ')
    .replace(/\bc\s*\.\s*v\s*\.?(?=\s|$)/gi, 'cv ')
    .replace(/\bu\s*\.\s*d\s*\.?(?=\s|$)/gi, 'ud ')
    .replace(/\bp\s*\.\s*d\s*\.?(?=\s|$)/gi, 'pd ')
    .replace(/\bf\s*\.\s*a\s*\.?(?=\s|$)/gi, 'fa ')
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const allTokens = cleaned ? cleaned.split(' ').filter(Boolean) : [];
  let entityPrefix = '';
  const coreTokens = [...allTokens];

  // Collapse spaced single-letter prefixes like "p t maju jaya" -> "pt maju jaya"
  if (coreTokens.length >= 3 && coreTokens[0].length === 1 && coreTokens[1].length === 1) {
    const joined = coreTokens[0] + coreTokens[1];
    if (LEGAL_PREFIXES.has(joined)) {
      coreTokens.splice(0, 2, joined);
    }
  }

  // Extract leading legal entity prefix (if there is at least one word after it)
  if (coreTokens.length >= 2 && LEGAL_PREFIXES.has(coreTokens[0])) {
    entityPrefix = coreTokens.shift() || '';
  }

  // Strip trailing corporate suffixes (Tbk, Persero, etc.) while keeping at least 1 token
  while (coreTokens.length >= 2 && LEGAL_SUFFIXES.has(coreTokens[coreTokens.length - 1])) {
    coreTokens.pop();
  }

  const coreName = coreTokens.join(' ').trim();
  const compactCore = coreName.replace(/\s+/g, '');

  return {
    raw: String(raw || '').trim(),
    fullNormalized: cleaned,
    entityPrefix,
    coreName,
    compactCore,
    tokens: coreTokens,
  };
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const prev = new Array<number>(lb + 1);
  const curr = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= lb; j++) prev[j] = curr[j];
  }
  return prev[lb];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function isExactSameCompany(a: NormalizedCompanyName, b: NormalizedCompanyName): boolean {
  if (!a.compactCore || !b.compactCore) return false;
  if (a.fullNormalized && a.fullNormalized === b.fullNormalized) {
    return true;
  }
  if (a.compactCore === b.compactCore) {
    // Same core name with identical entity prefix, or one omitted the entity prefix (e.g. "PT A" vs "A")
    if (a.entityPrefix === b.entityPrefix || !a.entityPrefix || !b.entityPrefix) {
      return true;
    }
  }
  return false;
}

function evaluateSimilarity(
  a: NormalizedCompanyName,
  b: NormalizedCompanyName
): { matched: boolean; score: number; reason: string } {
  if (!a.compactCore || !b.compactCore) {
    return { matched: false, score: 0, reason: '' };
  }

  // 1. Identical core name with different legal entity prefix (e.g. "PT Maju Jaya" vs "CV Maju Jaya")
  if (a.compactCore === b.compactCore && a.entityPrefix && b.entityPrefix && a.entityPrefix !== b.entityPrefix) {
    return {
      matched: true,
      score: 0.96,
      reason: `Nama inti sama (beda badan usaha: ${b.entityPrefix.toUpperCase()})`,
    };
  }

  // Avoid noisy matches on ultra-short 1-2 char inputs unless exact
  if (a.compactCore.length < 3 || b.compactCore.length < 3) {
    return { matched: false, score: 0, reason: '' };
  }

  const tokensA = a.tokens;
  const tokensB = b.tokens;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const sharedTokens = tokensA.filter((t) => setB.has(t));
  const uniqueShared = Array.from(new Set(sharedTokens));
  const distinctiveShared = uniqueShared.filter((t) => t.length >= 4 && !GENERIC_COMPANY_WORDS.has(t));

  const shorterTokens = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longerSet = tokensA.length <= tokensB.length ? setB : setA;
  const allShorterInLonger =
    shorterTokens.length > 0 && shorterTokens.every((t) => longerSet.has(t));

  // 2. All words of one company appear inside the other (catches extra front/middle/back words!)
  // e.g. "PT Maju Jaya" vs "PT Maju Jaya Abadi" / "PT Sinar Maju Jaya" / "PT Maju Sukses Jaya"
  if (allShorterInLonger) {
    const hasEnoughSpecificity =
      shorterTokens.length >= 2 ||
      (shorterTokens.length === 1 &&
        shorterTokens[0].length >= 4 &&
        !GENERIC_COMPANY_WORDS.has(shorterTokens[0]));
    if (hasEnoughSpecificity) {
      const ratio = shorterTokens.length / Math.max(tokensA.length, tokensB.length);
      return {
        matched: true,
        score: Math.min(0.94, 0.8 + ratio * 0.14),
        reason: 'Kemiripan kata (tambahan kata depan/tengah/belakang)',
      };
    }
  }

  // 3. Compact substring containment (e.g. "PT MajuJaya" vs "PT MajuJayaAbadi" / "PT SinarMajuJaya")
  const shorterCompact = a.compactCore.length <= b.compactCore.length ? a.compactCore : b.compactCore;
  const longerCompact = a.compactCore.length <= b.compactCore.length ? b.compactCore : a.compactCore;
  if (shorterCompact.length >= 5 && longerCompact.includes(shorterCompact)) {
    const shorterIsSingleGeneric =
      shorterTokens.length === 1 && GENERIC_COMPANY_WORDS.has(shorterTokens[0]);
    if (!shorterIsSingleGeneric) {
      const ratio = shorterCompact.length / longerCompact.length;
      return {
        matched: true,
        score: Math.min(0.92, 0.78 + ratio * 0.14),
        reason: 'Sebagian nama perusahaan sangat mirip',
      };
    }
  }

  // 4. High multi-word overlap (catches "PT Maju Jaya Abadi" vs "PT Maju Jaya Nusantara",
  // "PT Sinar Maju Jaya" vs "PT Karya Maju Jaya", "PT Maju Sukses Jaya" vs "PT Maju Bersama Jaya")
  const minTokenCount = Math.min(tokensA.length, tokensB.length);
  const maxTokenCount = Math.max(tokensA.length, tokensB.length);
  const overlapMin = minTokenCount > 0 ? uniqueShared.length / minTokenCount : 0;
  const overlapMax = maxTokenCount > 0 ? uniqueShared.length / maxTokenCount : 0;

  if (uniqueShared.length >= 2 && overlapMin >= 0.6) {
    return {
      matched: true,
      score: Math.min(0.9, 0.72 + overlapMax * 0.18),
      reason: 'Beberapa kata kunci perusahaan sama',
    };
  }

  // 5. Distinctive brand word match (e.g. "PT Krakatau Steel" vs "PT Krakatau Engineering")
  const strongDistinctive = distinctiveShared.filter((t) => t.length >= 5);
  if (strongDistinctive.length >= 1 && overlapMax >= 0.4) {
    return {
      matched: true,
      score: Math.min(0.86, 0.7 + overlapMax * 0.16),
      reason: `Mengandung nama/merek serupa ("${strongDistinctive[0]}")`,
    };
  }

  // 6. Character-level fuzzy similarity for typos / slight spelling variations
  if (a.compactCore.length >= 5 && b.compactCore.length >= 5) {
    const simCompact = levenshteinSimilarity(a.compactCore, b.compactCore);
    const simCore = levenshteinSimilarity(a.coreName, b.coreName);
    const bestSim = Math.max(simCompact, simCore);
    if (bestSim >= 0.78) {
      return {
        matched: true,
        score: Number(bestSim.toFixed(2)),
        reason: 'Ejaan nama perusahaan sangat mirip',
      };
    }
  }

  return { matched: false, score: 0, reason: '' };
}

/**
 * Checks a candidate company name against all existing prospect letters.
 * - `exactMatches`: Same company already created by ANOTHER Mitra -> HARD BLOCK.
 * - `similarMatches`: Near/fuzzy matches by ANOTHER Mitra -> WARNING (still allowed).
 * - `ownMatches`: Same company already created by the SAME Mitra -> INFO ONLY.
 */
export function checkProspectCompanyDuplicates(
  candidateCompanyName: string,
  existingLetters: ProspectLetter[],
  targetMitraId: string,
  excludeLetterId?: string
): ProspectCompanyCheckResult {
  const candidateNorm = normalizeCompanyName(candidateCompanyName);
  if (!candidateNorm.compactCore) {
    return {
      blocked: false,
      exactMatches: [],
      similarMatches: [],
      ownMatches: [],
    };
  }

  const exactMatches: ProspectCompanyCheckMatch[] = [];
  const similarMatches: ProspectCompanyCheckMatch[] = [];
  const ownMatches: ProspectCompanyCheckMatch[] = [];
  const seenSimilarKeys = new Set<string>();

  for (const letter of existingLetters) {
    if (!letter || !letter.companyName) continue;
    if (excludeLetterId && letter.id === excludeLetterId) continue;

    const existingNorm = normalizeCompanyName(letter.companyName);
    if (!existingNorm.compactCore) continue;

    const isSameMitra = Boolean(targetMitraId && letter.mitraId === targetMitraId);

    if (isExactSameCompany(candidateNorm, existingNorm)) {
      const matchItem: ProspectCompanyCheckMatch = {
        letterId: letter.id,
        letterNumber: letter.letterNumber,
        companyName: letter.companyName,
        companyAddress: letter.companyAddress,
        letterDate: letter.letterDate || letter.createdAt,
        mitraId: letter.mitraId,
        mitraName: letter.mitraName,
        mitraMemberCode: letter.mitraMemberCode,
        matchType: isSameMitra ? 'own' : 'exact',
        matchReason: isSameMitra
          ? 'Anda sebelumnya sudah membuat surat penawaran untuk perusahaan ini'
          : 'Nama perusahaan sama persis dengan surat yang sudah dibuat Mitra lain',
        score: 1,
      };
      if (isSameMitra) {
        ownMatches.push(matchItem);
      } else {
        exactMatches.push(matchItem);
      }
      continue;
    }

    // Only warn about similar companies created by OTHER Mitra
    if (!isSameMitra) {
      const sim = evaluateSimilarity(candidateNorm, existingNorm);
      if (sim.matched) {
        const dedupeKey = `${letter.mitraId}::${existingNorm.fullNormalized}`;
        if (!seenSimilarKeys.has(dedupeKey)) {
          seenSimilarKeys.add(dedupeKey);
          similarMatches.push({
            letterId: letter.id,
            letterNumber: letter.letterNumber,
            companyName: letter.companyName,
            companyAddress: letter.companyAddress,
            letterDate: letter.letterDate || letter.createdAt,
            mitraId: letter.mitraId,
            mitraName: letter.mitraName,
            mitraMemberCode: letter.mitraMemberCode,
            matchType: 'similar',
            matchReason: sim.reason,
            score: sim.score,
          });
        }
      }
    }
  }

  similarMatches.sort((a, b) => b.score - a.score);

  return {
    blocked: exactMatches.length > 0,
    exactMatches: exactMatches.slice(0, 5),
    similarMatches: similarMatches.slice(0, 5),
    ownMatches: ownMatches.slice(0, 3),
  };
}
