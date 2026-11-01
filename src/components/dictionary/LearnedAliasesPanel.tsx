import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
  } from 'react'
  
  import clsx from 'clsx'
  
  import { Button } from '../common/Button'
  import { Badge } from '../common/Badge'
  
  import type {
    DictionaryKey,
  } from '../../lib/supabase/dictionary'
  
  import {
    getFieldAliases,
    createFieldAlias,
    updateFieldAlias,
    setFieldAliasActive,
    type FieldAlias,
  } from '../../lib/supabase/aliases'
  
  // ============================================================
  // PDF FIELD MAPPER
  // Learned Aliases Panel
  // ============================================================
  //
  // PURPOSE:
  //
  // - Display global aliases from Supabase.
  // - Search existing aliases.
  // - Create manually approved aliases.
  // - Edit alias names, targets, and notes.
  // - Deactivate and reactivate aliases.
  //
  // IMPORTANT:
  //
  // Generic field names are rejected by aliases.ts.
  //
  // Global aliases should only represent mappings that
  // are safe across different PDF documents.
  //
  // Page-specific field mappings will be handled by
  // the future page-template system.
  //
  // ============================================================
  
  // ============================================================
  // TYPES
  // ============================================================
  
  interface LearnedAliasesPanelProps {
    dictionaryKeys: DictionaryKey[]
  }
  
  type AliasEditorMode =
    | 'view'
    | 'create'
    | 'edit'
  
  interface AliasFormValues {
    originalName: string
    dictionaryKeyId: string
    notes: string
  }
  
  // ============================================================
  // STYLES
  // ============================================================
  
  const inputClassName =
    'w-full rounded-lg border border-slate-200 bg-white ' +
    'px-3 py-2.5 text-sm text-slate-700 outline-none ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
    'disabled:cursor-not-allowed disabled:bg-slate-100'
  
  const labelClassName =
    'mb-2 block text-xs font-semibold text-slate-600'
  
  // ============================================================
  // MAIN COMPONENT
  // ============================================================
  
  export function LearnedAliasesPanel({
    dictionaryKeys,
  }: LearnedAliasesPanelProps) {
  
    // ----------------------------------------------------------
    // Database State
    // ----------------------------------------------------------
  
    const [aliases, setAliases] =
      useState<FieldAlias[]>([])
  
    const [isLoading, setIsLoading] =
      useState(true)
  
    const [isSaving, setIsSaving] =
      useState(false)
  
    const [errorMessage, setErrorMessage] =
      useState('')
  
    const [actionError, setActionError] =
      useState('')
  
    const [successMessage, setSuccessMessage] =
      useState('')
  
    const [refreshCount, setRefreshCount] =
      useState(0)
  
    // ----------------------------------------------------------
    // Interface State
    // ----------------------------------------------------------
  
    const [searchQuery, setSearchQuery] =
      useState('')
  
    const [includeInactive, setIncludeInactive] =
      useState(true)
  
    const [selectedAliasId, setSelectedAliasId] =
      useState<string | null>(null)
  
    const [editorMode, setEditorMode] =
      useState<AliasEditorMode>('view')
  
    const [confirmStatusChange, setConfirmStatusChange] =
      useState(false)
  
    const [formValues, setFormValues] =
      useState<AliasFormValues>({
        originalName: '',
        dictionaryKeyId: '',
        notes: '',
      })
  
    // ==========================================================
    // DICTIONARY LOOKUP
    // ==========================================================
  
    /**
     * The dictionary has already been retrieved by
     * DictionaryPage.tsx.
     *
     * Reuse those records rather than performing another
     * database request for each alias.
     */
    const dictionaryLookup = useMemo(() => {
      return new Map(
        dictionaryKeys.map((key) => [
          key.id,
          key,
        ])
      )
    }, [dictionaryKeys])
  
    const activeDictionaryKeys = useMemo(() => {
      return dictionaryKeys
        .filter((key) => key.is_active)
        .sort((a, b) =>
          a.key_name.localeCompare(b.key_name)
        )
    }, [dictionaryKeys])
  
    // ==========================================================
    // LOAD ALIASES
    // ==========================================================
  
    useEffect(() => {
      let isCurrentRequest = true
  
      async function loadAliases() {
        setIsLoading(true)
        setErrorMessage('')
  
        try {
          const records = await getFieldAliases({
            includeInactive: true,
          })
  
          if (!isCurrentRequest) {
            return
          }
  
          setAliases(records)
  
        } catch (error) {
          if (!isCurrentRequest) {
            return
          }
  
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to retrieve global aliases.'
          )
  
        } finally {
          if (isCurrentRequest) {
            setIsLoading(false)
          }
        }
      }
  
      void loadAliases()
  
      return () => {
        isCurrentRequest = false
      }
    }, [refreshCount])
  
    // ==========================================================
    // FILTER ALIASES
    // ==========================================================
  
    const filteredAliases = useMemo(() => {
      const search =
        searchQuery.trim().toLowerCase()
  
      return aliases.filter((alias) => {
  
        if (!includeInactive && !alias.is_active) {
          return false
        }
  
        if (!search) {
          return true
        }
  
        const targetKey =
          dictionaryLookup.get(alias.dictionary_key_id)
  
        return [
          alias.original_name,
          alias.normalized_name,
          alias.notes ?? '',
          targetKey?.key_name ?? '',
          targetKey?.display_name ?? '',
        ].some((value) =>
          value.toLowerCase().includes(search)
        )
  
      })
    }, [
      aliases,
      searchQuery,
      includeInactive,
      dictionaryLookup,
    ])
  
    // ==========================================================
    // SELECTED ALIAS
    // ==========================================================
  
    const selectedAlias = useMemo(() => {
      return (
        filteredAliases.find(
          (alias) => alias.id === selectedAliasId
        ) ??
        filteredAliases[0] ??
        null
      )
    }, [filteredAliases, selectedAliasId])
  
    // ==========================================================
    // SUMMARY
    // ==========================================================
  
    const activeAliasCount =
      aliases.filter((alias) => alias.is_active).length
  
    const inactiveAliasCount =
      aliases.length - activeAliasCount
  
    // ==========================================================
    // HELPERS
    // ==========================================================
  
    function getTargetName(
      dictionaryKeyId: string
    ): string {
      return (
        dictionaryLookup.get(dictionaryKeyId)?.key_name ??
        'Unknown Dictionary Key'
      )
    }
  
    /**
     * Update one alias in local state after a successful
     * database operation.
     *
     * This avoids unnecessarily reloading the entire list
     * after every edit.
     *
     * The Refresh button still retrieves fresh records.
     */
    function applySavedAlias(
      savedAlias: FieldAlias
    ) {
      setAliases((current) => {
        const remaining = current.filter(
          (alias) => alias.id !== savedAlias.id
        )
  
        return [...remaining, savedAlias].sort(
          (a, b) =>
            a.normalized_name.localeCompare(
              b.normalized_name
            )
        )
      })
  
      setSelectedAliasId(savedAlias.id)
    }
  
    function resetMessages() {
      setActionError('')
      setSuccessMessage('')
    }
  
    // ==========================================================
    // CREATE
    // ==========================================================
  
    function startCreating() {
      if (isSaving) {
        return
      }
  
      setEditorMode('create')
      setConfirmStatusChange(false)
  
      resetMessages()
  
      setFormValues({
        originalName: '',
        dictionaryKeyId:
          activeDictionaryKeys[0]?.id ?? '',
        notes: '',
      })
    }
  
    // ==========================================================
    // EDIT
    // ==========================================================
  
    function startEditing() {
      if (!selectedAlias || isSaving) {
        return
      }
  
      setEditorMode('edit')
      setConfirmStatusChange(false)
  
      resetMessages()
  
      setFormValues({
        originalName:
          selectedAlias.original_name,
  
        dictionaryKeyId:
          selectedAlias.dictionary_key_id,
  
        notes:
          selectedAlias.notes ?? '',
      })
    }
  
    // ==========================================================
    // CANCEL
    // ==========================================================
  
    function cancelEditing() {
      if (isSaving) {
        return
      }
  
      setEditorMode('view')
      setConfirmStatusChange(false)
      setActionError('')
    }
  
    // ==========================================================
    // SELECT
    // ==========================================================
  
    function selectAlias(id: string) {
      if (isSaving) {
        return
      }
  
      setSelectedAliasId(id)
      setEditorMode('view')
      setConfirmStatusChange(false)
      resetMessages()
    }
  
    // ==========================================================
    // SAVE
    // ==========================================================
  
    async function handleSave(
      event: FormEvent<HTMLFormElement>
    ) {
      event.preventDefault()
  
      if (isSaving) {
        return
      }
  
      setIsSaving(true)
      resetMessages()
  
      try {
        let savedAlias: FieldAlias
  
        if (editorMode === 'create') {
  
          savedAlias = await createFieldAlias({
            originalName: formValues.originalName,
            dictionaryKeyId:
              formValues.dictionaryKeyId,
            notes: formValues.notes,
          })
  
        } else if (
          editorMode === 'edit' &&
          selectedAlias
        ) {
  
          /**
           * Only submit changed identity/target values.
           *
           * This also allows notes to be updated on an
           * alias whose dictionary target was subsequently
           * deactivated.
           */
          savedAlias = await updateFieldAlias(
            selectedAlias.id,
            {
              originalName:
                formValues.originalName !==
                selectedAlias.original_name
                  ? formValues.originalName
                  : undefined,
  
              dictionaryKeyId:
                formValues.dictionaryKeyId !==
                selectedAlias.dictionary_key_id
                  ? formValues.dictionaryKeyId
                  : undefined,
  
              notes: formValues.notes,
            }
          )
  
        } else {
          throw new Error(
            'No alias is available to save.'
          )
        }
  
        applySavedAlias(savedAlias)
  
        setSearchQuery('')
        setIncludeInactive(true)
        setEditorMode('view')
  
        setSuccessMessage(
          editorMode === 'create'
            ? `Alias "${savedAlias.original_name}" created successfully.`
            : `Alias "${savedAlias.original_name}" updated successfully.`
        )
  
      } catch (error) {
  
        setActionError(
          error instanceof Error
            ? error.message
            : 'Unable to save alias.'
        )
  
      } finally {
        setIsSaving(false)
      }
    }
  
    // ==========================================================
    // ACTIVATE / DEACTIVATE
    // ==========================================================
  
    async function handleStatusChange() {
      if (!selectedAlias || isSaving) {
        return
      }
  
      setIsSaving(true)
      resetMessages()
  
      try {
        const newStatus = !selectedAlias.is_active
  
        const updatedAlias =
          await setFieldAliasActive(
            selectedAlias.id,
            newStatus
          )
  
        applySavedAlias(updatedAlias)
  
        setIncludeInactive(true)
        setSearchQuery('')
        setConfirmStatusChange(false)
  
        setSuccessMessage(
          newStatus
            ? `Alias "${updatedAlias.original_name}" reactivated.`
            : `Alias "${updatedAlias.original_name}" deactivated.`
        )
  
      } catch (error) {
  
        setActionError(
          error instanceof Error
            ? error.message
            : 'Unable to change alias status.'
        )
  
      } finally {
        setIsSaving(false)
      }
    }
  
    // ==========================================================
    // REFRESH
    // ==========================================================
  
    function refreshAliases() {
      if (isSaving) {
        return
      }
  
      setRefreshCount((current) => current + 1)
    }
  
    // ==========================================================
    // RENDER
    // ==========================================================
  
    return (
      <div className="space-y-5">
  
        {/* =====================================================
            HEADER
            ===================================================== */}
  
        <div className="flex flex-wrap items-center justify-between gap-4">
  
          <div>
  
            <h2 className="text-base font-semibold text-slate-800">
              Learned Aliases
            </h2>
  
            <p className="mt-1 text-xs text-slate-500">
              Manage globally recognized alternative PDF field names.
            </p>
  
          </div>
  
          <div className="flex flex-wrap items-center gap-3">
  
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAliases}
              disabled={isLoading || isSaving}
            >
              Refresh
            </Button>
  
            <Button
              size="sm"
              onClick={startCreating}
              disabled={
                isLoading ||
                isSaving ||
                !!errorMessage ||
                activeDictionaryKeys.length === 0
              }
            >
              + Add Alias
            </Button>
  
          </div>
  
        </div>
  
        {/* =====================================================
            SUMMARY
            ===================================================== */}
  
        <div className="flex flex-wrap gap-3">
  
          <Badge variant="info">
            Total: {aliases.length}
          </Badge>
  
          <Badge variant="success" showDot>
            Active: {activeAliasCount}
          </Badge>
  
          <Badge variant="neutral">
            Inactive: {inactiveAliasCount}
          </Badge>
  
        </div>
  
        {/* =====================================================
            MESSAGES
            ===================================================== */}
  
        {errorMessage && (
  
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
  
            <p className="text-sm font-semibold text-red-700">
              Unable to Load Aliases
            </p>
  
            <p className="mt-2 text-xs text-red-600">
              {errorMessage}
            </p>
  
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={refreshAliases}
            >
              Try Again
            </Button>
  
          </div>
  
        )}
  
        {actionError && (
  
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {actionError}
          </div>
  
        )}
  
        {successMessage && (
  
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {successMessage}
          </div>
  
        )}
  
        {/* =====================================================
            SEARCH AND FILTER
            ===================================================== */}
  
        <div className="flex flex-wrap items-center justify-between gap-4">
  
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            disabled={isSaving}
            placeholder="Search aliases or dictionary keys..."
            aria-label="Search learned aliases"
            className={`${inputClassName} max-w-md`}
          />
  
          <label className="flex items-center gap-2 text-xs text-slate-600">
  
            <input
              type="checkbox"
              checked={includeInactive}
              disabled={isSaving}
              onChange={(event) => {
                setIncludeInactive(event.target.checked)
                setEditorMode('view')
                setConfirmStatusChange(false)
              }}
              className="h-4 w-4 accent-blue-600"
            />
  
            Show inactive aliases
  
          </label>
  
        </div>
  
        {/* =====================================================
            CONTENT
            ===================================================== */}
  
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
  
          {/* ===================================================
              ALIAS BROWSER
              =================================================== */}
  
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
  
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
  
              <h3 className="text-sm font-semibold text-slate-800">
                Global Alias Mappings
              </h3>
  
              <p className="mt-1 text-xs text-slate-500">
                {isLoading
                  ? 'Loading aliases...'
                  : `${filteredAliases.length} matching aliases`}
              </p>
  
            </div>
  
            {isLoading ? (
  
              <div
                role="status"
                className="flex min-h-[250px] items-center justify-center p-6 text-sm text-slate-500"
              >
                Loading aliases from Supabase...
              </div>
  
            ) : errorMessage ? (
  
              <div className="p-8 text-center text-sm text-slate-500">
                Aliases could not be retrieved.
              </div>
  
            ) : filteredAliases.length === 0 ? (
  
              <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
  
                <h3 className="text-sm font-semibold text-slate-700">
                  {aliases.length === 0
                    ? 'No Global Aliases Yet'
                    : 'No Matching Aliases'}
                </h3>
  
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                  {aliases.length === 0
                    ? 'Create a manually approved alias to associate an alternative PDF field name with a canonical dictionary key.'
                    : 'Try changing your search text or inactive alias filter.'}
                </p>
  
              </div>
  
            ) : (
  
              <div className="max-h-[620px] overflow-auto">
  
                <table className="w-full min-w-[520px] text-left">
  
                  <thead className="sticky top-0 z-10 bg-slate-50">
  
                    <tr className="border-b border-slate-200">
  
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Original PDF Field
                      </th>
  
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Dictionary Key
                      </th>
  
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Status
                      </th>
  
                    </tr>
  
                  </thead>
  
                  <tbody>
  
                    {filteredAliases.map((alias) => (
  
                      <tr
                        key={alias.id}
                        className={clsx(
                          'border-b border-slate-100 last:border-0',
                          selectedAlias?.id === alias.id
                            ? 'bg-blue-50'
                            : 'hover:bg-slate-50'
                        )}
                      >
  
                        <td className="px-4 py-3">
  
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              selectAlias(alias.id)
                            }
                            className="w-full text-left"
                          >
  
                            <span className="block break-all font-mono text-xs font-semibold text-slate-700">
                              {alias.original_name}
                            </span>
  
                            <span className="mt-1 block break-all text-xs text-slate-400">
                              {alias.normalized_name}
                            </span>
  
                          </button>
  
                        </td>
  
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {getTargetName(alias.dictionary_key_id)}
                        </td>
  
                        <td className="px-4 py-3">
  
                          <Badge
                            variant={
                              alias.is_active
                                ? 'success'
                                : 'neutral'
                            }
                            size="sm"
                            showDot
                          >
                            {alias.is_active
                              ? 'Active'
                              : 'Inactive'}
                          </Badge>
  
                        </td>
  
                      </tr>
  
                    ))}
  
                  </tbody>
  
                </table>
  
              </div>
  
            )}
  
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
  
              <p className="text-xs text-slate-500">
                Showing {filteredAliases.length} of {aliases.length} aliases
              </p>
  
            </div>
  
          </section>
  
          {/* ===================================================
              DETAILS / FORM
              =================================================== */}
  
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
  
            {editorMode === 'create' ||
            (editorMode === 'edit' && selectedAlias) ? (
  
              <div>
  
                <h3 className="text-base font-semibold text-slate-800">
                  {editorMode === 'create'
                    ? 'Add Global Alias'
                    : 'Edit Global Alias'}
                </h3>
  
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Assign an alternative PDF field name to an approved dictionary key.
                </p>
  
                <form
                  onSubmit={(event) => {
                    void handleSave(event)
                  }}
                  className="mt-5 space-y-5"
                >
  
                  {/* Original Field Name */}
  
                  <div>
  
                    <label
                      htmlFor="alias-original-name"
                      className={labelClassName}
                    >
                      Original PDF Field Name
                    </label>
  
                    <input
                      id="alias-original-name"
                      type="text"
                      required
                      maxLength={255}
                      value={formValues.originalName}
                      disabled={isSaving}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          originalName: event.target.value,
                        }))
                      }
                      placeholder="HomeownerFullName"
                      className={`${inputClassName} font-mono`}
                    />
  
                  </div>
  
                  {/* Dictionary Target */}
  
                  <div>
  
                    <label
                      htmlFor="alias-dictionary-key"
                      className={labelClassName}
                    >
                      Canonical Dictionary Key
                    </label>
  
                    <select
                      id="alias-dictionary-key"
                      required
                      value={formValues.dictionaryKeyId}
                      disabled={isSaving}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          dictionaryKeyId: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
  
                      {!activeDictionaryKeys.some(
                        (key) =>
                          key.id === formValues.dictionaryKeyId
                      ) &&
                        formValues.dictionaryKeyId && (
  
                          <option
                            value={formValues.dictionaryKeyId}
                            disabled
                          >
                            {getTargetName(
                              formValues.dictionaryKeyId
                            )} (Inactive)
                          </option>
  
                        )}
  
                      {activeDictionaryKeys.map((key) => (
  
                        <option
                          key={key.id}
                          value={key.id}
                        >
                          {key.key_name}
                        </option>
  
                      ))}
  
                    </select>
  
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Only active dictionary keys are available for new mappings.
                    </p>
  
                  </div>
  
                  {/* Notes */}
  
                  <div>
  
                    <label
                      htmlFor="alias-notes"
                      className={labelClassName}
                    >
                      Notes
                    </label>
  
                    <textarea
                      id="alias-notes"
                      rows={4}
                      value={formValues.notes}
                      disabled={isSaving}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Why is this alias appropriate?"
                      className={`${inputClassName} resize-y`}
                    />
  
                  </div>
  
                  {/* Warning */}
  
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
  
                    <p className="text-xs font-semibold text-amber-800">
                      Global Recognition Warning
                    </p>
  
                    <p className="mt-2 text-xs leading-relaxed text-amber-700">
                      Global aliases may affect multiple documents.
                      Use page templates for generic or ambiguous
                      field names such as Text1 or Field17.
                    </p>
  
                  </div>
  
                  {/* Actions */}
  
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
  
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
  
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving}
                    >
                      {isSaving
                        ? 'Saving...'
                        : editorMode === 'create'
                          ? 'Create Alias'
                          : 'Save Changes'}
                    </Button>
  
                  </div>
  
                </form>
  
              </div>
  
            ) : selectedAlias && !errorMessage ? (
  
              <div>
  
                <h3 className="text-base font-semibold text-slate-800">
                  Alias Details
                </h3>
  
                <div className="mt-5 space-y-5">
  
                  <div>
  
                    <p className={labelClassName}>
                      Original PDF Field
                    </p>
  
                    <p className="break-all rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700">
                      {selectedAlias.original_name}
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className={labelClassName}>
                      Normalized Name
                    </p>
  
                    <p className="break-all rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700">
                      {selectedAlias.normalized_name}
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className={labelClassName}>
                      Maps To
                    </p>
  
                    <p className="break-all rounded-lg bg-blue-50 px-3 py-2.5 font-mono text-sm font-semibold text-blue-700">
                      {getTargetName(
                        selectedAlias.dictionary_key_id
                      )}
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className={labelClassName}>
                      Notes
                    </p>
  
                    <p className="min-h-20 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      {selectedAlias.notes ||
                        'No notes provided.'}
                    </p>
  
                  </div>
  
                  <div className="border-t border-slate-100 pt-4">
  
                    <Button
                      fullWidth
                      variant="outline"
                      disabled={isSaving}
                      onClick={startEditing}
                    >
                      Edit Alias
                    </Button>
  
                  </div>
  
                  <div className="border-t border-slate-100 pt-4">
  
                    {!confirmStatusChange ? (
  
                      <Button
                        fullWidth
                        variant={
                          selectedAlias.is_active
                            ? 'danger'
                            : 'secondary'
                        }
                        disabled={isSaving}
                        onClick={() =>
                          setConfirmStatusChange(true)
                        }
                      >
                        {selectedAlias.is_active
                          ? 'Deactivate Alias'
                          : 'Reactivate Alias'}
                      </Button>
  
                    ) : (
  
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
  
                        <p className="text-xs font-semibold text-amber-800">
                          Confirm Status Change
                        </p>
  
                        <p className="mt-2 text-xs leading-relaxed text-amber-700">
                          {selectedAlias.is_active
                            ? 'Deactivate this alias? It will no longer be considered for new mappings.'
                            : 'Reactivate this alias? It will become available for future recognition.'}
                        </p>
  
                        <div className="mt-4 flex flex-wrap gap-2">
  
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={() =>
                              setConfirmStatusChange(false)
                            }
                          >
                            Cancel
                          </Button>
  
                          <Button
                            size="sm"
                            variant={
                              selectedAlias.is_active
                                ? 'danger'
                                : 'primary'
                            }
                            disabled={isSaving}
                            onClick={() => {
                              void handleStatusChange()
                            }}
                          >
                            {isSaving
                              ? 'Updating...'
                              : 'Confirm'}
                          </Button>
  
                        </div>
  
                      </div>
  
                    )}
  
                  </div>
  
                </div>
  
              </div>
  
            ) : (
  
              <div>
  
                <h3 className="text-base font-semibold text-slate-800">
                  Alias Details
                </h3>
  
                <p className="mt-4 text-sm text-slate-500">
                  Select an alias to view its details,
                  or create a new global alias.
                </p>
  
              </div>
  
            )}
  
          </section>
  
        </div>
  
      </div>
    )
  }
  
  export default LearnedAliasesPanel