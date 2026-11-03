// ============================================================
// PDF FIELD MAPPER
// LOCAL PDF DRAFT STORAGE
// ============================================================
//
// PURPOSE:
//
// Preserve unsaved field mappings between application sessions.
//
// FEATURES:
//
// - Identify PDFs using a SHA-256 content fingerprint.
// - Store mappings locally.
// - Restore mappings when the same PDF is reopened.
// - Validate restored widget identities.
// - Prevent drafts from being applied to unrelated PDFs.
// - Allow users to explicitly discard saved drafts.
//
// IMPORTANT:
//
// This service never stores PDF document bytes.
//
// Only widget identifiers and dictionary key IDs are stored.
//
// No Supabase operations occur here.
//
// ============================================================

import type {
  PdfInspectionResult,
} from './inspectPdf'

import {
  getPdfWidgetKey,
} from './preparePdfRenames'


// ============================================================
// STORAGE CONFIGURATION
// ============================================================

const STORAGE_PREFIX =
  'pdf-field-mapper:local-draft:v1:'

// Maximum number of locally stored mappings per document.
const MAX_MAPPINGS = 5000

// Limit the size of an individual saved draft.
const MAX_RECORD_CHARS = 1_000_000


// ============================================================
// STORED DRAFT FORMAT
// ============================================================

interface StoredPdfDraft {

  version: 1

  mappings: Record<string, string>

}


// ============================================================
// RESTORED DRAFT RESULT
// ============================================================

export interface RecoveredPdfDraft {

  mappings: Record<string, string>

  ignoredMappings: number

}


// ============================================================
// IDENTIFY PDF
// ============================================================
//
// Calculate SHA-256 using the original PDF contents.
//
// Two PDFs with the same filename but different contents
// receive different document identities.
//
// The contents are read locally and are not persisted.
//
// ============================================================

export async function identifyPdfForDrafts(
  file: File
): Promise<string> {

  if (!globalThis.crypto?.subtle) {

    throw new Error(
      'Secure local PDF identification is not available.'
    )

  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    await file.arrayBuffer()
  )

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('')

}


// ============================================================
// BUILD STORAGE KEY
// ============================================================

function storageKey(
  documentId: string
): string {

  if (!/^[a-f0-9]{64}$/.test(documentId)) {

    throw new Error(
      'Invalid PDF draft identity.'
    )

  }

  return STORAGE_PREFIX + documentId

}


// ============================================================
// RECOVER PDF DRAFT
// ============================================================
//
// Retrieve mappings saved for the exact same PDF.
//
// IMPORTANT:
//
// The saved widget identities must still exist in the
// current inspection.
//
// Any outdated or invalid mappings are ignored.
//
// ============================================================

export function recoverPdfDraft(

  documentId: string,

  inspection: PdfInspectionResult

): RecoveredPdfDraft {

  const raw = localStorage.getItem(
    storageKey(documentId)
  )

  if (raw === null) {

    return {
      mappings: {},
      ignoredMappings: 0,
    }

  }

  if (raw.length > MAX_RECORD_CHARS) {

    throw new Error(
      'The saved mapping draft is unexpectedly large.'
    )

  }

  // ----------------------------------------------------------
  // PARSE STORED DATA
  // ----------------------------------------------------------

  let parsed: unknown

  try {

    parsed = JSON.parse(raw)

  } catch {

    throw new Error(
      'The saved mapping draft could not be read.'
    )

  }

  // ----------------------------------------------------------
  // VALIDATE SAVED FORMAT
  // ----------------------------------------------------------

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('version' in parsed) ||
    parsed.version !== 1 ||
    !('mappings' in parsed) ||
    !parsed.mappings ||
    typeof parsed.mappings !== 'object' ||
    Array.isArray(parsed.mappings)
  ) {

    throw new Error(
      'The saved mapping draft has an unsupported format.'
    )

  }

  const saved =
    parsed.mappings as Record<string, unknown>


  // ----------------------------------------------------------
  // COLLECT CURRENT WIDGET IDENTITIES
  // ----------------------------------------------------------

  const validWidgetKeys = new Set(

    inspection.pages.flatMap(
      (page) =>
        page.fields.map(getPdfWidgetKey)
    )

  )


  // ----------------------------------------------------------
  // RESTORE VALID MAPPINGS
  // ----------------------------------------------------------

  const mappings: Record<string, string> = {}

  let ignoredMappings = 0

  for (const [
    widgetKey,
    dictionaryKeyId,
  ] of Object.entries(saved)) {

    if (
      !validWidgetKeys.has(widgetKey) ||
      typeof dictionaryKeyId !== 'string' ||
      dictionaryKeyId.length === 0 ||
      dictionaryKeyId.length > 200
    ) {

      ignoredMappings++

      continue

    }

    mappings[widgetKey] =
      dictionaryKeyId

  }

  return {

    mappings,

    ignoredMappings,

  }

}


// ============================================================
// PERSIST PDF DRAFT
// ============================================================
//
// Save the current mapping assignments locally.
//
// An empty mapping collection removes the saved record.
//
// This service does not modify the PDF or Supabase.
//
// ============================================================

export function persistPdfDraft(

  documentId: string,

  mappings: Record<string, string>

): void {

  const entries =
    Object.entries(mappings)

  // ----------------------------------------------------------
  // VALIDATE MAPPING COUNT
  // ----------------------------------------------------------

  if (entries.length > MAX_MAPPINGS) {

    throw new Error(
      'Too many mappings for local draft storage.'
    )

  }

  // ----------------------------------------------------------
  // REMOVE EMPTY DRAFT
  // ----------------------------------------------------------

  if (entries.length === 0) {

    localStorage.removeItem(
      storageKey(documentId)
    )

    return

  }

  // ----------------------------------------------------------
  // PREPARE STORAGE RECORD
  // ----------------------------------------------------------

  const record: StoredPdfDraft = {

    version: 1,

    mappings,

  }

  const serialized =
    JSON.stringify(record)

  if (serialized.length > MAX_RECORD_CHARS) {

    throw new Error(
      'This mapping draft exceeds local storage limits.'
    )

  }

  // ----------------------------------------------------------
  // SAVE LOCALLY
  // ----------------------------------------------------------

  localStorage.setItem(
    storageKey(documentId),
    serialized
  )

}


// ============================================================
// DISCARD PDF DRAFT
// ============================================================
//
// Explicitly remove a document's saved mappings.
//
// This does not delete the PDF itself.
//
// It also does not remove previously learned aliases
// from Supabase.
//
// ============================================================

export function discardPdfDraft(
  documentId: string
): void {

  localStorage.removeItem(
    storageKey(documentId)
  )

}