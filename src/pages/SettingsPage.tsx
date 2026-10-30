import {
    useState,
    type ReactNode,
  } from 'react'
  
  import clsx from 'clsx'
  
  import { Button } from '../components/common/Button'
  import { Card } from '../components/common/Card'
  import { Badge } from '../components/common/Badge'
  import { Toggle } from '../components/common/Toggle'
  import { Select } from '../components/common/Select'
  import { Input } from '../components/common/Input'
  
  /* =========================================================
     PDF FIELD MAPPER
     Settings Page
     ========================================================= */
  
  /**
   * Application settings interface.
   *
   * CURRENT FUNCTIONALITY:
   * - Change draft preference values.
   * - Display the current draft configuration.
   * - Restore default draft preferences.
   *
   * FUTURE FUNCTIONALITY:
   * - Persist preferences between sessions.
   * - Connect settings to application services.
   * - Display actual database connection information.
   * - Configure PDF-processing behavior.
   *
   * IMPORTANT:
   * Settings are currently stored only in React state.
   * No preference changes are saved permanently.
   */
  
  /* =========================================================
     Types
     ========================================================= */
  
  type OutputNamingMode =
    | 'suffix'
    | 'prepared'
    | 'timestamp'
  
  interface ApplicationSettings {
    /* Recognition */
    useLearnedAliases: boolean
    usePageTemplates: boolean
    suggestFuzzyMatches: boolean
    analyzeNearbyText: boolean
  
    /* Editor */
    showFieldLabels: boolean
    showConfidenceHighlights: boolean
    showCategoryBorders: boolean
    highlightUnmappedFields: boolean
  
    /* File Handling */
    openEditorAfterProcessing: boolean
    outputNamingMode: OutputNamingMode
    outputSuffix: string
  }
  
  /* =========================================================
     Default Settings
     ========================================================= */
  
  /**
   * Initial draft preferences.
   *
   * These values do not yet affect the PDF engine.
   *
   * Once persistence is implemented, saved preferences
   * will be loaded through the settings service.
   */
  const DEFAULT_SETTINGS: ApplicationSettings = {
    useLearnedAliases: true,
    usePageTemplates: true,
    suggestFuzzyMatches: true,
    analyzeNearbyText: false,
  
    showFieldLabels: true,
    showConfidenceHighlights: true,
    showCategoryBorders: true,
    highlightUnmappedFields: true,
  
    openEditorAfterProcessing: true,
    outputNamingMode: 'suffix',
    outputSuffix: '_mapped',
  }
  
  /* =========================================================
     Section Heading
     ========================================================= */
  
  interface SectionHeadingProps {
    title: string
    description?: string
    action?: ReactNode
  }
  
  function SectionHeading({
    title,
    description,
    action,
  }: SectionHeadingProps) {
    return (
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
  
        <div className="min-w-0">
  
          <h2 className="text-base font-semibold text-slate-800">
            {title}
          </h2>
  
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          )}
  
        </div>
  
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
  
      </div>
    )
  }
  
  /* =========================================================
     Settings Toggle Row
     ========================================================= */
  
  /**
   * Shared presentation for settings switches.
   *
   * The Toggle component handles the actual input.
   * This component adds consistent spacing and dividers.
   */
  interface SettingToggleRowProps {
    label: string
    description: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
  }
  
  function SettingToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled = false,
  }: SettingToggleRowProps) {
    return (
      <div className="border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0">
  
        <Toggle
          label={label}
          description={description}
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />
  
      </div>
    )
  }
  
  /* =========================================================
     System Information Row
     ========================================================= */
  
  interface SystemInfoRowProps {
    label: string
    value: ReactNode
  }
  
  function SystemInfoRow({
    label,
    value,
  }: SystemInfoRowProps) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
  
        <span className="text-sm text-slate-500">
          {label}
        </span>
  
        <div className="text-sm font-medium text-slate-700">
          {value}
        </div>
  
      </div>
    )
  }
  
  /* =========================================================
     Main Settings Page
     ========================================================= */
  
  export function SettingsPage() {
    const [settings, setSettings] =
      useState<ApplicationSettings>({
        ...DEFAULT_SETTINGS,
      })
  
    /* =======================================================
       Settings Management
       ======================================================= */
  
    /**
     * Update a boolean application preference.
     *
     * These changes are temporary and exist
     * only within this page's React state.
     */
    function updateBooleanSetting(
      key: keyof ApplicationSettings,
      checked: boolean
    ) {
      setSettings((current) => ({
        ...current,
        [key]: checked,
      }))
    }
  
    /**
     * Restore default draft values.
     *
     * This does not modify a database or saved
     * application configuration.
     */
    function resetToDefaults() {
      setSettings({ ...DEFAULT_SETTINGS })
    }
  
    /**
     * Check whether draft values differ from
     * the initial defaults.
     */
    const hasChanges =
      JSON.stringify(settings) !==
      JSON.stringify(DEFAULT_SETTINGS)
  
    /* =======================================================
       Output Filename Preview
       ======================================================= */
  
    /**
     * Generate an example filename based on the
     * currently selected naming preference.
     *
     * This is a visual preview only.
     */
    function getExampleFilename(): string {
      switch (settings.outputNamingMode) {
        case 'suffix':
          return `permit_application${settings.outputSuffix}.pdf`
  
        case 'prepared':
          return 'prepared_permit_application.pdf'
  
        case 'timestamp':
          return 'permit_application_YYYYMMDD_HHMMSS.pdf'
      }
    }
  
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
              Application Settings
            </h2>
  
            <p className="mt-1 text-sm text-slate-500">
              Configure PDF recognition, editor behavior,
              and document preferences.
            </p>
          </div>
  
          <div className="flex flex-wrap items-center gap-3">
  
            <Badge variant="info" showDot>
              Frontend Preview
            </Badge>
  
            <Button
              variant="outline"
              size="sm"
              disabled={!hasChanges}
              onClick={resetToDefaults}
            >
              Reset Draft
            </Button>
  
            <Button
              size="sm"
              disabled
              title="Settings persistence will be implemented later."
            >
              Save Settings
            </Button>
  
          </div>
  
        </div>
  
        {/* ===================================================
            Settings Notice
            =================================================== */}
  
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
  
          <div
            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"
            aria-hidden="true"
          />
  
          <div>
  
            <p className="text-sm font-semibold text-blue-800">
              Settings Preview Mode
            </p>
  
            <p className="mt-1 text-xs leading-relaxed text-blue-700">
              You can adjust these settings to preview the interface.
              Changes are not saved and do not currently affect
              PDF processing or recognition behavior.
            </p>
  
          </div>
  
        </div>
  
        {/* ===================================================
            Main Settings Grid
            =================================================== */}
  
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
  
          {/* =================================================
              Recognition Settings
              ================================================= */}
  
          <Card>
  
            <SectionHeading
              title="Recognition Settings"
              description="Configure how the application will identify and suggest PDF field mappings."
              action={
                <Badge variant="neutral" size="sm">
                  Recognition
                </Badge>
              }
            />
  
            <SettingToggleRow
              label="Use Learned Aliases"
              description="Include previously confirmed field-name aliases during recognition."
              checked={settings.useLearnedAliases}
              onChange={(checked) =>
                updateBooleanSetting(
                  'useLearnedAliases',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Use Saved Page Templates"
              description="Check documents against previously recognized page layouts."
              checked={settings.usePageTemplates}
              onChange={(checked) =>
                updateBooleanSetting(
                  'usePageTemplates',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Suggest Fuzzy Matches"
              description="Suggest dictionary keys for similar but nonidentical field names."
              checked={settings.suggestFuzzyMatches}
              onChange={(checked) =>
                updateBooleanSetting(
                  'suggestFuzzyMatches',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Analyze Nearby Text"
              description="Use nearby printed text to help identify unclear field names."
              checked={settings.analyzeNearbyText}
              onChange={(checked) =>
                updateBooleanSetting(
                  'analyzeNearbyText',
                  checked
                )
              }
            />
  
          </Card>
  
          {/* =================================================
              PDF Editor Preferences
              ================================================= */}
  
          <Card>
  
            <SectionHeading
              title="PDF Editor Preferences"
              description="Control how fields and recognition information will appear in the PDF Editor."
              action={
                <Badge variant="neutral" size="sm">
                  Display
                </Badge>
              }
            />
  
            <SettingToggleRow
              label="Show Field Labels"
              description="Display mapped dictionary keys over interactive PDF fields."
              checked={settings.showFieldLabels}
              onChange={(checked) =>
                updateBooleanSetting(
                  'showFieldLabels',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Show Confidence Highlights"
              description="Highlight field recognition confidence using the established status colors."
              checked={settings.showConfidenceHighlights}
              onChange={(checked) =>
                updateBooleanSetting(
                  'showConfidenceHighlights',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Show Category Borders"
              description="Display category-specific borders for customer, company, job, and generic fields."
              checked={settings.showCategoryBorders}
              onChange={(checked) =>
                updateBooleanSetting(
                  'showCategoryBorders',
                  checked
                )
              }
            />
  
            <SettingToggleRow
              label="Highlight Unmapped Fields"
              description="Visually distinguish fields that still require mapping or confirmation."
              checked={settings.highlightUnmappedFields}
              onChange={(checked) =>
                updateBooleanSetting(
                  'highlightUnmappedFields',
                  checked
                )
              }
            />
  
          </Card>
  
          {/* =================================================
              File Handling
              ================================================= */}
  
          <Card>
  
            <SectionHeading
              title="File Handling"
              description="Configure output naming and document workflow preferences."
              action={
                <Badge variant="neutral" size="sm">
                  Documents
                </Badge>
              }
            />
  
            <div className="space-y-5">
  
              <SettingToggleRow
                label="Open PDF Editor After Processing"
                description="Automatically open prepared documents for review."
                checked={settings.openEditorAfterProcessing}
                onChange={(checked) =>
                  updateBooleanSetting(
                    'openEditorAfterProcessing',
                    checked
                  )
                }
              />
  
              <div>
                <Select
                  label="Output Filename Format"
                  value={settings.outputNamingMode}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      outputNamingMode:
                        event.target.value as OutputNamingMode,
                    }))
                  }
                  helperText="Choose a proposed filename format for processed PDF copies."
                >
                  <option value="suffix">
                    Add Filename Suffix
                  </option>
  
                  <option value="prepared">
                    Add Prepared Prefix
                  </option>
  
                  <option value="timestamp">
                    Add Timestamp
                  </option>
                </Select>
              </div>
  
              {settings.outputNamingMode === 'suffix' && (
                <Input
                  label="Output Filename Suffix"
                  value={settings.outputSuffix}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      outputSuffix: event.target.value,
                    }))
                  }
                  placeholder="_mapped"
                  helperText="This suffix will be added before the PDF extension. Filename validation will be added with file services."
                />
              )}
  
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
  
                <p className="text-xs font-medium text-slate-500">
                  Example Output Filename
                </p>
  
                <p className="mt-2 break-all text-sm font-semibold text-slate-700">
                  {getExampleFilename()}
                </p>
  
              </div>
  
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
  
                <div className="flex items-center gap-2">
  
                  <Badge variant="success" size="sm">
                    Recommended
                  </Badge>
  
                  <span className="text-xs font-semibold text-green-800">
                    Preserve Original PDFs
                  </span>
  
                </div>
  
                <p className="mt-2 text-xs leading-relaxed text-green-800">
                  The planned processing workflow will create
                  separate output copies instead of modifying
                  original source documents.
                </p>
  
              </div>
  
            </div>
  
          </Card>
  
          {/* =================================================
              Dictionary & Learning
              ================================================= */}
  
          <Card>
  
            <SectionHeading
              title="Dictionary & Learning"
              description="Review how confirmed mappings will contribute to future field recognition."
              action={
                <Badge variant="neutral" size="sm">
                  Learning
                </Badge>
              }
            />
  
            <div className="space-y-5">
  
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
  
                <p className="text-sm font-semibold text-slate-800">
                  Generic Field Confirmation
                </p>
  
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Generic names such as Text1 or Field23
                  must receive explicit confirmation before
                  being associated with dictionary keys.
                </p>
  
                <div className="mt-3">
  
                  <Badge variant="success" showDot>
                    Confirmation Required
                  </Badge>
  
                </div>
  
              </div>
  
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
  
                <p className="text-sm font-semibold text-slate-800">
                  Learning After Successful Save
                </p>
  
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  New mappings will only be committed to
                  the learning system after the modified PDF
                  is successfully saved.
                </p>
  
                <div className="mt-3">
  
                  <Badge variant="neutral" size="sm">
                    Planned Behavior
                  </Badge>
  
                </div>
  
              </div>
  
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
  
                <p className="text-xs leading-relaxed text-blue-800">
                  The complete learning system, including
                  alias conflicts, confirmation history,
                  and page-specific mappings, will be
                  implemented during backend development.
                </p>
  
              </div>
  
            </div>
  
          </Card>
  
        </div>
  
        {/* ===================================================
            System & Connections
            =================================================== */}
  
        <Card>
  
          <SectionHeading
            title="System & Connections"
            description="Application information and planned service integrations."
            action={
              <Badge variant="warning" size="sm">
                Setup Pending
              </Badge>
            }
          />
  
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  
            {/* ===============================================
                Application Information
                =============================================== */}
  
            <div className="rounded-xl border border-slate-200 p-5">
  
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Application Information
              </h3>
  
              <SystemInfoRow
                label="Application"
                value="PDF Field Mapper"
              />
  
              <SystemInfoRow
                label="Platform"
                value="Windows Desktop"
              />
  
              <SystemInfoRow
                label="Framework"
                value="Electron + React"
              />
  
              <SystemInfoRow
                label="Version"
                value="Development Build"
              />
  
            </div>
  
            {/* ===============================================
                Service Information
                =============================================== */}
  
            <div className="rounded-xl border border-slate-200 p-5">
  
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Service Connections
              </h3>
  
              <SystemInfoRow
                label="Supabase"
                value={
                  <Badge variant="warning" size="sm">
                    Not Configured
                  </Badge>
                }
              />
  
              <SystemInfoRow
                label="PDF Processing Engine"
                value={
                  <Badge variant="warning" size="sm">
                    Not Configured
                  </Badge>
                }
              />
  
              <SystemInfoRow
                label="Dictionary Service"
                value={
                  <Badge variant="warning" size="sm">
                    Not Connected
                  </Badge>
                }
              />
  
              <SystemInfoRow
                label="Settings Persistence"
                value={
                  <Badge variant="neutral" size="sm">
                    Not Implemented
                  </Badge>
                }
              />
  
            </div>
  
          </div>
  
        </Card>
  
        {/* ===================================================
            Bottom Action Bar
            =================================================== */}
  
        <div
          className={clsx(
            'flex',
            'flex-wrap',
            'items-center',
            'justify-between',
            'gap-4',
            'rounded-xl',
            'border',
            'border-[var(--color-border)]',
            'bg-white',
            'p-5'
          )}
        >
  
          <div>
  
            <p className="text-sm font-semibold text-slate-800">
              Application Preferences
            </p>
  
            <p className="mt-1 text-xs text-slate-500">
              {hasChanges
                ? 'Your draft differs from the default preferences. Changes are not saved.'
                : 'The default preview preferences are currently selected.'}
            </p>
  
          </div>
  
          <div className="flex flex-wrap gap-3">
  
            <Button
              variant="outline"
              disabled={!hasChanges}
              onClick={resetToDefaults}
            >
              Restore Defaults
            </Button>
  
            <Button
              disabled
              title="Settings persistence will be implemented later."
            >
              Save Preferences
            </Button>
  
          </div>
  
        </div>
  
      </div>
    )
  }
  
  export default SettingsPage