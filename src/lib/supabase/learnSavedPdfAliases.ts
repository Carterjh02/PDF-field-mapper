// ============================================================
// PDF FIELD MAPPER - LEARN ALIASES AFTER A VERIFIED PDF SAVE
// ============================================================
// This module is intentionally separate from the PDF writer.
// It may only be called AFTER Electron/Python reports a
// successful saved PDF. Failures here must never undo or
// misrepresent that successful PDF save.
//
// The shared alias service remains responsible for Supabase
// validation, normalized uniqueness and active target checks.
// No existing aliases are edited or reactivated automatically.
// ============================================================

import {
  createFieldAlias,
  getFieldAliases,
  isGenericFieldName,
  normalizeAliasName,
} from './aliases'
import {
  getRecognitionCatalog,
  invalidateRecognitionCatalog,
} from './recognitionCatalog'
import type { PdfInspectionResult } from '../pdf/inspectPdf'
import type { PdfFieldRename } from '../pdf/preparePdfRenames'

interface AliasDictionaryTarget {
  id: string
  key_name: string
  is_active: boolean
}

export interface LearnSavedPdfAliasesInput {
  // These are the actual, validated logical renames sent to Python.
  // Never pass unconfirmed recognition suggestions or all widgets.
  renames: readonly PdfFieldRename[]
  dictionaryKeys: readonly AliasDictionaryTarget[]
  inspection: PdfInspectionResult
}

export interface SavedPdfAliasLearningResult {
  considered: number
  created: number
  alreadyKnown: number
  skipped: number
  conflicts: number
  failed: number
  warnings: string[]
}

function newLearningResult(considered: number): SavedPdfAliasLearningResult {
  return {
    considered,
    created: 0,
    alreadyKnown: 0,
    skipped: 0,
    conflicts: 0,
    failed: 0,
    warnings: [],
  }
}

/**
 * A global alias should describe a specific concept, not merely
 * identify an arbitrary widget or a one-word context-dependent label.
 *
 * Examples accepted: HomeownerFullName, Contractor Phone, Job_Value
 * Examples skipped: Name, City, Text17, Owner, Field_9
 *
 * This is an extra conservative safeguard in addition to
 * isGenericFieldName() in the existing aliases service.
 */
function isDescriptiveGlobalName(originalName: string): boolean {
  if (isGenericFieldName(originalName)) return false
  if (/\s*#\d+\s*$/.test(originalName)) return false

  const expanded = originalName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.\-/]+/g, ' ')

  const words = expanded.split(/\s+/).filter(Boolean)
  return words.length >= 2 && originalName.trim().length >= 6
}

/**
 * Return a summary of learning results without throwing for ordinary
 * database/permissions failures. The caller must already have a
 * successful PDF save result before invoking this function.
 *
 * We deliberately prefetch INCLUDING inactive aliases to avoid
 * overwriting someone else's mapping or silently reactivating it.
 */
export async function learnAliasesFromSavedPdf({
  renames,
  dictionaryKeys,
  inspection,
}: LearnSavedPdfAliasesInput): Promise<SavedPdfAliasLearningResult> {
  const result = newLearningResult(renames.length)
  if (renames.length === 0) return result

  const dictionaryById = new Map(dictionaryKeys.map((key) => [key.id, key]))
  const canonicalNames = new Set(
    dictionaryKeys.map((key) => normalizeAliasName(key.key_name))
  )

  // Never learn a renamed signature field as a global alias.
  // Python may preserve signed documents; that is independent of learning.
  const signatureNames = new Set(
    inspection.pages.flatMap((page) => page.fields)
      .filter((field) => field.fieldType === 'signature')
      .map((field) => field.originalName)
  )

  // Do not create any aliases if we cannot check for existing aliases.
  // A failed preflight must fail CLOSED rather than risk conflicting writes.
  let existingAliases: Awaited<ReturnType<typeof getFieldAliases>>
  try {
    existingAliases = await getFieldAliases({ includeInactive: true })
  } catch (error) {
    result.skipped = renames.length
    result.warnings.push(
      'The PDF was saved, but existing aliases could not be checked. ' +
      'No new aliases were written. ' +
      (error instanceof Error ? error.message : 'Alias lookup failed.')
    )
    return result
  }

  const existingByName = new Map(
    existingAliases.map((alias) => [alias.normalized_name, alias])
  )
  const seenInSave = new Map<string, string>()

  // Collect safe candidates first, identifying conflicting targets
  // within the same saved document before writing anything.
  const candidates: Array<{
    originalName: string
    normalizedName: string
    dictionaryKeyId: string
  }> = []
  const conflictsInSave = new Set<string>()

  for (const rename of renames) {
    const { originalName, dictionaryKeyId, canonicalName } = rename
    const dictionaryTarget = dictionaryById.get(dictionaryKeyId)
    const normalizedName = normalizeAliasName(originalName)

    if (
      !dictionaryTarget?.is_active ||
      dictionaryTarget.key_name !== canonicalName ||
      signatureNames.has(originalName) ||
      !isDescriptiveGlobalName(originalName) ||
      canonicalNames.has(normalizedName) ||
      !normalizedName
    ) {
      result.skipped++
      continue
    }

    const priorTarget = seenInSave.get(normalizedName)
    if (priorTarget !== undefined) {
      if (priorTarget !== dictionaryKeyId) {
        conflictsInSave.add(normalizedName)
      }
      // One global alias per normalized name, even if several fields
      // or spellings in this PDF normalize to the same value.
      result.skipped++
      continue
    }

    seenInSave.set(normalizedName, dictionaryKeyId)
    candidates.push({ originalName, normalizedName, dictionaryKeyId })
  }

  for (const candidate of candidates) {
    if (conflictsInSave.has(candidate.normalizedName)) {
      result.conflicts++
      result.warnings.push(
        `Skipped "${candidate.originalName}": different mappings in this ` +
        'save resolve to the same normalized alias.'
      )
      continue
    }

    const existing = existingByName.get(candidate.normalizedName)
    if (existing) {
      if (existing.dictionary_key_id !== candidate.dictionaryKeyId) {
        result.conflicts++
        result.warnings.push(
          `Skipped "${candidate.originalName}": a global alias already ` +
          'exists for a different dictionary key. Review it in Dictionary.'
        )
      } else if (existing.is_active) {
        result.alreadyKnown++
      } else {
        result.skipped++
        result.warnings.push(
          `Skipped "${candidate.originalName}": its existing alias is ` +
          'inactive. Reactivate it manually if appropriate.'
        )
      }
      continue
    }

    try {
      const created = await createFieldAlias({
        originalName: candidate.originalName,
        dictionaryKeyId: candidate.dictionaryKeyId,
        notes: 'Learned from a user-confirmed mapping after successful PDF save.',
      })
      existingByName.set(created.normalized_name, created)
      result.created++
    } catch (error) {
      // Includes concurrent unique constraint errors and RLS failures.
      // Never turn a saved PDF into a reported save failure.
      result.failed++
      result.warnings.push(
        `Could not learn "${candidate.originalName}": ` +
        (error instanceof Error ? error.message : 'Unknown database error.')
      )
    }
  }

  // Refresh the shared recognition cache and notify its subscribers.
  // Document-wide review can also use its existing Refresh button.
  if (result.created > 0) {
    invalidateRecognitionCatalog()
    try {
      const catalog = await getRecognitionCatalog()
      if (catalog.aliasesError) {
        result.warnings.push(
          'Aliases were saved, but refreshing recognition aliases failed: ' +
          catalog.aliasesError
        )
      }
    } catch (error) {
      result.warnings.push(
        'Aliases were saved, but the recognition catalog could not refresh: ' +
        (error instanceof Error ? error.message : 'Unknown refresh error.')
      )
    }
  }

  return result
}