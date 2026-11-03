// ============================================================
// PDF FIELD MAPPER
// EDITOR PAGE
// ============================================================
//
// PURPOSE:
//
// Main workspace for inspecting, mapping, and saving PDF forms.
//
// RESPONSIBILITIES:
//
// - Display the PDF viewer.
// - Manage selected PDF fields.
// - Manage draft dictionary mappings.
// - Display the Field Inspector.
// - Display document-wide recognition.
// - Prepare validated PDF field renames.
// - Save modified PDFs through Electron and Python.
// - Learn eligible aliases after successful PDF saves.
// - Automatically save draft mappings locally.
// - Restore drafts when the same PDF is reopened.
//
// ARCHITECTURE:
//
// PDF.js:
// Document rendering and interactive field inspection.
//
// React:
// Field selection, mapping state, and UI.
//
// Electron:
// Secure communication with the desktop environment.
//
// Python:
// Actual PDF field renaming and file writing.
//
// Supabase:
// Canonical dictionary and learned aliases.
//
// Local Storage:
// Temporary mapping drafts associated with a PDF fingerprint.
//
// IMPORTANT:
//
// Original PDFs are never modified by this component.
//
// ============================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

// ============================================================
// COMMON COMPONENTS
// ============================================================

import {
  Button,
} from '../components/common/Button'

import {
  Badge,
} from '../components/common/Badge'

import {
  Card,
} from '../components/common/Card'

// ============================================================
// PDF COMPONENTS
// ============================================================

import {
  PdfPageViewer,
  type PdfViewerInfo,
} from '../components/pdf/PdfPageViewer'

import {
  PdfFieldMappingPanel,
} from '../components/pdf/PdfFieldMappingPanel'

import {
  PdfDocumentRecognitionReview,
} from '../components/pdf/PdfDocumentRecognitionReview'

// ============================================================
// PDF SERVICES
// ============================================================

import {
  getPdfWidgetKey,
  preparePdfRenames,
} from '../lib/pdf/preparePdfRenames'

import type {
  InspectedPdfField,
} from '../lib/pdf/inspectPdf'

// ============================================================
// SUPABASE SERVICES
// ============================================================

import {
  getRecognitionCatalog,
} from '../lib/supabase/recognitionCatalog'

import {
  learnAliasesFromSavedPdf,
} from '../lib/supabase/learnSavedPdfAliases'

// ============================================================
// LOCAL DRAFT STORAGE
// ============================================================
//
// These functions manage local draft recovery.
//
// PDF bytes are not stored.
//
// ============================================================

import {
  discardPdfDraft,
  identifyPdfForDrafts,
  persistPdfDraft,
  recoverPdfDraft,
} from '../lib/pdf/pdfDraftStorage'

// ============================================================
// INITIAL VIEWER INFORMATION
// ============================================================

const initialViewerInfo: PdfViewerInfo = {

  fileName: null,

  pageNumber: 1,

  pageCount: 0,

  inspection: null,

  isOpening: false,

  isInspecting: false,

}

// ============================================================
// LOCAL DRAFT STATUS
// ============================================================

type DraftStorageState =
  | 'idle'
  | 'identifying'
  | 'ready'
  | 'unavailable'

// ============================================================
// MAIN EDITOR COMPONENT
// ============================================================

export function EditorPage() {

  const navigate = useNavigate()

  // ==========================================================
  // VIEWER STATE
  // ==========================================================

  const [viewerInfo, setViewerInfo] =
    useState<PdfViewerInfo>(
      initialViewerInfo
    )

  const [sourceFile, setSourceFile] =
    useState<File | null>(null)

  const [selectedField, setSelectedField] =
    useState<InspectedPdfField | null>(null)

  // ==========================================================
  // DRAFT MAPPINGS
  // ==========================================================
  //
  // Key:
  // Unique PDF widget identity.
  //
  // Value:
  // Selected canonical dictionary key ID.
  //
  // These mappings remain temporary until the PDF
  // is processed.
  //
  // ==========================================================

  const [draftMappings, setDraftMappings] =
    useState<Record<string, string>>({})

  // ==========================================================
  // PDF SAVE STATE
  // ==========================================================

  const [isSaving, setIsSaving] =
    useState(false)

  const [saveError, setSaveError] =
    useState('')

  const [saveMessage, setSaveMessage] =
    useState('')

  const [saveWarning, setSaveWarning] =
    useState('')

  // ==========================================================
  // SUPABASE ALIAS LEARNING STATE
  // ==========================================================
  //
  // Users can disable alias learning while still saving
  // their modified PDFs.
  //
  // Alias learning occurs only after Python confirms
  // that the modified PDF was saved successfully.
  //
  // ==========================================================

  const [learnAliasesOnSave, setLearnAliasesOnSave] =
    useState(true)

  const [isLearningAliases, setIsLearningAliases] =
    useState(false)

  // ==========================================================
  // LOCAL DRAFT RECOVERY STATE
  // ==========================================================
  //
  // The original PDF receives a SHA-256 fingerprint.
  //
  // That fingerprint identifies the local mapping draft.
  //
  // Different PDFs receive different draft identities,
  // even when they share the same filename.
  //
  // ==========================================================

  const [draftIdentity, setDraftIdentity] =
    useState<string | null>(null)

  const [hydratedInspection, setHydratedInspection] =
    useState<PdfViewerInfo['inspection']>(null)

  const [draftStorageState, setDraftStorageState] =
    useState<DraftStorageState>('idle')

  const [draftRecoveryNote, setDraftRecoveryNote] =
    useState('')

  // ==========================================================
  // DOCUMENT SESSION REFERENCES
  // ==========================================================
  //
  // These references help prevent asynchronous operations
  // from updating the wrong document.
  //
  // For example:
  //
  // A user might open another PDF while an earlier
  // save operation is still finishing.
  //
  // ==========================================================

  const documentSessionRef =
    useRef(0)

  const savingRef =
    useRef(false)

  // ==========================================================
  // HANDLE VIEWER INFORMATION CHANGES
  // ==========================================================

  const handleViewerInfoChange = useCallback(
    (info: PdfViewerInfo) => {

      setViewerInfo(info)

    },
    []
  )

  // ==========================================================
  // HANDLE SOURCE PDF CHANGES
  // ==========================================================
  //
  // Called when PdfPageViewer opens another PDF.
  //
  // Reset the current document session.
  //
  // IMPORTANT:
  //
  // Resetting in-memory mappings does not delete
  // previously saved local drafts.
  //
  // ==========================================================

  const handleSourceFileChange = useCallback(
    (file: File | null) => {

      // Invalidate results belonging to the previous PDF.
      documentSessionRef.current += 1

      // Store the new original File object.
      setSourceFile(file)

      // Reset previous viewer information.
      setViewerInfo(initialViewerInfo)

      // Reset local draft identification.
      setDraftIdentity(null)

      // Reset recovery status.
      setHydratedInspection(null)

      setDraftStorageState(
        file ? 'identifying' : 'idle'
      )

      setDraftRecoveryNote('')

      // Clear previous field selection.
      setSelectedField(null)

      // Clear temporary mappings from memory.
      setDraftMappings({})

      // Clear previous save messages.
      setSaveError('')
      setSaveMessage('')
      setSaveWarning('')

    },
    []
  )

  // ==========================================================
  // CLEAR DRAFT MAPPINGS
  // ==========================================================
  //
  // PdfPageViewer calls this when the document is
  // selected or reanalyzed.
  //
  // The viewer's inspection may temporarily become null.
  //
  // We must not overwrite a saved local draft with an
  // empty mapping collection during that transition.
  //
  // The existing draft will be restored after
  // inspection finishes.
  //
  // ==========================================================

  const clearDraftMappings = useCallback(
    () => {

      // Pause autosave until inspection is ready again.
      setHydratedInspection(null)

      // Clear temporary on-screen mappings.
      setDraftMappings({})

      setSaveError('')
      setSaveMessage('')
      setSaveWarning('')

    },
    []
  )

  // ==========================================================
  // STEP 1: IDENTIFY THE ORIGINAL PDF
  // ==========================================================
  //
  // Calculate the PDF's SHA-256 fingerprint.
  //
  // This value is used as a local storage identifier.
  //
  // The actual document is not stored in localStorage.
  //
  // Asynchronous results from old document sessions
  // are ignored.
  //
  // ==========================================================

  useEffect(() => {

    if (!sourceFile) {
      return
    }

    const session =
      documentSessionRef.current

    let cancelled = false

    void identifyPdfForDrafts(sourceFile)

      .then((identity) => {

        if (
          cancelled ||
          session !== documentSessionRef.current
        ) {
          return
        }

        setDraftIdentity(identity)

      })

      .catch((error: unknown) => {

        if (
          cancelled ||
          session !== documentSessionRef.current
        ) {
          return
        }

        setDraftStorageState('unavailable')

        setDraftRecoveryNote(
          'Local draft recovery is unavailable: ' +
          (
            error instanceof Error
              ? error.message
              : 'Unknown error.'
          )
        )

      })

    return () => {

      cancelled = true

    }

  }, [sourceFile])

  // ==========================================================
  // STEP 2: RESTORE PREVIOUS MAPPINGS
  // ==========================================================
  //
  // Recovery occurs only after:
  //
  // 1. The original PDF has been identified.
  // 2. Interactive field inspection has completed.
  // 3. Current widget identities are available.
  //
  // Only saved widget identities that exist in the
  // current inspection can be restored.
  //
  // ==========================================================

  useEffect(() => {

    const inspection =
      viewerInfo.inspection

    if (
      !sourceFile ||
      !draftIdentity ||
      !inspection
    ) {
      return
    }

    // --------------------------------------------------------
    // VERIFY INSPECTION BELONGS TO CURRENT PDF
    // --------------------------------------------------------

    if (
      inspection.fileName !== sourceFile.name ||
      inspection.fileSize !== sourceFile.size
    ) {
      return
    }

    try {

      // ------------------------------------------------------
      // RECOVER SAVED MAPPINGS
      // ------------------------------------------------------

      const restored = recoverPdfDraft(
        draftIdentity,
        inspection
      )

      // ------------------------------------------------------
      // APPLY RECOVERED MAPPINGS
      // ------------------------------------------------------
      //
      // If the user selected any mappings before fingerprint
      // calculation finished, preserve those selections.
      //
      // Current session selections take precedence.
      //
      // ------------------------------------------------------

      setDraftMappings((current) => ({

        ...restored.mappings,

        ...current,

      }))

      // ------------------------------------------------------
      // REPORT RESTORATION
      // ------------------------------------------------------

      const restoredCount =
        Object.keys(restored.mappings).length

      setDraftRecoveryNote(

        restoredCount > 0

          ? `Restored ${restoredCount} mapping(s) from this computer.`

          : 'Local draft autosave is ready for this document.'

      )

      if (restored.ignoredMappings > 0) {

        setDraftRecoveryNote((message) =>

          message +
          ` ${restored.ignoredMappings} outdated mapping(s) were ignored.`

        )

      }

      // ------------------------------------------------------
      // ENABLE AUTOSAVE
      // ------------------------------------------------------

      setHydratedInspection(inspection)

      setDraftStorageState('ready')

    } catch (error) {

      // A local storage failure must not prevent mapping
      // or saving the PDF through Python.

      setHydratedInspection(null)

      setDraftStorageState('unavailable')

      setDraftRecoveryNote(
        'Local draft recovery is unavailable: ' +
        (
          error instanceof Error
            ? error.message
            : 'Unknown error.'
        )
      )

    }

  }, [
    draftIdentity,
    sourceFile,
    viewerInfo.inspection,
  ])

  // ==========================================================
  // STEP 3: AUTOMATICALLY SAVE MAPPING CHANGES
  // ==========================================================
  //
  // Runs whenever the user's mapping selections change.
  //
  // IMPORTANT:
  //
  // Autosave is disabled until the current inspection
  // has finished restoring its previous draft.
  //
  // This prevents temporary empty mapping states from
  // accidentally deleting stored progress.
  //
  // ==========================================================

  useEffect(() => {

    if (
      !draftIdentity ||
      !viewerInfo.inspection ||
      hydratedInspection !== viewerInfo.inspection ||
      draftStorageState !== 'ready'
    ) {
      return
    }

    try {

      persistPdfDraft(
        draftIdentity,
        draftMappings
      )

    } catch (error) {

      setDraftStorageState('unavailable')

      setDraftRecoveryNote(
        'Mappings still work, but autosave failed: ' +
        (
          error instanceof Error
            ? error.message
            : 'Unknown error.'
        )
      )

    }

  }, [
    draftIdentity,
    draftMappings,
    hydratedInspection,
    viewerInfo.inspection,
    draftStorageState,
  ])

  // ==========================================================
  // DISCARD LOCAL DRAFT
  // ==========================================================
  //
  // Explicitly removes the saved mappings for this PDF.
  //
  // This does not:
  //
  // - Delete the original PDF.
  // - Delete previously generated PDFs.
  // - Delete learned Supabase aliases.
  //
  // ==========================================================

  function handleDiscardLocalDraft() {

    if (
      !draftIdentity ||
      draftStorageState !== 'ready'
    ) {
      return
    }

    const confirmed = window.confirm(
      'Discard all draft mappings for this PDF on this computer?'
    )

    if (!confirmed) {
      return
    }

    try {

      discardPdfDraft(draftIdentity)

      // Clear current mappings as well.
      setDraftMappings({})

      setDraftRecoveryNote(
        'Local draft discarded. New mappings will be autosaved.'
      )

      setSaveError('')
      setSaveMessage('')
      setSaveWarning('')

    } catch (error) {

      setDraftStorageState('unavailable')

      setDraftRecoveryNote(
        'Could not discard the local draft: ' +
        (
          error instanceof Error
            ? error.message
            : 'Unknown error.'
        )
      )

    }

  }

  // ==========================================================
  // CURRENT PAGE
  // ==========================================================

  const currentPage =
    viewerInfo.inspection?.pages.find(
      (page) =>
        page.pageNumber === viewerInfo.pageNumber
    ) ?? null

  // ==========================================================
  // ACTIVE FIELD
  // ==========================================================

  const activeField =

    selectedField &&
    currentPage &&
    selectedField.pageNumber === viewerInfo.pageNumber

      ? selectedField

      : null

  // ==========================================================
  // SELECTED FIELD MAPPING
  // ==========================================================

  const selectedWidgetKey =
    activeField
      ? getPdfWidgetKey(activeField)
      : null

  const selectedDictionaryKeyId =
    selectedWidgetKey
      ? draftMappings[selectedWidgetKey] ?? null
      : null

  // ==========================================================
  // DRAFT MAPPING COUNT
  // ==========================================================

  const draftMappingCount =
    Object.keys(draftMappings).length

  // ==========================================================
  // UPDATE INDIVIDUAL OR DOCUMENT-WIDE MAPPINGS
  // ==========================================================
  //
  // Both mapping interfaces share the same state.
  //
  // The autosave effect will persist updates locally
  // after draft recovery is ready.
  //
  // ==========================================================

  const updateFieldMapping = useCallback(
    (
      field: InspectedPdfField,
      dictionaryKeyId: string | null
    ) => {

      const widgetKey =
        getPdfWidgetKey(field)

      setDraftMappings((current) => {

        const previous =
          current[widgetKey] ?? null

        if (previous === dictionaryKeyId) {
          return current
        }

        const next = {
          ...current,
        }

        if (dictionaryKeyId) {

          next[widgetKey] =
            dictionaryKeyId

        } else {

          delete next[widgetKey]

        }

        return next

      })

      // Existing save messages no longer describe
      // the current draft after a mapping changes.
      setSaveError('')
      setSaveMessage('')
      setSaveWarning('')

    },
    []
  )

  // ==========================================================
  // UPDATE THE SELECTED FIELD
  // ==========================================================

  function updateSelectedMapping(
    dictionaryKeyId: string | null
  ) {

    if (activeField) {

      updateFieldMapping(
        activeField,
        dictionaryKeyId
      )

    }

  }

  // ==========================================================
  // SAVE MODIFIED PDF
  // ==========================================================
  //
  // WORKFLOW:
  //
  // 1. Validate the original PDF and inspection.
  // 2. Retrieve current dictionary keys.
  // 3. Validate proposed field-name changes.
  // 4. Confirm the user's decisions.
  // 5. Send the PDF to Electron.
  // 6. Python modifies and saves the document.
  // 7. Report successful PDF saving.
  // 8. Optionally learn eligible aliases in Supabase.
  //
  // IMPORTANT:
  //
  // Database learning cannot turn a successful
  // PDF save into a failure.
  //
  // ==========================================================

  async function handleSavePdf() {

    if (savingRef.current) {
      return
    }

    savingRef.current = true

    setIsSaving(true)

    setSaveError('')
    setSaveMessage('')
    setSaveWarning('')

    const saveSession =
      documentSessionRef.current

    // --------------------------------------------------------
    // UPDATE SAVE MESSAGES ONLY FOR CURRENT DOCUMENT
    // --------------------------------------------------------

    const setCurrentSaveMessage = (
      message: string
    ) => {

      if (
        saveSession === documentSessionRef.current
      ) {

        setSaveMessage(message)

      }

    }

    const setCurrentSaveError = (
      message: string
    ) => {

      if (
        saveSession === documentSessionRef.current
      ) {

        setSaveError(message)

      }

    }

    try {

      // ======================================================
      // STEP 1: VERIFY CURRENT PDF
      // ======================================================

      const inspection =
        viewerInfo.inspection

      if (!sourceFile || !inspection) {

        throw new Error(
          'Open a PDF and analyze its interactive fields before saving.'
        )

      }

      if (
        viewerInfo.isOpening ||
        viewerInfo.isInspecting
      ) {

        throw new Error(
          'Wait for PDF loading and inspection to finish.'
        )

      }

      if (
        inspection.fileName !== sourceFile.name ||
        inspection.fileSize !== sourceFile.size
      ) {

        throw new Error(
          'The inspection does not match the current PDF. ' +
          'Reanalyze it before saving.'
        )

      }

      // ======================================================
      // STEP 2: VERIFY ELECTRON BRIDGE
      // ======================================================

      if (
        typeof window.electronAPI?.saveMappedPdf !== 'function'
      ) {

        throw new Error(
          'The Electron/Python save bridge is unavailable. ' +
          'Open the desktop application, not the browser preview.'
        )

      }

      // ======================================================
      // STEP 3: LOAD CURRENT DICTIONARY
      // ======================================================

      const catalog =
        await getRecognitionCatalog({
          forceRefresh: true,
        })

      if (
        saveSession !== documentSessionRef.current
      ) {
        return
      }

      // ======================================================
      // STEP 4: VALIDATE RENAME PLAN
      // ======================================================

      const plan =
        preparePdfRenames(

          inspection,

          draftMappings,

          catalog.dictionaryKeys

        )

      if (!plan.isValid) {

        throw new Error(
          'The selected mappings cannot be saved yet:\n\n' +
          plan.issues
            .map(
              (issue) => `• ${issue.message}`
            )
            .join('\n')
        )

      }

      // ======================================================
      // STEP 5: CONFIRM THE SAVE
      // ======================================================

      const confirmed =
        window.confirm(

          'Save Modified PDF?\n\n' +

          `Logical fields to rename: ${plan.renames.length}\n` +

          `Mapped widgets: ${plan.mappedWidgetCount}\n\n` +

          'The original PDF will not be overwritten.\n' +

          (
            learnAliasesOnSave

              ? 'After a successful save, eligible descriptive ' +
                'field names will be learned as global aliases ' +
                'in Supabase. Generic names will be skipped.\n\n'

              : 'Global alias learning is off for this save.\n\n'
          ) +

          'Continue to Save As?'

        )

      if (!confirmed) {
        return
      }

      if (
        saveSession !== documentSessionRef.current
      ) {
        return
      }

      // ======================================================
      // STEP 6: SAVE THROUGH ELECTRON AND PYTHON
      // ======================================================

      const result =
        await window.electronAPI.saveMappedPdf({

          fileName:
            sourceFile.name,

          pdfBytes:
            new Uint8Array(
              await sourceFile.arrayBuffer()
            ),

          renames:
            plan.renames.map(
              ({
                originalName,
                canonicalName,
              }) => ({

                originalName,

                canonicalName,

              })
            ),

        })

      // ======================================================
      // STEP 7: REPORT SUCCESS
      // ======================================================

      if (result.ok) {

        const savedMessage =

          'Modified PDF saved successfully.\n\n' +

          `File: ${result.outputPath}\n` +

          `Fields renamed: ${result.renamedFieldCount}\n` +

          `Pages preserved: ${result.pageCount}`

        // A successful PDF save is reported immediately.
        //
        // Supabase is a separate optional operation.

        setCurrentSaveMessage(savedMessage)

        // ====================================================
        // VERIFY PYTHON'S APPLIED RENAMES
        // ====================================================
        //
        // Only learn aliases when the Python processor
        // confirms that it applied the approved changes.
        //
        // ====================================================

        const confirmedRenamesMatch =

          result.appliedRenames.length ===
            plan.renames.length &&

          plan.renames.every(
            (planned) =>

              result.appliedRenames.some(
                (applied) =>

                  applied.originalName ===
                    planned.originalName &&

                  applied.canonicalName ===
                    planned.canonicalName

              )
          )

        // ====================================================
        // SKIP UNSAFE ALIAS LEARNING
        // ====================================================

        if (
          learnAliasesOnSave &&
          !confirmedRenamesMatch
        ) {

          setCurrentSaveMessage(
            savedMessage +
            '\n\nAlias learning was skipped for safety.'
          )

          if (
            saveSession === documentSessionRef.current
          ) {

            setSaveWarning(
              'The PDF saved, but Python reported a different ' +
              'set of applied renames than the approved plan. ' +
              'No global aliases were learned.'
            )

          }

        }

        // ====================================================
        // LEARN ELIGIBLE ALIASES
        // ====================================================

        else if (
          learnAliasesOnSave &&
          saveSession === documentSessionRef.current
        ) {

          setIsLearningAliases(true)

          setCurrentSaveMessage(
            savedMessage +
            '\n\nLearning eligible aliases...'
          )

          try {

            const learning =
              await learnAliasesFromSavedPdf({

                renames:
                  plan.renames,

                dictionaryKeys:
                  catalog.dictionaryKeys,

                inspection,

              })

            setCurrentSaveMessage(

              savedMessage +

              '\n\n' +

              `Global aliases: ${learning.created} learned, ` +

              `${learning.alreadyKnown} already known, ` +

              `${learning.skipped} skipped, ` +

              `${learning.conflicts} conflicts, ` +

              `${learning.failed} failed.`

            )

            if (
              learning.warnings.length &&
              saveSession === documentSessionRef.current
            ) {

              setSaveWarning(
                'The PDF was saved, but some aliases ' +
                'need attention:\n\n' +
                learning.warnings.join('\n')
              )

            }

          } catch (learningError) {

            // The PDF remains saved even if the
            // database operation fails.

            if (
              saveSession === documentSessionRef.current
            ) {

              setSaveWarning(
                'The PDF was saved, but alias learning ' +
                'could not finish: ' +
                (
                  learningError instanceof Error
                    ? learningError.message
                    : 'Unknown database error.'
                )
              )

              setCurrentSaveMessage(savedMessage)

            }

          } finally {

            setIsLearningAliases(false)

          }

        }

        // ====================================================
        // ALIAS LEARNING DISABLED
        // ====================================================

        else if (!learnAliasesOnSave) {

          setCurrentSaveMessage(
            savedMessage +
            '\n\nGlobal alias learning was disabled.'
          )

        }

        // Do not clear draft mappings after saving.
        //
        // The user may want to continue reviewing
        // or modifying the current document.

      }

      // ======================================================
      // HANDLE SAVE CANCELLATION
      // ======================================================

      else if (result.cancelled) {

        setCurrentSaveMessage(
          'PDF saving was cancelled. ' +
          'Your draft mappings were preserved.'
        )

      }

      // ======================================================
      // HANDLE PDF PROCESSING ERROR
      // ======================================================

      else {

        throw new Error(
          result.error ||
          'Unable to save the modified PDF.'
        )

      }

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save the modified PDF.'

      console.error(
        '[PDF Editor] Save failed:',
        error
      )

      setCurrentSaveError(message)

    } finally {

      savingRef.current = false

      setIsSaving(false)

      setIsLearningAliases(false)

    }

  }

  // ==========================================================
  // SAVE BUTTON AVAILABILITY
  // ==========================================================

  const canSavePdf =

    sourceFile !== null &&

    viewerInfo.inspection !== null &&

    !viewerInfo.isOpening &&

    !viewerInfo.isInspecting &&

    draftMappingCount > 0 &&

    !isSaving

  // ==========================================================
  // RENDER EDITOR
  // ==========================================================

  return (

    <div className="flex min-h-full w-full flex-col gap-4 p-5 lg:p-6">

      {/* =====================================================
          EDITOR HEADER
          ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="min-w-0">

          <h2 className="text-lg font-bold text-slate-800">
            PDF Document Editor
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Review document fields, prepare mappings,
            and save modified PDFs.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate('/dictionary')
            }
          >
            View Dictionary
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              navigate('/upload')
            }
          >
            Go to Upload &amp; Process
          </Button>

          {/* =================================================
              SAVE PDF BUTTON
              ================================================= */}

          <Button

            variant="secondary"

            size="sm"

            disabled={!canSavePdf}

            onClick={() => {
              void handleSavePdf()
            }}

            title={
              !sourceFile
                ? 'Open a PDF to enable saving.'
                : !viewerInfo.inspection
                  ? 'Analyze the PDF before saving.'
                  : draftMappingCount === 0
                    ? 'Assign at least one dictionary mapping.'
                    : 'Save a modified copy of this PDF.'
            }

          >

            {isLearningAliases

              ? 'Learning Aliases...'

              : isSaving

                ? 'Saving PDF...'

                : 'Save PDF'}

          </Button>

        </div>

      </div>

      {/* =====================================================
          GLOBAL ALIAS LEARNING OPTION
          ===================================================== */}

      <label className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">

        <input
          type="checkbox"
          checked={learnAliasesOnSave}
          disabled={isSaving}
          onChange={(event) =>
            setLearnAliasesOnSave(
              event.target.checked
            )
          }
          className="h-4 w-4 accent-blue-600"
        />

        Remember eligible descriptive field names
        as global aliases after a successful save

      </label>

      {/* =====================================================
          LOCAL DRAFT RECOVERY
          =====================================================
          
          Shows whether mappings are being saved locally.
          
          No PDF document bytes are stored.
          
          ===================================================== */}

      {sourceFile && (

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">

          <div className="min-w-0">

            <p className="text-xs font-semibold text-slate-700">
              Local Draft Recovery
            </p>

            <p
              className="mt-1 text-xs text-slate-600"
              role="status"
            >

              {draftStorageState === 'identifying'

                ? draftIdentity
                  ? 'Analyze interactive fields to restore saved mappings.'
                  : 'Identifying PDF for local draft recovery...'

                : draftStorageState === 'unavailable'

                  ? draftRecoveryNote

                  : draftStorageState === 'ready'

                    ? draftRecoveryNote

                    : 'Open and analyze a PDF to enable local draft recovery.'}

            </p>

            {draftStorageState === 'ready' && (

              <p className="mt-1 text-[11px] text-slate-500">

                Mapping changes autosave locally.
                Reopen this same PDF and analyze its
                fields to restore them.

              </p>

            )}

          </div>

          {/* =================================================
              DISCARD LOCAL DRAFT
              ================================================= */}

          <button

            type="button"

            disabled={
              draftStorageState !== 'ready' ||
              draftMappingCount === 0
            }

            onClick={handleDiscardLocalDraft}

            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"

          >

            Discard Local Draft

          </button>

        </div>

      )}

      {/* =====================================================
          PDF SAVE ERRORS
          ===================================================== */}

      {saveError && (

        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >

          <p className="text-sm font-semibold text-red-800">
            Unable to Save PDF
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-red-700">
            {saveError}
          </p>

        </div>

      )}

      {/* =====================================================
          PDF SAVE STATUS
          ===================================================== */}

      {saveMessage && (

        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4"
        >

          <p className="text-sm font-semibold text-green-800">
            PDF Save Status
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-green-700">
            {saveMessage}
          </p>

        </div>

      )}

      {/* =====================================================
          ALIAS LEARNING WARNINGS
          ===================================================== */}

      {saveWarning && (

        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >

          <p className="text-sm font-semibold text-amber-900">
            Alias Learning Notice
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-amber-800">
            {saveWarning}
          </p>

        </div>

      )}

      {/* =====================================================
          MAIN EDITOR WORKSPACE
          ===================================================== */}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* ===================================================
            LEFT COLUMN: PDF VIEWER
            =================================================== */}

        <section
          aria-label="PDF document viewer"
          className="min-w-0"
        >

          <PdfPageViewer

            selectedField={selectedField}

            onSelectField={setSelectedField}

            onClearDraftMappings={clearDraftMappings}

            onViewerInfoChange={
              handleViewerInfoChange
            }

            onSourceFileChange={
              handleSourceFileChange
            }

          />

        </section>

        {/* ===================================================
            RIGHT COLUMN: FIELD INSPECTOR
            =================================================== */}

        <aside
          aria-label="PDF field editing panels"
          className="flex min-w-0 flex-col gap-4"
        >

          {/* =================================================
              FIELD INSPECTOR
              ================================================= */}

          <Card
            padding="none"
            className="overflow-hidden"
          >

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center justify-between gap-3">

                <h2 className="text-sm font-semibold text-slate-800">
                  Field Inspector
                </h2>

                <Badge
                  variant={
                    activeField
                      ? 'info'
                      : 'neutral'
                  }
                  size="sm"
                >

                  {activeField
                    ? 'Selected'
                    : 'No Selection'}

                </Badge>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                Review the selected PDF field.
              </p>

            </div>

            {/* ===============================================
                NO FIELD SELECTED
                =============================================== */}

            {!activeField ? (

              <div className="px-5 py-8 text-center">

                <p className="text-sm font-semibold text-slate-700">
                  No Field Selected
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Select a field on the PDF or from
                  the Document Fields list.
                </p>

              </div>

            ) : (

              /* =============================================
                  SELECTED FIELD DETAILS
                  ============================================= */

              <div className="space-y-4 px-5 py-4">

                {/* Original Field Name */}

                <div>

                  <p className="text-xs text-slate-500">
                    Original Field Name
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                    {activeField.originalName ||
                      '(unnamed)'}
                  </p>

                </div>

                {/* Field Type */}

                <div>

                  <p className="text-xs text-slate-500">
                    Field Type
                  </p>

                  <p className="mt-1 text-sm capitalize text-slate-800">
                    {activeField.fieldType}
                  </p>

                </div>

                {/* Page and Widget */}

                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <p className="text-xs text-slate-500">
                      Page
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {activeField.pageNumber}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Widget Index
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {activeField.widgetIndex}
                    </p>

                  </div>

                </div>

                {/* Field Position */}

                <div>

                  <p className="text-xs text-slate-500">
                    Position (X, Y)
                  </p>

                  <p className="mt-1 font-mono text-xs text-slate-800">
                    {activeField.x.toFixed(1)}
                    {', '}
                    {activeField.y.toFixed(1)}
                  </p>

                </div>

                {/* Field Dimensions */}

                <div>

                  <p className="text-xs text-slate-500">
                    Dimensions (W × H)
                  </p>

                  <p className="mt-1 font-mono text-xs text-slate-800">
                    {activeField.width.toFixed(1)}
                    {' × '}
                    {activeField.height.toFixed(1)}
                  </p>

                </div>

                {/* Field Properties */}

                {(activeField.readOnly ||
                  activeField.required) && (

                  <div className="flex flex-wrap gap-2">

                    {activeField.readOnly && (

                      <Badge
                        variant="neutral"
                        size="sm"
                      >
                        Read Only
                      </Badge>

                    )}

                    {activeField.required && (

                      <Badge
                        variant="warning"
                        size="sm"
                      >
                        Required
                      </Badge>

                    )}

                  </div>

                )}

                {/* Clear Selection */}

                <button
                  type="button"
                  onClick={() =>
                    setSelectedField(null)
                  }
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Clear Selection
                </button>

              </div>

            )}

          </Card>

          {/* =================================================
              INDIVIDUAL DICTIONARY MAPPING
              ================================================= */}

          {viewerInfo.inspection && (

            <PdfFieldMappingPanel

              selectedField={activeField}

              selectedDictionaryKeyId={
                selectedDictionaryKeyId
              }

              draftMappingCount={
                draftMappingCount
              }

              onChangeMapping={
                updateSelectedMapping
              }

            />

          )}

          {/* =================================================
              DOCUMENT FIELDS LIST
              ================================================= */}

          <Card
            padding="none"
            className="overflow-hidden"
          >

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center justify-between gap-3">

                <h2 className="text-sm font-semibold text-slate-800">
                  Document Fields
                </h2>

                <Badge
                  variant="neutral"
                  size="sm"
                >

                  {viewerInfo.inspection?.totalWidgets ?? 0}
                  {' '}
                  Fields

                </Badge>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                Interactive fields on the current page.
              </p>

            </div>

            {/* No Inspection */}

            {!currentPage ? (

              <div className="px-5 py-8 text-center">

                <p className="text-xs text-slate-500">
                  Analyze a PDF to display its fields.
                </p>

              </div>

            ) : currentPage.fields.length === 0 ? (

              /* No Fields on Current Page */

              <div className="px-5 py-8 text-center">

                <p className="text-xs text-slate-500">
                  No interactive fields on this page.
                </p>

              </div>

            ) : (

              /* =============================================
                  INTERACTIVE FIELD LIST
                  ============================================= */

              <div className="max-h-80 overflow-y-auto">

                {currentPage.fields.map((field) => {

                  const widgetKey =
                    getPdfWidgetKey(field)

                  const isSelected =

                    activeField !== null &&

                    getPdfWidgetKey(activeField) ===
                      widgetKey

                  const isMapped =
                    Boolean(
                      draftMappings[widgetKey]
                    )

                  return (

                    <button

                      key={widgetKey}

                      type="button"

                      onClick={() =>
                        setSelectedField(field)
                      }

                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
                        isSelected
                          ? 'bg-blue-50'
                          : ''
                      }`}

                    >

                      <div className="min-w-0">

                        <p className="truncate font-mono text-xs font-medium text-slate-800">
                          {field.originalName ||
                            '(unnamed)'}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {field.fieldType}
                          {' · '}
                          Widget {field.widgetIndex}
                        </p>

                      </div>

                      {isMapped && (

                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700">
                          Mapped
                        </span>

                      )}

                    </button>

                  )

                })}

              </div>

            )}

          </Card>

          {/* =================================================
              FIELD DISPLAY REFERENCE
              ================================================= */}

          <Card>

            <h2 className="text-sm font-semibold text-slate-800">
              Field Display Reference
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Current field highlighting conventions.
            </p>

            <div className="mt-4 space-y-3">

              <div className="flex items-center gap-2">

                <span className="h-3 w-3 rounded-sm border-2 border-blue-500 bg-blue-400/20" />

                <span className="text-xs text-slate-600">
                  Detected Field
                </span>

              </div>

              <div className="flex items-center gap-2">

                <span className="h-3 w-3 rounded-sm border-2 border-amber-500 bg-amber-300/30" />

                <span className="text-xs text-slate-600">
                  Selected Field
                </span>

              </div>

            </div>

          </Card>

        </aside>

      </div>

      {/* =====================================================
          DOCUMENT-WIDE RECOGNITION REVIEW
          =====================================================
          
          Shares the same draftMappings state as the
          individual mapping panel.
          
          ===================================================== */}

      {viewerInfo.inspection && (

        <PdfDocumentRecognitionReview

          inspection={
            viewerInfo.inspection
          }

          draftMappings={
            draftMappings
          }

          getWidgetKey={
            getPdfWidgetKey
          }

          onChangeMapping={
            updateFieldMapping
          }

        />

      )}

      {/* =====================================================
          DOCUMENT STATUS
          ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">

        <div className="min-w-0">

          <p className="break-all text-xs font-semibold text-blue-800">

            {viewerInfo.fileName ||
              'No PDF document loaded'}

          </p>

          <p className="mt-1 text-xs text-blue-700">

            {viewerInfo.inspection

              ? `${viewerInfo.inspection.totalWidgets} interactive widgets detected`

              : viewerInfo.isOpening

                ? 'Opening PDF...'

                : viewerInfo.isInspecting

                  ? 'Analyzing PDF fields...'

                  : 'PDF inspection not yet completed'}

          </p>

        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">

          {draftMappingCount} Draft Mappings

        </span>

      </div>

    </div>

  )

}

export default EditorPage