import {
    useMemo,
    useState,
    type ReactNode,
  } from 'react'
  
  import clsx from 'clsx'
  
  import { Button } from '../components/common/Button'
  import { Card } from '../components/common/Card'
  import { Badge } from '../components/common/Badge'
  import { Input } from '../components/common/Input'
  import { Toggle } from '../components/common/Toggle'
  
  /* =========================================================
     PDF FIELD MAPPER
     Dictionary Page
     ========================================================= */
  
  /**
   * Dictionary management interface.
   *
   * This page will eventually manage:
   *
   * - Expected dictionary fields
   * - Learned global aliases
   * - Saved page templates
   *
   * INITIAL IMPLEMENTATION:
   *
   * Uses clearly labeled preview entries so that
   * search, filtering, selection, and layout behavior
   * can be tested before Supabase integration.
   *
   * Preview entries are not persisted.
   *
   * IMPORTANT:
   * The complete authoritative allowed-key list must
   * be connected during backend implementation.
   */
  
  /* =========================================================
     Types
     ========================================================= */
  
  type DictionaryTab =
    | 'fields'
    | 'aliases'
    | 'templates'
  
  type FieldCategory =
    | 'customer'
    | 'company'
    | 'job'
    | 'generic'
  
  type CategoryFilter =
    | 'all'
    | FieldCategory
  
  interface ExpectedField {
    key: string
    displayName: string
    category: FieldCategory
    description: string
  }
  
  /* =========================================================
     Preview Data
     ========================================================= */
  
  /**
   * These are examples of valid expected field names.
   *
   * They are included only to demonstrate the interface.
   * They are NOT a complete dictionary.
   *
   * Supabase will eventually provide the actual
   * field definitions and associated metadata.
   */
  const previewFields: ExpectedField[] = [
    {
      key: 'customer_name',
      displayName: 'Customer Name',
      category: 'customer',
      description:
        'Customer name used in permit documentation.',
    },
    {
      key: 'customer_phone',
      displayName: 'Customer Phone',
      category: 'customer',
      description:
        'Customer contact telephone number.',
    },
    {
      key: 'customer_email',
      displayName: 'Customer Email',
      category: 'customer',
      description:
        'Customer email address.',
    },
    {
      key: 'company_name',
      displayName: 'Company Name',
      category: 'company',
      description:
        'Name of the company preparing the permit package.',
    },
    {
      key: 'company_license',
      displayName: 'Company License',
      category: 'company',
      description:
        'Company contractor license information.',
    },
    {
      key: 'job_price',
      displayName: 'Job Price',
      category: 'job',
      description:
        'Contract value associated with the job.',
    },
    {
      key: 'legal_description',
      displayName: 'Legal Description',
      category: 'job',
      description:
        'Legal description of the property.',
    },
    {
      key: 'lot',
      displayName: 'Lot',
      category: 'job',
      description:
        'Property lot identifier.',
    },
    {
      key: 'block',
      displayName: 'Block',
      category: 'job',
      description:
        'Property block identifier.',
    },
    {
      key: 'unit',
      displayName: 'Unit',
      category: 'job',
      description:
        'Property unit identifier.',
    },
  ]
  
  /* =========================================================
     Category Configuration
     ========================================================= */
  
  const categoryDefinitions: {
    key: CategoryFilter
    label: string
  }[] = [
    {
      key: 'all',
      label: 'All Fields',
    },
    {
      key: 'customer',
      label: 'Customer',
    },
    {
      key: 'company',
      label: 'Company',
    },
    {
      key: 'job',
      label: 'Job / Property',
    },
    {
      key: 'generic',
      label: 'Generic',
    },
  ]
  
  const categoryLabels: Record<FieldCategory, string> = {
    customer: 'Customer',
    company: 'Company',
    job: 'Job / Property',
    generic: 'Generic',
  }
  
  /* =========================================================
     Icons
     ========================================================= */
  
  type IconName =
    | 'search'
    | 'book'
    | 'link'
    | 'layers'
    | 'plus'
    | 'info'
    | 'file'
  
  interface IconProps {
    name: IconName
    className?: string
  }
  
  function Icon({
    name,
    className,
  }: IconProps) {
    let content: ReactNode
  
    switch (name) {
      case 'search':
        content = (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </>
        )
        break
  
      case 'book':
        content = (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M9 7h7" />
            <path d="M9 11h5" />
          </>
        )
        break
  
      case 'link':
        content = (
          <>
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </>
        )
        break
  
      case 'layers':
        content = (
          <>
            <rect x="5" y="3" width="14" height="16" rx="2" />
            <path d="M9 7h6" />
            <path d="M9 11h6" />
            <path d="M3 7v12a2 2 0 0 0 2 2h10" />
          </>
        )
        break
  
      case 'plus':
        content = (
          <>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </>
        )
        break
  
      case 'info':
        content = (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </>
        )
        break
  
      case 'file':
        content = (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h6" />
          </>
        )
        break
    }
  
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={clsx('h-5 w-5 shrink-0', className)}
        aria-hidden="true"
      >
        {content}
      </svg>
    )
  }
  
  /* =========================================================
     Field Category Badge
     ========================================================= */
  
  function FieldCategoryBadge({
    category,
  }: {
    category: FieldCategory
  }) {
    return (
      <Badge variant={category} size="sm">
        {categoryLabels[category]}
      </Badge>
    )
  }
  
  /* =========================================================
     Empty State
     ========================================================= */
  
  interface DictionaryEmptyStateProps {
    icon: IconName
    title: string
    description: string
  }
  
  function DictionaryEmptyState({
    icon,
    title,
    description,
  }: DictionaryEmptyStateProps) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
  
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Icon name={icon} className="h-7 w-7" />
        </div>
  
        <h3 className="mt-4 text-sm font-semibold text-slate-800">
          {title}
        </h3>
  
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
          {description}
        </p>
  
      </div>
    )
  }
  
  /* =========================================================
     Main Dictionary Page
     ========================================================= */
  
  export function DictionaryPage() {
    const [activeTab, setActiveTab] =
      useState<DictionaryTab>('fields')
  
    const [searchQuery, setSearchQuery] =
      useState('')
  
    const [categoryFilter, setCategoryFilter] =
      useState<CategoryFilter>('all')
  
    const [selectedKey, setSelectedKey] =
      useState<string>('customer_name')
  
    /* =======================================================
       Field Filtering
       ======================================================= */
  
    const filteredFields = useMemo(() => {
      const query = searchQuery.trim().toLowerCase()
  
      return previewFields.filter((field) => {
        const matchesCategory =
          categoryFilter === 'all' ||
          field.category === categoryFilter
  
        const matchesSearch =
          field.key.toLowerCase().includes(query) ||
          field.displayName.toLowerCase().includes(query)
  
        return matchesCategory && matchesSearch
      })
    }, [searchQuery, categoryFilter])
  
    /**
     * Keep the details panel synchronized with the
     * visible filtered results.
     *
     * If the selected field is hidden by filtering,
     * display the first available matching field.
     */
    const selectedField =
      filteredFields.find(
        (field) => field.key === selectedKey
      ) ?? filteredFields[0]
  
    function getCategoryCount(
      category: CategoryFilter
    ): number {
      if (category === 'all') {
        return previewFields.length
      }
  
      return previewFields.filter(
        (field) => field.category === category
      ).length
    }
  
    /* =======================================================
       Tab Configuration
       ======================================================= */
  
    const tabs: {
      key: DictionaryTab
      label: string
      icon: IconName
    }[] = [
      {
        key: 'fields',
        label: 'Expected Fields',
        icon: 'book',
      },
      {
        key: 'aliases',
        label: 'Learned Aliases',
        icon: 'link',
      },
      {
        key: 'templates',
        label: 'Page Templates',
        icon: 'layers',
      },
    ]
  
    /* =======================================================
       Page Markup
       ======================================================= */
  
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-6 py-7 lg:px-8">
  
        {/* ===================================================
            Page Introduction
            =================================================== */}
  
        <div className="flex flex-wrap items-center justify-between gap-4">
  
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Dictionary Manager
            </h2>
  
            <p className="mt-1 text-sm text-slate-500">
              Manage expected fields, learned aliases,
              and saved page templates.
            </p>
          </div>
  
          <Badge variant="info" showDot>
            Frontend Preview
          </Badge>
  
        </div>
  
        {/* ===================================================
            Dictionary Tabs
            =================================================== */}
  
        <Card padding="none" className="overflow-hidden">
  
          <div
            role="tablist"
            aria-label="Dictionary sections"
            className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-4 pt-3"
          >
  
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key
  
              return (
                <button
                  key={tab.key}
                  id={`dictionary-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`dictionary-panel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
  
                    isActive
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Icon
                    name={tab.icon}
                    className="h-4 w-4"
                  />
  
                  {tab.label}
                </button>
              )
            })}
  
          </div>
  
          {/* =================================================
              Expected Fields Tab
              ================================================= */}
  
          {activeTab === 'fields' && (
            <div
              id="dictionary-panel-fields"
              role="tabpanel"
              aria-labelledby="dictionary-tab-fields"
              tabIndex={0}
              className="p-5"
            >
  
              {/* =============================================
                  Toolbar
                  ============================================= */}
  
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
  
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Expected Fields
                  </h3>
  
                  <p className="mt-1 text-xs text-slate-500">
                    Browse the field definitions recognized by
                    the application.
                  </p>
                </div>
  
                <Button
                  disabled
                  title="Adding fields will be available after dictionary services are implemented."
                  leftIcon={
                    <Icon name="plus" className="h-4 w-4" />
                  }
                >
                  Add Field
                </Button>
  
              </div>
  
              {/* =============================================
                  Preview Notice
                  ============================================= */}
  
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
  
                <Icon
                  name="info"
                  className="h-5 w-5 text-blue-600"
                />
  
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Dictionary Preview
                  </p>
  
                  <p className="mt-1 text-xs leading-relaxed text-blue-700">
                    The entries below are temporary examples
                    of expected field keys. The complete
                    dictionary and its metadata will load from
                    Supabase when database integration is
                    implemented.
                  </p>
                </div>
  
              </div>
  
              {/* =============================================
                  Main Dictionary Workspace
                  ============================================= */}
  
              <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,1fr)]">
  
                {/* ===========================================
                    Field Browser
                    =========================================== */}
  
                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
  
                  {/* Search */}
                  <div className="border-b border-slate-200 p-4">
  
                    <Input
                      aria-label="Search expected fields"
                      placeholder="Search fields by key or name..."
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      leftIcon={
                        <Icon
                          name="search"
                          className="h-4 w-4"
                        />
                      }
                    />
  
                  </div>
  
                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
  
                    {categoryDefinitions.map((category) => {
                      const isActive =
                        categoryFilter === category.key
  
                      return (
                        <button
                          key={category.key}
                          type="button"
                          onClick={() =>
                            setCategoryFilter(category.key)
                          }
                          className={clsx(
                            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
  
                            isActive
                              ? 'border-blue-200 bg-blue-100 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {category.label}
  
                          <span className="ml-2 opacity-60">
                            {getCategoryCount(category.key)}
                          </span>
                        </button>
                      )
                    })}
  
                  </div>
  
                  {/* List Header */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
  
                    <span className="text-xs font-semibold text-slate-500">
                      Key / Display Name
                    </span>
  
                    <span className="text-xs font-semibold text-slate-500">
                      Category
                    </span>
  
                  </div>
  
                  {/* Fields */}
                  <div className="max-h-[560px] overflow-y-auto">
  
                    {filteredFields.length === 0 ? (
                      <DictionaryEmptyState
                        icon="search"
                        title="No matching fields"
                        description="Try a different search term or field category."
                      />
                    ) : (
                      filteredFields.map((field) => {
                        const isSelected =
                          selectedField?.key === field.key
  
                        return (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() =>
                              setSelectedKey(field.key)
                            }
                            className={clsx(
                              'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0',
  
                              isSelected
                                ? 'bg-blue-50'
                                : 'bg-white hover:bg-slate-50'
                            )}
                          >
  
                            <div className="min-w-0">
                              <p
                                className={clsx(
                                  'truncate text-xs font-semibold',
  
                                  isSelected
                                    ? 'text-blue-700'
                                    : 'text-slate-800'
                                )}
                              >
                                {field.key}
                              </p>
  
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {field.displayName}
                              </p>
                            </div>
  
                            <FieldCategoryBadge
                              category={field.category}
                            />
  
                          </button>
                        )
                      })
                    )}
  
                  </div>
  
                  {/* List Footer */}
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
  
                    <p className="text-xs text-slate-500">
                      Showing {filteredFields.length} of{' '}
                      {previewFields.length} preview fields
                    </p>
  
                  </div>
  
                </div>
  
                {/* ===========================================
                    Field Details
                    =========================================== */}
  
                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
  
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
  
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Field Details
                      </h3>
  
                      <p className="mt-1 text-xs text-slate-500">
                        Expected field information
                      </p>
                    </div>
  
                    <Badge variant="neutral" size="sm">
                      Preview
                    </Badge>
  
                  </div>
  
                  {selectedField ? (
                    <div className="space-y-5 p-5">
  
                      {/* Selected field */}
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Selected Field
                        </p>
  
                        <p className="mt-1 break-all text-base font-semibold text-slate-800">
                          {selectedField.key}
                        </p>
  
                        <div className="mt-2">
                          <FieldCategoryBadge
                            category={selectedField.category}
                          />
                        </div>
                      </div>
  
                      {/* Key */}
                      <Input
                        label="Dictionary Key"
                        value={selectedField.key}
                        readOnly
                      />
  
                      {/* Display name */}
                      <Input
                        label="Display Name"
                        value={selectedField.displayName}
                        readOnly
                      />
  
                      {/* Category */}
                      <Input
                        label="Category"
                        value={
                          categoryLabels[selectedField.category]
                        }
                        readOnly
                      />
  
                      {/* Description */}
                      <div>
                        <label
                          htmlFor="dictionary-description"
                          className="text-sm font-medium text-slate-800"
                        >
                          Description
                        </label>
  
                        <textarea
                          id="dictionary-description"
                          value={selectedField.description}
                          readOnly
                          rows={3}
                          className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none"
                        />
                      </div>
  
                      {/* Website support */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
  
                        <Toggle
                          label="Website Supported"
                          description="This setting will indicate whether the main PermitPapers.com application supports this key."
                          disabled
                        />
  
                        <p className="mt-3 text-xs text-slate-500">
                          Support status is unavailable until
                          the dictionary service is connected.
                        </p>
  
                      </div>
  
                      {/* Actions */}
                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
  
                        <Button
                          variant="outline"
                          disabled
                        >
                          Cancel
                        </Button>
  
                        <Button
                          disabled
                          title="Editing dictionary records requires database integration."
                        >
                          Save Changes
                        </Button>
  
                      </div>
  
                    </div>
                  ) : (
                    <DictionaryEmptyState
                      icon="file"
                      title="No field selected"
                      description="Choose a field from the list to view its details."
                    />
                  )}
  
                </div>
  
              </div>
  
            </div>
          )}
  
          {/* =================================================
              Learned Aliases Tab
              ================================================= */}
  
          {activeTab === 'aliases' && (
            <div
              id="dictionary-panel-aliases"
              role="tabpanel"
              aria-labelledby="dictionary-tab-aliases"
              tabIndex={0}
              className="p-5"
            >
  
              <div className="flex flex-wrap items-center justify-between gap-4">
  
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Learned Aliases
                  </h3>
  
                  <p className="mt-1 text-xs text-slate-500">
                    View field names learned from confirmed mappings.
                  </p>
                </div>
  
                <Button
                  disabled
                  leftIcon={
                    <Icon name="plus" className="h-4 w-4" />
                  }
                >
                  Add Alias
                </Button>
  
              </div>
  
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
  
                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3">
  
                  <span className="text-xs font-semibold text-slate-500">
                    Original Field Name
                  </span>
  
                  <span className="text-xs font-semibold text-slate-500">
                    Dictionary Key
                  </span>
  
                  <span className="text-xs font-semibold text-slate-500">
                    Confirmation / Usage
                  </span>
  
                </div>
  
                <DictionaryEmptyState
                  icon="link"
                  title="Learned Aliases Not Connected"
                  description="Confirmed field-name mappings and their usage information will appear here after Supabase integration."
                />
  
              </div>
  
            </div>
          )}
  
          {/* =================================================
              Page Templates Tab
              ================================================= */}
  
          {activeTab === 'templates' && (
            <div
              id="dictionary-panel-templates"
              role="tabpanel"
              aria-labelledby="dictionary-tab-templates"
              tabIndex={0}
              className="p-5"
            >
  
              <div className="flex flex-wrap items-center justify-between gap-4">
  
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Page Templates
                  </h3>
  
                  <p className="mt-1 text-xs text-slate-500">
                    Manage previously recognized document layouts.
                  </p>
                </div>
  
                <Button
                  disabled
                  leftIcon={
                    <Icon name="plus" className="h-4 w-4" />
                  }
                >
                  Add Template
                </Button>
  
              </div>
  
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
  
                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3">
  
                  <span className="text-xs font-semibold text-slate-500">
                    Template Name
                  </span>
  
                  <span className="text-xs font-semibold text-slate-500">
                    Document / Page
                  </span>
  
                  <span className="text-xs font-semibold text-slate-500">
                    Last Updated
                  </span>
  
                </div>
  
                <DictionaryEmptyState
                  icon="layers"
                  title="Page Templates Not Connected"
                  description="Saved document layouts and their associated field mappings will appear here after template storage is implemented."
                />
  
              </div>
  
            </div>
          )}
  
        </Card>
  
      </div>
    )
  }
  
  export default DictionaryPage