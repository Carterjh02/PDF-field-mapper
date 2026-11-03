// ============================================================
// PDF FIELD MAPPER
// PDF FIELD RECOGNITION ENGINE
// ============================================================
//
// PURPOSE:
//
// Identify possible canonical dictionary mappings for
// interactive PDF field names.
//
// RECOGNITION METHODS:
//
// 1. Exact canonical matching.
// 2. Approved global learned aliases.
// 3. Normalized canonical matching.
// 4. Normalized display-name matching.
// 5. Controlled synonym matching.
// 6. Partial word matching.
//
// IMPORTANT:
//
// - Multiple candidates may be returned.
// - Candidates are ranked by relevance.
// - No mapping is automatically applied.
// - No PDF document is modified.
// - No database records are created or updated.
//
// ============================================================

import {
  normalizeAliasName,
  isGenericFieldName,
} from '../supabase/aliases'

// ============================================================
// DICTIONARY ENTRY
// ============================================================

export interface RecognitionDictionaryEntry {
  id: string
  key_name: string
  display_name: string
  is_active: boolean
}

// ============================================================
// APPROVED GLOBAL ALIAS
// ============================================================
//
// Matches the relevant properties of FieldAlias from
// our existing Supabase aliases service.
//
// Recognition only needs the normalized alias name,
// its canonical dictionary target, and active status.
//
// ============================================================

export interface RecognitionAliasEntry {
  normalized_name: string
  dictionary_key_id: string
  is_active: boolean
}

// ============================================================
// RECOGNITION METHODS
// ============================================================

export type RecognitionMethod =
  | 'exact_canonical'
  | 'learned_alias'
  | 'normalized_canonical'
  | 'normalized_display'
  | 'controlled_synonym'
  | 'partial_token'

// ============================================================
// RECOGNITION CANDIDATE
// ============================================================

export interface PdfFieldRecognitionResult {
  dictionaryKeyId: string
  canonicalKey: string
  displayName: string
  method: RecognitionMethod

  // Ranking score, NOT a probability.
  score: number

  confidence: 'high' | 'review'
}

// ============================================================
// CONTROLLED SYNONYMS
// ============================================================
//
// These groups represent explicitly permitted terminology
// substitutions for generating suggestions.
//
// They do not establish universal semantic equivalence.
//
// Example:
//
// Job Value -> job_price
//
// The user must still approve the mapping.
//
// Avoid adding ambiguous relationships such as:
//
// owner = customer
//
// ============================================================

const SYNONYM_GROUPS: string[][] = [
  ['value', 'price', 'cost'],
  ['job', 'project'],
  ['phone', 'telephone'],
]

// ============================================================
// TOKENIZE FIELD NAME
// ============================================================
//
// Examples:
//
// customer_name -> ["customer", "name"]
// CustomerName  -> ["customer", "name"]
// Customer Name -> ["customer", "name"]
// Job-Value     -> ["job", "value"]
//
// ============================================================

function tokenizeFieldName(
  value: string
): string[] {

  const separated = value

    // Separate acronym-to-word boundaries.
    .replace(
      /([A-Z]+)([A-Z][a-z])/g,
      '$1 $2'
    )

    // Separate camelCase boundaries.
    .replace(
      /([a-z0-9])([A-Z])/g,
      '$1 $2'
    )

    // Normalize Unicode characters.
    .normalize('NFKD')

    // Remove combining accent marks.
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )

    // Ignore capitalization.
    .toLowerCase()

  const tokens = separated
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  // Avoid counting duplicate tokens more than once.
  return [...new Set(tokens)]

}

// ============================================================
// NORMALIZE FIELD NAME
// ============================================================
//
// Used for canonical name comparison after removing
// capitalization and formatting differences.
//
// This is separate from normalizeAliasName(), because
// the Supabase alias database uses its own established
// normalization rules.
//
// ============================================================

export function normalizePdfFieldName(
  value: string
): string {

  return tokenizeFieldName(value).join('')

}

// ============================================================
// CHECK SYNONYM RELATIONSHIP
// ============================================================

function areSynonyms(
  first: string,
  second: string
): boolean {

  if (first === second) {
    return true
  }

  return SYNONYM_GROUPS.some(
    (group) =>
      group.includes(first) &&
      group.includes(second)
  )

}

// ============================================================
// TOKEN MATCH INFORMATION
// ============================================================

interface TokenMatchResult {
  matchedCount: number
  originalCoverage: number
  targetCoverage: number
  usedSynonym: boolean
}

// ============================================================
// COMPARE TOKEN SETS
// ============================================================
//
// Provides behavior similar to SQL partial matching,
// but uses complete words rather than arbitrary
// character substrings.
//
// Example:
//
// "city" can match "customer_address_city".
//
// This does not mean the mapping is necessarily correct.
// Multiple plausible candidates may be returned.
//
// ============================================================

function compareTokens(
  originalTokens: string[],
  targetTokens: string[]
): TokenMatchResult {

  if (
    originalTokens.length === 0 ||
    targetTokens.length === 0
  ) {

    return {
      matchedCount: 0,
      originalCoverage: 0,
      targetCoverage: 0,
      usedSynonym: false,
    }

  }

  let matchedCount = 0
  let usedSynonym = false

  const matchedTargets = new Set<number>()

  for (const original of originalTokens) {

    // First prefer an identical token.
    let matchIndex = targetTokens.findIndex(
      (target, index) =>
        !matchedTargets.has(index) &&
        target === original
    )

    // Otherwise consider a controlled synonym.
    if (matchIndex === -1) {

      matchIndex = targetTokens.findIndex(
        (target, index) =>
          !matchedTargets.has(index) &&
          areSynonyms(original, target)
      )

      if (matchIndex !== -1) {
        usedSynonym = true
      }

    }

    if (matchIndex !== -1) {

      matchedCount++

      matchedTargets.add(matchIndex)

    }

  }

  return {
    matchedCount,

    originalCoverage:
      matchedCount / originalTokens.length,

    targetCoverage:
      matchedCount / targetTokens.length,

    usedSynonym,
  }

}

// ============================================================
// CREATE RECOGNITION CANDIDATE
// ============================================================

function createCandidate(
  entry: RecognitionDictionaryEntry,
  method: RecognitionMethod,
  score: number
): PdfFieldRecognitionResult {

  return {
    dictionaryKeyId: entry.id,
    canonicalKey: entry.key_name,
    displayName: entry.display_name,
    method,
    score: Math.round(score),

    // High confidence only applies to strong name matches.
    //
    // Learned aliases still require review because their
    // meaning may depend on the current document.
    confidence:
      method === 'exact_canonical' ||
      method === 'normalized_canonical'
        ? 'high'
        : 'review',
  }

}

// ============================================================
// SCORE PARTIAL AND SYNONYM MATCHES
// ============================================================
//
// Partial matches are assigned lower ranking scores
// than exact canonical and learned alias matches.
//
// These scores rank suggestions. They are not statistical
// confidence percentages.
//
// ============================================================

function scoreTokenMatch(
  entry: RecognitionDictionaryEntry,
  originalTokens: string[],
  targetValue: string
): PdfFieldRecognitionResult | null {

  const targetTokens =
    tokenizeFieldName(targetValue)

  const comparison = compareTokens(
    originalTokens,
    targetTokens
  )

  if (comparison.matchedCount === 0) {
    return null
  }

  // ----------------------------------------------------------
  // COMPLETE NAME COVERAGE THROUGH CONTROLLED SYNONYMS
  // ----------------------------------------------------------

  if (
    comparison.originalCoverage === 1 &&
    comparison.usedSynonym
  ) {

    return createCandidate(
      entry,
      'controlled_synonym',
      84 + comparison.targetCoverage * 5
    )

  }

  // ----------------------------------------------------------
  // PARTIAL WORD MATCH
  // ----------------------------------------------------------

  const score =
    45 +
    comparison.originalCoverage * 20 +
    comparison.targetCoverage * 15 -
    (comparison.usedSynonym ? 5 : 0)

  return createCandidate(
    entry,
    'partial_token',
    score
  )

}

// ============================================================
// GET RECOGNITION CANDIDATES
// ============================================================
//
// Returns multiple candidates ordered by relevance.
//
// RECOGNITION PRIORITY:
//
// 1. Exact canonical:       100
// 2. Approved learned alias: 98
// 3. Normalized canonical:   96
// 4. Normalized display:     92
// 5. Controlled synonyms
// 6. Partial word matching
//
// Each dictionary entry appears at most once.
//
// The user must explicitly select a candidate before
// a draft mapping is applied.
//
// ============================================================

export function getRecognitionCandidates(
  originalFieldName: string,
  dictionary: RecognitionDictionaryEntry[],
  maxCandidates = 8,
  aliases: RecognitionAliasEntry[] = []
): PdfFieldRecognitionResult[] {

  const originalName =
    originalFieldName.trim()

  if (!originalName) {
    return []
  }

  // ----------------------------------------------------------
  // ACTIVE DICTIONARY ENTRIES
  // ----------------------------------------------------------

  const activeEntries =
    dictionary.filter(
      (entry) => entry.is_active
    )

  if (activeEntries.length === 0) {
    return []
  }

  // ----------------------------------------------------------
  // MATCH APPROVED GLOBAL ALIASES
  // ----------------------------------------------------------
  //
  // Reuse the normalization rules from aliases.ts.
  //
  // Generic field names must never receive global
  // alias recognition.
  //
  // Examples of unsafe global names:
  //
  // City
  // Phone
  // Text1
  // Field17
  //
  // These require user review and document context.
  //
  // ----------------------------------------------------------

  const matchedAliasTargetIds =
    new Set<string>()

  if (!isGenericFieldName(originalName)) {

    const normalizedOriginalAlias =
      normalizeAliasName(originalName)

    for (const alias of aliases) {

      if (
        alias.is_active &&
        alias.normalized_name ===
          normalizedOriginalAlias
      ) {

        matchedAliasTargetIds.add(
          alias.dictionary_key_id
        )

      }

    }

  }

  // ----------------------------------------------------------
  // PREPARE NAME COMPARISONS
  // ----------------------------------------------------------

  const normalizedOriginal =
    normalizePdfFieldName(originalName)

  const originalTokens =
    tokenizeFieldName(originalName)

  const candidates:
    PdfFieldRecognitionResult[] = []

  // ==========================================================
  // EVALUATE EACH ACTIVE DICTIONARY KEY
  // ==========================================================

  for (const entry of activeEntries) {

    let candidate:
      PdfFieldRecognitionResult | null = null

    // ========================================================
    // 1. EXACT CANONICAL MATCH
    // ========================================================

    if (
      entry.key_name.toLowerCase() ===
      originalName.toLowerCase()
    ) {

      candidate = createCandidate(
        entry,
        'exact_canonical',
        100
      )

    }

    // ========================================================
    // 2. NORMALIZED CANONICAL MATCH
    // ========================================================

    else if (
      normalizePdfFieldName(entry.key_name) ===
      normalizedOriginal
    ) {

      candidate = createCandidate(
        entry,
        'normalized_canonical',
        96
      )

    }

    // ========================================================
    // 3. NORMALIZED DISPLAY NAME MATCH
    // ========================================================

    else if (
      normalizePdfFieldName(entry.display_name) ===
      normalizedOriginal
    ) {

      candidate = createCandidate(
        entry,
        'normalized_display',
        92
      )

    }

    // ========================================================
    // 4. CONTROLLED SYNONYMS AND PARTIAL MATCHES
    // ========================================================

    else {

      const canonicalCandidate =
        scoreTokenMatch(
          entry,
          originalTokens,
          entry.key_name
        )

      const displayCandidate =
        scoreTokenMatch(
          entry,
          originalTokens,
          entry.display_name
        )

      if (
        canonicalCandidate &&
        displayCandidate
      ) {

        candidate =
          canonicalCandidate.score >=
          displayCandidate.score
            ? canonicalCandidate
            : displayCandidate

      } else {

        candidate =
          canonicalCandidate ??
          displayCandidate

      }

    }

    // ========================================================
    // 5. APPROVED LEARNED ALIAS
    // ========================================================
    //
    // An active alias can elevate a dictionary entry into
    // a stronger recognition candidate.
    //
    // Exact canonical matches retain precedence.
    //
    // Only active dictionary entries can be suggested,
    // even when an alias points to an inactive key.
    //
    // ========================================================

    if (
      matchedAliasTargetIds.has(entry.id) &&
      (!candidate || candidate.score < 98)
    ) {

      candidate = createCandidate(
        entry,
        'learned_alias',
        98
      )

    }

    if (candidate) {
      candidates.push(candidate)
    }

  }

  // ==========================================================
  // SORT CANDIDATES
  // ==========================================================

  candidates.sort((a, b) => {

    if (a.score !== b.score) {
      return b.score - a.score
    }

    return a.canonicalKey.localeCompare(
      b.canonicalKey
    )

  })

  // ==========================================================
  // PREVENT DUPLICATE DICTIONARY ENTRIES
  // ==========================================================

  const uniqueCandidates =
    new Map<
      string,
      PdfFieldRecognitionResult
    >()

  for (const candidate of candidates) {

    if (
      !uniqueCandidates.has(
        candidate.dictionaryKeyId
      )
    ) {

      uniqueCandidates.set(
        candidate.dictionaryKeyId,
        candidate
      )

    }

  }

  // ==========================================================
  // RETURN RANKED RESULTS
  // ==========================================================

  return [
    ...uniqueCandidates.values()
  ].slice(
    0,
    Math.max(0, maxCandidates)
  )

}

// ============================================================
// LEGACY SINGLE-MATCH RECOGNITION
// ============================================================
//
// Retained for compatibility with existing consumers.
//
// A single result is returned only when there is one
// unambiguous high-confidence leading candidate.
//
// Learned aliases and partial matches are suggestions,
// not automatically confirmed mappings.
//
// ============================================================

export function recognizePdfField(
  originalFieldName: string,
  dictionary: RecognitionDictionaryEntry[],
  aliases: RecognitionAliasEntry[] = []
): PdfFieldRecognitionResult | null {

  const candidates =
    getRecognitionCandidates(
      originalFieldName,
      dictionary,
      8,
      aliases
    )

  const first = candidates[0]

  if (!first) {
    return null
  }

  if (first.confidence !== 'high') {
    return null
  }

  const second = candidates[1]

  if (
    second &&
    second.score === first.score
  ) {
    return null
  }

  return first

}

// ============================================================
// RECOGNITION METHOD LABELS
// ============================================================
//
// Provides readable labels for the Editor interface.
//
// ============================================================

export function getRecognitionMethodLabel(
  method: RecognitionMethod
): string {

  switch (method) {

    case 'exact_canonical':
      return 'Exact Canonical Match'

    case 'learned_alias':
      return 'Approved Learned Alias'

    case 'normalized_canonical':
      return 'Normalized Canonical Match'

    case 'normalized_display':
      return 'Display Name Match'

    case 'controlled_synonym':
      return 'Controlled Synonym Match'

    case 'partial_token':
      return 'Partial Word Match'

  }

}