// ============================================================
// PDF FIELD MAPPER
// PDF FIELD RENAME PREPARATION
// ============================================================
//
// PURPOSE:
//
// Validate draft PDF field mappings and prepare a safe
// document-level field-renaming plan.
//
// RESPONSIBILITIES:
//
// - Identify mappings assigned to inspected PDF widgets.
// - Resolve dictionary IDs into canonical field names.
// - Detect conflicting assignments.
// - Detect incomplete logical-field assignments.
// - Prevent duplicate output field names.
// - Reject unsupported field-renaming scenarios.
//
// IMPORTANT:
//
// - This service does not modify a PDF.
// - This service does not write to Supabase.
// - This service does not save learned aliases.
// - All mapping validation happens before PDF writing.
//
// ============================================================

import type {
  InspectedPdfField,
  PdfInspectionResult,
} from './inspectPdf'

// ============================================================
// DICTIONARY KEY
// ============================================================
//
// Only the properties required for PDF renaming are needed.
//
// Existing DictionaryKey records are compatible with
// this interface.
//
// ============================================================

export interface PdfRenameDictionaryKey {
  id: string
  key_name: string
  is_active: boolean
}

// ============================================================
// FIELD RENAME
// ============================================================
//
// Represents one logical PDF field-name change.
//
// Several interactive widgets may share one original
// logical field name.
//
// ============================================================

export interface PdfFieldRename {
  originalName: string
  canonicalName: string
  dictionaryKeyId: string
  widgetCount: number
}

// ============================================================
// VALIDATION ISSUE TYPES
// ============================================================

export type PdfRenameIssueCode =
  | 'stale_mapping'
  | 'invalid_dictionary_key'
  | 'inactive_dictionary_key'
  | 'conflicting_mappings'
  | 'incomplete_field_mapping'
  | 'duplicate_output_name'
  | 'unsupported_field_name'
  | 'unsupported_field_type'
  | 'no_changes'

// ============================================================
// VALIDATION ISSUE
// ============================================================

export interface PdfRenameIssue {
  code: PdfRenameIssueCode
  message: string
  originalName?: string
}

// ============================================================
// PREPARED RENAME PLAN
// ============================================================

export interface PdfRenamePlan {

  // Whether the plan passed every validation rule.
  isValid: boolean

  // Logical field-name changes ready for PDF writing.
  renames: PdfFieldRename[]

  // Number of widgets with draft assignments.
  mappedWidgetCount: number

  // Number of unique inspected logical field names.
  logicalFieldCount: number

  // Any problems that prevent safe PDF writing.
  issues: PdfRenameIssue[]

}

// ============================================================
// UNIQUE PDF WIDGET IDENTITY
// ============================================================
//
// Must match the identity currently used by EditorPage.
//
// Multiple widgets may share an original field name,
// but each inspected widget has its own draft mapping.
//
// ============================================================

export function getPdfWidgetKey(
  field: InspectedPdfField
): string {

  return JSON.stringify([
    field.pageNumber,
    field.id,
    field.widgetIndex,
  ])

}

// ============================================================
// VALIDATE CANONICAL OUTPUT NAME
// ============================================================
//
// The initial writing milestone supports simple,
// nonhierarchical canonical field identifiers.
//
// Examples:
//
// customer_name
// company_phone
// job_price
//
// Hierarchical field names containing periods are deferred
// until we explicitly support PDF form field hierarchies.
//
// ============================================================

function isSupportedCanonicalName(
  value: string
): boolean {

  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)

}

// ============================================================
// PREPARE PDF FIELD RENAMES
// ============================================================
//
// INPUT:
//
// - PDF inspection results.
// - Current draft mappings from EditorPage.
// - Approved dictionary records.
//
// OUTPUT:
//
// - Validated field-renaming plan.
// - Any validation issues.
//
// A plan containing validation issues must not be written.
//
// ============================================================

export function preparePdfRenames(

  inspection: PdfInspectionResult,

  draftMappings: Record<string, string>,

  dictionaryKeys: PdfRenameDictionaryKey[]

): PdfRenamePlan {

  const issues: PdfRenameIssue[] = []

  const renames: PdfFieldRename[] = []

  // ==========================================================
  // PREPARE DICTIONARY LOOKUP
  // ==========================================================

  const dictionaryById =
    new Map(
      dictionaryKeys.map(
        (entry) => [entry.id, entry]
      )
    )

  // ==========================================================
  // GROUP WIDGETS BY ORIGINAL FIELD NAME
  // ==========================================================
  //
  // One logical AcroForm field can have several widgets.
  //
  // We group them by their fully qualified original
  // field name because renaming operates at field level,
  // not independently on each widget.
  //
  // ==========================================================

  const widgetsByOriginalName =
    new Map<string, InspectedPdfField[]>()

  const inspectedWidgetKeys =
    new Set<string>()

  for (const page of inspection.pages) {

    for (const field of page.fields) {

      const widgetKey =
        getPdfWidgetKey(field)

      inspectedWidgetKeys.add(widgetKey)

      const existing =
        widgetsByOriginalName.get(
          field.originalName
        ) ?? []

      existing.push(field)

      widgetsByOriginalName.set(
        field.originalName,
        existing
      )

    }

  }

  // ==========================================================
  // CHECK FOR STALE DRAFT MAPPINGS
  // ==========================================================
  //
  // A mapping must not refer to a widget belonging to
  // another PDF or an earlier inspection session.
  //
  // ==========================================================

  for (const [
    widgetKey,
    dictionaryKeyId,
  ] of Object.entries(draftMappings)) {

    if (!dictionaryKeyId) {
      continue
    }

    if (!inspectedWidgetKeys.has(widgetKey)) {

      issues.push({
        code: 'stale_mapping',
        message:
          'A draft mapping refers to a widget that ' +
          'does not exist in the current PDF inspection.',
      })

    }

  }

  // ==========================================================
  // COUNT MAPPED WIDGETS
  // ==========================================================

  let mappedWidgetCount = 0

  for (const widgetKey of inspectedWidgetKeys) {

    if (draftMappings[widgetKey]) {
      mappedWidgetCount++
    }

  }

  // ==========================================================
  // EVALUATE LOGICAL PDF FIELDS
  // ==========================================================

  const finalNameByOriginal =
    new Map<string, string>()

  for (const [
    originalName,
    widgets,
  ] of widgetsByOriginalName) {

    // Default: preserve the original field name.
    finalNameByOriginal.set(
      originalName,
      originalName
    )

    // --------------------------------------------------------
    // FIND MAPPED WIDGETS
    // --------------------------------------------------------

    const mappedWidgets = widgets.filter(
      (field) =>
        Boolean(
          draftMappings[getPdfWidgetKey(field)]
        )
    )

    // No draft mapping for this logical field.
    if (mappedWidgets.length === 0) {
      continue
    }

    // --------------------------------------------------------
    // CHECK ORIGINAL FIELD NAME
    // --------------------------------------------------------

    if (
      !originalName.trim() ||
      originalName.includes('.')
    ) {

      issues.push({
        code: 'unsupported_field_name',
        originalName,
        message:
          `The field "${originalName || '(unnamed)'}" ` +
          'cannot be renamed by the initial PDF writer. ' +
          'Unnamed and hierarchical fields require ' +
          'additional handling.',
      })

      continue

    }

    // --------------------------------------------------------
    // CHECK FIELD TYPE
    // --------------------------------------------------------
    //
    // Signature field renaming is deferred.
    //
    // Existing digital signatures can also be invalidated
    // by modifying a PDF.
    //
    // --------------------------------------------------------

    if (
      widgets.some(
        (field) =>
          field.fieldType === 'signature'
      )
    ) {

      issues.push({
        code: 'unsupported_field_type',
        originalName,
        message:
          `The signature field "${originalName}" ` +
          'is not supported by the initial PDF writer.',
      })

      continue

    }

    // --------------------------------------------------------
    // CHECK COMPLETE GROUP MAPPING
    // --------------------------------------------------------
    //
    // Every widget representing the same logical field
    // must have a mapping before renaming the field.
    //
    // This prevents a single widget selection from
    // unexpectedly renaming other unmapped widgets.
    //
    // --------------------------------------------------------

    if (
      mappedWidgets.length !== widgets.length
    ) {

      issues.push({
        code: 'incomplete_field_mapping',
        originalName,
        message:
          `"${originalName}" has ` +
          `${widgets.length} widgets, but only ` +
          `${mappedWidgets.length} are mapped. ` +
          'Map every widget consistently before saving.',
      })

      continue

    }

    // --------------------------------------------------------
    // CHECK CONFLICTING MAPPINGS
    // --------------------------------------------------------

    const dictionaryIds =
      new Set(
        mappedWidgets.map(
          (field) =>
            draftMappings[getPdfWidgetKey(field)]
        )
      )

    if (dictionaryIds.size !== 1) {

      issues.push({
        code: 'conflicting_mappings',
        originalName,
        message:
          `Widgets belonging to "${originalName}" ` +
          'have conflicting canonical mappings.',
      })

      continue

    }

    // --------------------------------------------------------
    // RESOLVE DICTIONARY KEY
    // --------------------------------------------------------

    const dictionaryKeyId =
      [...dictionaryIds][0]

    const dictionaryEntry =
      dictionaryById.get(dictionaryKeyId)

    if (!dictionaryEntry) {

      issues.push({
        code: 'invalid_dictionary_key',
        originalName,
        message:
          `"${originalName}" references a dictionary ` +
          'key that no longer exists.',
      })

      continue

    }

    if (!dictionaryEntry.is_active) {

      issues.push({
        code: 'inactive_dictionary_key',
        originalName,
        message:
          `"${originalName}" references an inactive ` +
          'dictionary key.',
      })

      continue

    }

    // --------------------------------------------------------
    // VALIDATE CANONICAL NAME
    // --------------------------------------------------------

    const canonicalName =
      dictionaryEntry.key_name

    if (
      !isSupportedCanonicalName(canonicalName)
    ) {

      issues.push({
        code: 'unsupported_field_name',
        originalName,
        message:
          `The canonical name "${canonicalName}" ` +
          'is not supported by the initial PDF writer.',
      })

      continue

    }

    // --------------------------------------------------------
    // RECORD FINAL NAME
    // --------------------------------------------------------

    finalNameByOriginal.set(
      originalName,
      canonicalName
    )

    // No rename is required when the existing PDF field
    // already has the approved canonical name.
    if (originalName === canonicalName) {
      continue
    }

    renames.push({
      originalName,
      canonicalName,
      dictionaryKeyId,
      widgetCount: widgets.length,
    })

  }

  // ==========================================================
  // CHECK FOR DUPLICATE FINAL FIELD NAMES
  // ==========================================================
  //
  // Two different logical fields must not end up with
  // the same fully qualified name.
  //
  // This also protects unmapped fields whose original
  // names would otherwise collide with a new name.
  //
  // ==========================================================

  const originalByFinalName =
    new Map<string, string>()

  for (const [
    originalName,
    finalName,
  ] of finalNameByOriginal) {

    const existingOriginal =
      originalByFinalName.get(finalName)

    if (
      existingOriginal !== undefined &&
      existingOriginal !== originalName
    ) {

      issues.push({
        code: 'duplicate_output_name',
        originalName,
        message:
          `"${originalName}" and ` +
          `"${existingOriginal}" would both be named ` +
          `"${finalName}" in the output PDF.`,
      })

      continue

    }

    originalByFinalName.set(
      finalName,
      originalName
    )

  }

  // ==========================================================
  // REQUIRE AT LEAST ONE ACTUAL NAME CHANGE
  // ==========================================================

  if (
    renames.length === 0 &&
    issues.length === 0
  ) {

    issues.push({
      code: 'no_changes',
      message:
        'No PDF field-name changes are ready to save. ' +
        'Assign at least one field to a different ' +
        'canonical name.',
    })

  }

  // ==========================================================
  // RETURN PREPARED PLAN
  // ==========================================================

  return {
    isValid: issues.length === 0,
    renames,
    mappedWidgetCount,
    logicalFieldCount:
      widgetsByOriginalName.size,
    issues,
  }

}