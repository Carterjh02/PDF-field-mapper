// ============================================================
// PDF FIELD MAPPER
// PDF FIELD WRITING SERVICE
// ============================================================
//
// PURPOSE:
//
// Apply validated canonical field-name mappings to a copy
// of an existing interactive PDF document.
//
// RESPONSIBILITIES:
//
// - Validate requested renames.
// - Load the original PDF using pdf-lib.
// - Locate logical AcroForm fields.
// - Rename fields to approved canonical names.
// - Preserve the original file.
// - Serialize the modified document.
// - Verify the resulting PDF field names.
//
// IMPORTANT:
//
// - This service operates locally.
// - No PDF documents are uploaded.
// - No Supabase writes occur.
// - No learned aliases are saved.
// - This does not fill fields with customer/job values.
//
// PDF-LIB:
//
// Initial implementation targets pdf-lib 1.17.1.
//
// Field renaming uses the underlying AcroForm field API.
// This behavior must be verified against our test PDFs
// before enabling the Editor's Save PDF button.
//
// ============================================================

import {
  PDFDocument,
} from 'pdf-lib'

import type {
  PdfInspectionResult,
} from './inspectPdf'

import {
  preparePdfRenames,
  type PdfFieldRename,
  type PdfRenameDictionaryKey,
  type PdfRenamePlan,
} from './preparePdfRenames'

// ============================================================
// WRITE MAPPED PDF INPUT
// ============================================================

export interface WriteMappedPdfInput {

  // Original PDF selected by the user.
  sourceFile: File

  // Inspection results for this PDF.
  inspection: PdfInspectionResult

  // Draft mappings managed by EditorPage.
  draftMappings: Record<string, string>

  // Approved canonical dictionary keys.
  dictionaryKeys: PdfRenameDictionaryKey[]

}

// ============================================================
// WRITE MAPPED PDF RESULT
// ============================================================

export interface WriteMappedPdfResult {

  // Serialized PDF output.
  bytes: Uint8Array

  // Suggested download filename.
  suggestedFileName: string

  // Number of logical fields renamed.
  renamedFieldCount: number

  // Number of widgets with draft assignments.
  mappedWidgetCount: number

  // Validated renames applied to the PDF.
  appliedRenames: PdfFieldRename[]

}

// ============================================================
// RENAMABLE PDF-LIB FIELD
// ============================================================
//
// pdf-lib 1.17.1 exposes its underlying AcroForm field
// object through acroField.
//
// setPartialName() modifies the PDF field's partial name.
//
// This is a lower-level API rather than a stable, high-level
// PDFField.rename() method.
//
// We isolate access here to avoid spreading dependency
// on pdf-lib internals throughout the application.
//
// ============================================================

interface RenamablePdfField {

  acroField?: {

    setPartialName?: (
      name: string
    ) => void

  }

}

// ============================================================
// SUGGEST OUTPUT FILENAME
// ============================================================

function createOutputFileName(
  originalName: string
): string {

  const withoutExtension =
    originalName.replace(/\.pdf$/i, '')

  return `${withoutExtension}-mapped.pdf`

}

// ============================================================
// FORMAT VALIDATION ERRORS
// ============================================================
//
// Convert validation issues into a readable message.
//
// The Editor will eventually display these errors
// before attempting to save.
//
// ============================================================

function formatPlanErrors(
  plan: PdfRenamePlan
): string {

  const details = plan.issues
    .map(
      (issue) => `• ${issue.message}`
    )
    .join('\n')

  return (
    'The PDF cannot be safely renamed:\n\n' +
    details
  )

}

// ============================================================
// VERIFY EXPECTED OUTPUT FIELD NAMES
// ============================================================
//
// Confirm the completed PDF contains the expected names.
//
// Also verify that the logical field count was preserved.
//
// This is a structural verification, not a visual PDF
// rendering comparison.
//
// ============================================================

async function verifyWrittenPdf(

  bytes: Uint8Array,

  originalLogicalFieldCount: number,

  expectedFieldNames: string[]

): Promise<void> {

  const verificationDocument =
    await PDFDocument.load(bytes, {
      updateMetadata: false,
    })

  const verificationForm =
    verificationDocument.getForm()

  const actualFieldNames =
    verificationForm
      .getFields()
      .map(
        (field) => field.getName()
      )

  // ----------------------------------------------------------
  // VERIFY FIELD COUNT
  // ----------------------------------------------------------

  if (
    actualFieldNames.length !==
    originalLogicalFieldCount
  ) {

    throw new Error(
      'The modified PDF did not preserve the expected ' +
      'number of logical AcroForm fields.'
    )

  }

  // ----------------------------------------------------------
  // VERIFY COMPLETE FIELD NAME SET
  // ----------------------------------------------------------

  const expectedNames =
    new Set(expectedFieldNames)

  const actualNames =
    new Set(actualFieldNames)

  if (
    expectedNames.size !==
    actualNames.size
  ) {

    throw new Error(
      'The modified PDF contains duplicate or ' +
      'unexpected field names.'
    )

  }

  for (const expectedName of expectedNames) {

    if (!actualNames.has(expectedName)) {

      throw new Error(
        `The modified PDF is missing the expected ` +
        `field "${expectedName}".`
      )

    }

  }

}

// ============================================================
// WRITE MAPPED PDF
// ============================================================
//
// Main PDF-writing operation.
//
// This function returns serialized PDF bytes.
//
// It does not download the file automatically.
// It does not overwrite the original file.
// It does not update Supabase.
//
// The Editor will eventually decide when to offer
// the generated PDF for download.
//
// ============================================================

export async function writeMappedPdf({

  sourceFile,

  inspection,

  draftMappings,

  dictionaryKeys,

}: WriteMappedPdfInput): Promise<WriteMappedPdfResult> {

  // ==========================================================
  // STEP 1: VALIDATE SOURCE FILE
  // ==========================================================

  if (
    !sourceFile.name.toLowerCase().endsWith('.pdf') ||
    sourceFile.size === 0
  ) {

    throw new Error(
      'Please provide a non-empty PDF file.'
    )

  }

  // ----------------------------------------------------------
  // VERIFY INSPECTION BELONGS TO SOURCE FILE
  // ----------------------------------------------------------
  //
  // This checks basic file metadata.
  //
  // It is not a cryptographic identity check.
  //
  // The Editor must pass the same File object that was
  // inspected to avoid mismatched document sessions.
  //
  // ----------------------------------------------------------

  if (
    inspection.fileName !== sourceFile.name ||
    inspection.fileSize !== sourceFile.size
  ) {

    throw new Error(
      'The PDF inspection does not match the ' +
      'selected source document. Reanalyze the PDF ' +
      'before saving.'
    )

  }

  // ==========================================================
  // STEP 2: PREPARE RENAME PLAN
  // ==========================================================

  const plan = preparePdfRenames(
    inspection,
    draftMappings,
    dictionaryKeys
  )

  if (!plan.isValid) {

    throw new Error(
      formatPlanErrors(plan)
    )

  }

  // ==========================================================
  // STEP 3: LOAD ORIGINAL PDF
  // ==========================================================

  const sourceBytes =
    await sourceFile.arrayBuffer()

  const pdfDocument =
    await PDFDocument.load(
      sourceBytes,
      {
        updateMetadata: false,
      }
    )

  const form =
    pdfDocument.getForm()

  // ==========================================================
  // STEP 4: CHECK FORM STRUCTURE
  // ==========================================================
  //
  // XFA-based forms are outside the scope of the initial
  // AcroForm renaming implementation.
  //
  // We must not silently convert or discard XFA content.
  //
  // ==========================================================

  if (form.hasXFA()) {

    throw new Error(
      'This PDF contains an XFA form. ' +
      'XFA modification is not supported by the ' +
      'initial PDF field writer.'
    )

  }

  const originalFields =
    form.getFields()

  const originalFieldNames =
    originalFields.map(
      (field) => field.getName()
    )

  const originalFieldNameSet =
    new Set(originalFieldNames)

  // ==========================================================
  // STEP 5: VERIFY ALL RENAME TARGETS EXIST
  // ==========================================================
  //
  // PDF.js inspection and pdf-lib may expose some
  // unusual PDF structures differently.
  //
  // We must confirm that every field to be renamed
  // exists as a logical AcroForm field in pdf-lib.
  //
  // ==========================================================

  for (const rename of plan.renames) {

    if (
      !originalFieldNameSet.has(
        rename.originalName
      )
    ) {

      throw new Error(
        `The field "${rename.originalName}" ` +
        'was detected during inspection but could ' +
        'not be located in the PDF AcroForm.'
      )

    }

  }

  // ==========================================================
  // STEP 6: VALIDATE COMPLETE OUTPUT NAME SET
  // ==========================================================
  //
  // The PDF may contain logical fields not exposed
  // as interactive widgets during inspection.
  //
  // Include those fields when checking for duplicate
  // output names.
  //
  // ==========================================================

  const renameByOriginal =
    new Map(
      plan.renames.map(
        (rename) => [
          rename.originalName,
          rename.canonicalName,
        ]
      )
    )

  const expectedFieldNames =
    originalFieldNames.map(
      (originalName) =>

        renameByOriginal.get(originalName) ??
        originalName

    )

  const uniqueExpectedNames =
    new Set(expectedFieldNames)

  if (
    uniqueExpectedNames.size !==
    expectedFieldNames.length
  ) {

    throw new Error(
      'The selected mappings would create duplicate ' +
      'AcroForm field names. Resolve the duplicate ' +
      'mappings before saving.'
    )

  }

  // ==========================================================
  // STEP 7: APPLY FIELD RENAMES
  // ==========================================================
  //
  // Rename the underlying logical AcroForm fields.
  //
  // We do not create new widgets or modify their
  // coordinates, values, or appearance settings.
  //
  // IMPORTANT:
  //
  // Rename only nonhierarchical field names in this
  // initial implementation.
  //
  // ==========================================================

  for (const rename of plan.renames) {

    const field =
      form.getField(rename.originalName)

    // Access pdf-lib's underlying AcroForm field object.
    const renamable =
      field as unknown as RenamablePdfField

    const acroField =
      renamable.acroField

    if (
      !acroField ||
      typeof acroField.setPartialName !== 'function'
    ) {

      throw new Error(
        `The field "${rename.originalName}" ` +
        'does not expose a supported renaming API.'
      )

    }

    // Modify the field name in the in-memory PDF copy.
    acroField.setPartialName(
      rename.canonicalName
    )

  }

  // ==========================================================
  // STEP 8: SERIALIZE MODIFIED PDF
  // ==========================================================
  //
  // Use object streams = false for broad PDF-reader
  // compatibility during the initial milestone.
  //
  // The output remains in memory until the Editor
  // offers it for download.
  //
  // ==========================================================

  const outputBytes =
    await pdfDocument.save({
      useObjectStreams: false,
    })

  // ==========================================================
  // STEP 9: VERIFY WRITTEN PDF
  // ==========================================================
  //
  // Reopen the serialized file and verify all logical
  // field names.
  //
  // This does not replace a full visual regression test,
  // which we'll perform during the save milestone.
  //
  // ==========================================================

  await verifyWrittenPdf(
    outputBytes,
    originalFieldNames.length,
    expectedFieldNames
  )

  // ==========================================================
  // STEP 10: RETURN RESULT
  // ==========================================================

  return {

    bytes: outputBytes,

    suggestedFileName:
      createOutputFileName(
        sourceFile.name
      ),

    renamedFieldCount:
      plan.renames.length,

    mappedWidgetCount:
      plan.mappedWidgetCount,

    appliedRenames:
      plan.renames,

  }

}