import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import clsx from 'clsx'

import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'

import {
  DictionaryFieldForm,
  type DictionaryFieldFormValues,
} from '../components/dictionary/DictionaryFieldForm'

import {
  getDictionaryKeys,
  getDictionaryCategoryLabel,
  type DictionaryKey,
  type DictionaryCategory,
} from '../lib/supabase/dictionary'

import {
  createDictionaryKey,
  updateDictionaryKey,
  setDictionaryKeyActive,
} from '../lib/supabase/dictionaryMutations'

import {
  LearnedAliasesPanel,
} from '../components/dictionary/LearnedAliasesPanel'

// ============================================================
// PDF FIELD MAPPER
// Dictionary Manager
// ============================================================
//
// CURRENT FUNCTIONALITY:
//
// - Read approved dictionary records from Supabase.
// - Search and filter dictionary records.
// - Select and inspect fields.
// - Create canonical dictionary keys.
// - Update dictionary metadata.
// - Deactivate and reactivate keys.
// - Refresh records from the database.
//
// IMPORTANT:
//
// Existing canonical key names remain read-only.
//
// Deactivation does not delete related aliases,
// page templates, or mapping confirmation history.
//
// All database modifications are performed through
// dictionaryMutations.ts and protected by Supabase RLS.
//
// ============================================================


// ============================================================
// TYPES
// ============================================================

type DictionaryTab =
  | 'fields'
  | 'aliases'
  | 'templates'

type CategoryFilter =
  | 'ALL'
  | DictionaryCategory

type EditorMode =
  | 'view'
  | 'create'
  | 'edit'


// ============================================================
// CONFIGURATION
// ============================================================

const dictionaryTabs: {
  id: DictionaryTab
  label: string
}[] = [
  {
    id: 'fields',
    label: 'Expected Fields',
  },
  {
    id: 'aliases',
    label: 'Learned Aliases',
  },
  {
    id: 'templates',
    label: 'Page Templates',
  },
]

const categoryOptions: {
  id: CategoryFilter
  label: string
}[] = [
  {
    id: 'ALL',
    label: 'All Fields',
  },
  {
    id: 'CUSTOMER',
    label: 'Customer',
  },
  {
    id: 'COMPANY',
    label: 'Company',
  },
  {
    id: 'JOB_PROPERTY',
    label: 'Job / Property',
  },
  {
    id: 'GENERIC',
    label: 'Generic',
  },
]


// ============================================================
// CATEGORY BADGE
// ============================================================

function CategoryBadge({
  category,
}: {
  category: DictionaryCategory
}) {
  const variant =
    category === 'CUSTOMER'
      ? 'customer'
      : category === 'COMPANY'
        ? 'company'
        : category === 'JOB_PROPERTY'
          ? 'job'
          : 'generic'

  return (
    <Badge variant={variant} size="sm">
      {getDictionaryCategoryLabel(category)}
    </Badge>
  )
}


// ============================================================
// STATUS BADGES
// ============================================================

function ActiveStatusBadge({
  active,
}: {
  active: boolean
}) {
  return (
    <Badge
      variant={active ? 'success' : 'neutral'}
      size="sm"
      showDot
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}

function WebsiteStatusBadge({
  supported,
}: {
  supported: boolean | null
}) {
  if (supported === null) {
    return (
      <Badge variant="neutral" size="sm">
        Unverified
      </Badge>
    )
  }

  return (
    <Badge
      variant={supported ? 'success' : 'warning'}
      size="sm"
    >
      {supported ? 'Supported' : 'Unsupported'}
    </Badge>
  )
}


// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  title: string
  description: string
}

function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-9 text-center">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>

      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>

    </div>
  )
}


// ============================================================
// MAIN PAGE
// ============================================================

export function DictionaryPage() {

  // ----------------------------------------------------------
  // Database State
  // ----------------------------------------------------------

  const [dictionaryKeys, setDictionaryKeys] =
    useState<DictionaryKey[]>([])

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

  const [activeTab, setActiveTab] =
    useState<DictionaryTab>('fields')

  const [searchQuery, setSearchQuery] =
    useState('')

  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('ALL')

  const [includeInactive, setIncludeInactive] =
    useState(true)

  const [selectedFieldId, setSelectedFieldId] =
    useState<string | null>(null)

  const [editorMode, setEditorMode] =
    useState<EditorMode>('view')

  const [confirmStatusChange, setConfirmStatusChange] =
    useState(false)


  // ==========================================================
  // LOAD DATABASE RECORDS
  // ==========================================================

  useEffect(() => {
    let isCurrentRequest = true

    async function loadDictionary() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const records = await getDictionaryKeys({
          includeInactive: true,
        })

        if (!isCurrentRequest) {
          return
        }

        setDictionaryKeys(records)

        // Preserve the current selection when possible.
        setSelectedFieldId((current) => {
          if (
            current &&
            records.some((record) => record.id === current)
          ) {
            return current
          }

          return records[0]?.id ?? null
        })

      } catch (error) {
        if (!isCurrentRequest) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load dictionary records.'
        )

      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    void loadDictionary()

    return () => {
      isCurrentRequest = false
    }
  }, [refreshCount])


  // ==========================================================
  // REFRESH
  // ==========================================================

  function refreshDictionary() {
    if (isSaving) {
      return
    }

    setRefreshCount((current) => current + 1)
  }


  // ==========================================================
  // FILTER RECORDS
  // ==========================================================

  const filteredKeys = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()

    return dictionaryKeys.filter((field) => {

      if (!includeInactive && !field.is_active) {
        return false
      }

      if (
        categoryFilter !== 'ALL' &&
        field.category !== categoryFilter
      ) {
        return false
      }

      if (search) {
        const values = [
          field.key_name,
          field.display_name,
          field.description ?? '',
        ]

        if (
          !values.some((value) =>
            value.toLowerCase().includes(search)
          )
        ) {
          return false
        }
      }

      return true
    })
  }, [
    dictionaryKeys,
    searchQuery,
    categoryFilter,
    includeInactive,
  ])


  // ==========================================================
  // SELECTED FIELD
  // ==========================================================

  const selectedField = useMemo(() => {
    return (
      filteredKeys.find(
        (field) => field.id === selectedFieldId
      ) ??
      filteredKeys[0] ??
      null
    )
  }, [filteredKeys, selectedFieldId])


  // ==========================================================
  // CATEGORY COUNTS
  // ==========================================================

  const categoryCounts = useMemo(() => {

    const records = includeInactive
      ? dictionaryKeys
      : dictionaryKeys.filter(
          (field) => field.is_active
        )

    return {
      ALL: records.length,

      CUSTOMER: records.filter(
        (field) => field.category === 'CUSTOMER'
      ).length,

      COMPANY: records.filter(
        (field) => field.category === 'COMPANY'
      ).length,

      JOB_PROPERTY: records.filter(
        (field) => field.category === 'JOB_PROPERTY'
      ).length,

      GENERIC: records.filter(
        (field) => field.category === 'GENERIC'
      ).length,
    }

  }, [dictionaryKeys, includeInactive])


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalFields = dictionaryKeys.length

  const activeFields = dictionaryKeys.filter(
    (field) => field.is_active
  ).length

  const inactiveFields = totalFields - activeFields


  // ==========================================================
  // EDITOR ACTIONS
  // ==========================================================

  function startCreating() {
    setEditorMode('create')
    setActionError('')
    setSuccessMessage('')
    setConfirmStatusChange(false)
  }

  function startEditing() {
    if (!selectedField) {
      return
    }

    setSelectedFieldId(selectedField.id)
    setEditorMode('edit')
    setActionError('')
    setSuccessMessage('')
    setConfirmStatusChange(false)
  }

  function cancelEditing() {
    if (isSaving) {
      return
    }

    setEditorMode('view')
    setActionError('')
    setConfirmStatusChange(false)
  }

  function selectField(id: string) {
    if (isSaving) {
      return
    }

    setSelectedFieldId(id)
    setEditorMode('view')
    setActionError('')
    setConfirmStatusChange(false)
  }


  // ==========================================================
  // CREATE / UPDATE
  // ==========================================================

  /**
   * Save a newly created or edited dictionary record.
   *
   * Actual database operations are handled by our
   * centralized mutation service.
   *
   * On success, refresh the dictionary and select
   * the saved record.
   */
  async function handleSave(
    values: DictionaryFieldFormValues
  ): Promise<void> {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    setActionError('')
    setSuccessMessage('')

    try {
      let savedField: DictionaryKey

      if (editorMode === 'create') {

        savedField = await createDictionaryKey({
          keyName: values.keyName,
          displayName: values.displayName,
          category: values.category,
          description: values.description,
        })

      } else if (editorMode === 'edit' && selectedField) {

        savedField = await updateDictionaryKey(
          selectedField.id,
          {
            displayName: values.displayName,
            category: values.category,
            description: values.description,
            websiteSupported:
              values.websiteSupported,
          }
        )

      } else {
        throw new Error(
          'No dictionary field is available to save.'
        )
      }

      // Show the saved record after refreshing.
      setSelectedFieldId(savedField.id)

      // Clear filters that could hide the saved record.
      setSearchQuery('')
      setCategoryFilter('ALL')
      setIncludeInactive(true)

      setEditorMode('view')
      setConfirmStatusChange(false)

      setSuccessMessage(
        editorMode === 'create'
          ? `Dictionary key "${savedField.key_name}" created successfully.`
          : `Dictionary key "${savedField.key_name}" updated successfully.`
      )

      setRefreshCount((current) => current + 1)

    } catch (error) {

      setActionError(
        error instanceof Error
          ? error.message
          : 'Unable to save the dictionary field.'
      )

    } finally {
      setIsSaving(false)
    }
  }


  // ==========================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================

  /**
   * Change the active status of the selected key.
   *
   * Deactivation requires explicit confirmation.
   *
   * Existing database relationships are preserved.
   */
  async function handleStatusChange() {
    if (!selectedField || isSaving) {
      return
    }

    setIsSaving(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const newStatus = !selectedField.is_active

      const updatedField = await setDictionaryKeyActive(
        selectedField.id,
        newStatus
      )

      setSelectedFieldId(updatedField.id)

      // Keep inactive records visible after changes.
      setIncludeInactive(true)
      setSearchQuery('')
      setCategoryFilter('ALL')

      setConfirmStatusChange(false)

      setSuccessMessage(
        newStatus
          ? `Dictionary key "${updatedField.key_name}" reactivated.`
          : `Dictionary key "${updatedField.key_name}" deactivated.`
      )

      setRefreshCount((current) => current + 1)

    } catch (error) {

      setActionError(
        error instanceof Error
          ? error.message
          : 'Unable to update dictionary status.'
      )

    } finally {
      setIsSaving(false)
    }
  }


  // ==========================================================
  // PAGE MARKUP
  // ==========================================================

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 px-6 py-7 lg:px-8">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h2 className="text-xl font-bold text-slate-800">
            Dictionary Manager
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage expected fields, learned aliases,
            and recognized page templates.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <Badge
            variant={
              errorMessage
                ? 'warning'
                : isLoading
                  ? 'info'
                  : 'success'
            }
            showDot
          >
            {errorMessage
              ? 'Connection Error'
              : isLoading
                ? 'Loading Dictionary'
                : 'Supabase Connected'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshDictionary}
            disabled={isLoading || isSaving}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>

        </div>

      </div>


      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <Card>
          <p className="text-xs font-medium text-slate-500">
            Total Dictionary Keys
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {isLoading || errorMessage
              ? '—'
              : totalFields}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-500">
            Active Keys
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {isLoading || errorMessage
              ? '—'
              : activeFields}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-500">
            Inactive Keys
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-600">
            {isLoading || errorMessage
              ? '—'
              : inactiveFields}
          </p>
        </Card>

      </div>


      {/* =====================================================
          MAIN WORKSPACE
          ===================================================== */}

      <Card padding="none" className="overflow-hidden">

        {/* ===================================================
            TABS
            =================================================== */}

        <nav
          aria-label="Dictionary sections"
          className="flex flex-wrap gap-1 border-b border-slate-200 px-5 pt-4"
        >

          {dictionaryTabs.map((tab) => (

            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (isSaving) {
                  return
                }

                setActiveTab(tab.id)
                setEditorMode('view')
                setActionError('')
                setConfirmStatusChange(false)
              }}
              disabled={isSaving}
              aria-current={
                activeTab === tab.id
                  ? 'page'
                  : undefined
              }
              className={clsx(
                'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              {tab.label}
            </button>

          ))}

        </nav>


        {/* ===================================================
            EXPECTED FIELDS
            =================================================== */}

        {activeTab === 'fields' && (

          <div className="p-5">

            {/* ===============================================
                SEARCH AND ACTIONS
                =============================================== */}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                disabled={isSaving}
                placeholder="Search dictionary fields..."
                aria-label="Search dictionary fields"
                className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <Button
                onClick={startCreating}
                disabled={isLoading || isSaving || !!errorMessage}
              >
                + Add Field
              </Button>

            </div>


            {/* ===============================================
                DATABASE ERROR
                =============================================== */}

            {errorMessage && (

              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4"
              >

                <p className="text-sm font-semibold text-red-700">
                  Unable to Load Dictionary
                </p>

                <p className="mt-2 text-xs text-red-600">
                  {errorMessage}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={refreshDictionary}
                >
                  Try Again
                </Button>

              </div>

            )}


            {/* ===============================================
                SUCCESS MESSAGE
                =============================================== */}

            {successMessage && (

              <div
                role="status"
                className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
              >
                {successMessage}
              </div>

            )}


            {/* ===============================================
                ACTION ERROR
                =============================================== */}

            {actionError && (

              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {actionError}
              </div>

            )}


            {/* ===============================================
                CONTENT GRID
                =============================================== */}

            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[190px_minmax(0,1fr)_330px]">

              {/* =============================================
                  CATEGORY FILTERS
                  ============================================= */}

              <aside className="min-w-0">

                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Categories
                </h3>

                <div className="space-y-1">

                  {categoryOptions.map((category) => (

                    <button
                      key={category.id}
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setCategoryFilter(category.id)
                        setEditorMode('view')
                        setConfirmStatusChange(false)
                      }}
                      className={clsx(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        categoryFilter === category.id
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >

                      <span>
                        {category.label}
                      </span>

                      <span className="text-xs text-slate-400">
                        {categoryCounts[category.id]}
                      </span>

                    </button>

                  ))}

                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">

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

                    Show inactive fields

                  </label>

                </div>

              </aside>


              {/* =============================================
                  FIELD BROWSER
                  ============================================= */}

              <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200">

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">

                  <div>

                    <h3 className="text-sm font-semibold text-slate-800">
                      Dictionary Fields
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {isLoading
                        ? 'Loading records...'
                        : `${filteredKeys.length} matching fields`}
                    </p>

                  </div>

                  <Badge variant="info" size="sm">
                    Database Managed
                  </Badge>

                </div>

                {isLoading ? (

                  <div
                    role="status"
                    className="flex min-h-64 items-center justify-center p-8 text-sm text-slate-500"
                  >
                    Loading dictionary from Supabase...
                  </div>

                ) : errorMessage ? (

                  <EmptyState
                    title="Dictionary Unavailable"
                    description="Unable to retrieve the records. Please try refreshing."
                  />

                ) : filteredKeys.length === 0 ? (

                  <EmptyState
                    title="No Matching Fields"
                    description="Try changing the search text or category filters."
                  />

                ) : (

                  <div className="max-h-[620px] overflow-auto">

                    <table className="w-full min-w-[460px] text-left">

                      <thead className="sticky top-0 z-10 bg-slate-50">

                        <tr className="border-b border-slate-200">

                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Key
                          </th>

                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Category
                          </th>

                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {filteredKeys.map((field) => (

                          <tr
                            key={field.id}
                            className={clsx(
                              'border-b border-slate-100 last:border-0',
                              selectedField?.id === field.id
                                ? 'bg-blue-50'
                                : 'hover:bg-slate-50'
                            )}
                          >

                            <td className="px-4 py-3">

                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() =>
                                  selectField(field.id)
                                }
                                className="w-full text-left"
                                aria-pressed={
                                  selectedField?.id === field.id
                                }
                              >

                                <span className="block break-all font-mono text-xs font-semibold text-slate-700">
                                  {field.key_name}
                                </span>

                                <span className="mt-1 block text-xs text-slate-500">
                                  {field.display_name}
                                </span>

                              </button>

                            </td>

                            <td className="px-4 py-3">
                              <CategoryBadge category={field.category} />
                            </td>

                            <td className="px-4 py-3">
                              <ActiveStatusBadge active={field.is_active} />
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">

                  <p className="text-xs text-slate-500">
                    Showing {filteredKeys.length} of {totalFields} dictionary keys
                  </p>

                </div>

              </section>


              {/* =============================================
                  FIELD DETAILS / EDITOR
                  ============================================= */}

              <div className="min-w-0">

                <Card>

                  {editorMode === 'create' ||
                  (editorMode === 'edit' && selectedField) ? (

                    <DictionaryFieldForm
                      key={
                        editorMode === 'create'
                          ? 'create'
                          : selectedField?.id
                      }
                      mode={
                        editorMode === 'create'
                          ? 'create'
                          : 'edit'
                      }
                      field={
                        editorMode === 'edit'
                          ? selectedField ?? undefined
                          : undefined
                      }
                      busy={isSaving}
                      onCancel={cancelEditing}
                      onSubmit={handleSave}
                    />

                  ) : selectedField && !errorMessage ? (

                    <div>

                      {/* =====================================
                          DETAILS HEADER
                          ===================================== */}

                      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <h2 className="text-base font-semibold text-slate-800">
                            Field Details
                          </h2>

                          <p className="mt-1 text-xs text-slate-500">
                            Selected dictionary record.
                          </p>

                        </div>

                        <ActiveStatusBadge
                          active={selectedField.is_active}
                        />

                      </div>

                      {/* =====================================
                          FIELD INFORMATION
                          ===================================== */}

                      <div className="space-y-5">

                        <div>

                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Canonical Key
                          </p>

                          <p className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700">
                            {selectedField.key_name}
                          </p>

                        </div>

                        <div>

                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Display Name
                          </p>

                          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                            {selectedField.display_name}
                          </p>

                        </div>

                        <div>

                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Category
                          </p>

                          <CategoryBadge
                            category={selectedField.category}
                          />

                        </div>

                        <div>

                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Description
                          </p>

                          <p className="min-h-20 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
                            {selectedField.description ||
                              'No description available.'}
                          </p>

                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

                          <span className="text-xs font-semibold text-slate-600">
                            Website Support
                          </span>

                          <WebsiteStatusBadge
                            supported={
                              selectedField.website_supported
                            }
                          />

                        </div>

                        {/* ===================================
                            EDIT ACTION
                            =================================== */}

                        <div className="border-t border-slate-100 pt-4">

                          <Button
                            fullWidth
                            variant="outline"
                            onClick={startEditing}
                            disabled={isSaving}
                          >
                            Edit Field
                          </Button>

                        </div>

                        {/* ===================================
                            ACTIVE STATUS ACTION
                            =================================== */}

                        <div className="border-t border-slate-100 pt-4">

                          <p className="mb-3 text-xs font-semibold text-slate-600">
                            Dictionary Status
                          </p>

                          {!confirmStatusChange ? (

                            <Button
                              fullWidth
                              variant={
                                selectedField.is_active
                                  ? 'danger'
                                  : 'secondary'
                              }
                              disabled={isSaving}
                              onClick={() =>
                                setConfirmStatusChange(true)
                              }
                            >
                              {selectedField.is_active
                                ? 'Deactivate Field'
                                : 'Reactivate Field'}
                            </Button>

                          ) : (

                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

                              <p className="text-xs font-semibold text-amber-800">
                                Confirm Status Change
                              </p>

                              <p className="mt-2 text-xs leading-relaxed text-amber-700">
                                {selectedField.is_active
                                  ? 'Deactivate this field? It will no longer be available for new mappings, but its existing relationships will be preserved.'
                                  : 'Reactivate this field? It will become available for new mappings again.'}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-2">

                                <Button
                                  size="sm"
                                  variant="outline"
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
                                    selectedField.is_active
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

                      <h2 className="text-base font-semibold text-slate-800">
                        Field Details
                      </h2>

                      <EmptyState
                        title="No Field Selected"
                        description="Select a dictionary field to view its information."
                      />

                    </div>

                  )}

                </Card>

              </div>

            </div>

          </div>

        )}


        {/* ===================================================
            LEARNED ALIASES
            =================================================== */}

        {activeTab === 'aliases' && (

          <div className="p-5">

            <LearnedAliasesPanel
              dictionaryKeys={dictionaryKeys}
            />

          </div>
  
        )}
  
        {/* ===================================================
            PAGE TEMPLATES
            =================================================== */}

        {activeTab === 'templates' && (

          <div className="p-5">

            <div className="mb-5 flex items-center justify-between gap-4">

              <div>

                <h2 className="text-base font-semibold text-slate-800">
                  Page Templates
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Recognized PDF page layouts and saved mappings.
                </p>

              </div>

              <Button disabled>
                + Add Template
              </Button>

            </div>

            <div className="rounded-xl border border-slate-200">

              <EmptyState
                title="Page Template Integration Pending"
                description="Page templates will appear here once PDF page recognition and template storage are connected."
              />

            </div>

          </div>

        )}

      </Card>

    </div>
  )
}

export default DictionaryPage