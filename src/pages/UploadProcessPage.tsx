import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type ReactNode,
  } from 'react'
  
  import clsx from 'clsx'
  
  import { Button } from '../components/common/Button'
  import { Card } from '../components/common/Card'
  import { Badge } from '../components/common/Badge'
  import { Toggle } from '../components/common/Toggle'
  
  /* =========================================================
     PDF FIELD MAPPER
     Upload & Process Page
     ========================================================= */
  
  /**
   * This page manages the frontend PDF upload queue.
   *
   * Currently implemented:
   * - Local file selection
   * - Drag-and-drop uploads
   * - File validation
   * - Queue management
   * - Processing option selection
   *
   * Not yet implemented:
   * - PDF field extraction
   * - PDF page counting
   * - Output folder selection
   * - PDF processing
   * - Database integration
   *
   * IMPORTANT:
   * Adding a file to the queue does not modify or
   * process the original PDF.
   */
  
  /* =========================================================
     Types
     ========================================================= */
  
  interface QueuedFile {
    id: string
    file: File
  }
  
  interface ProcessingOptions {
    learnedAliases: boolean
    pageTemplates: boolean
    nearbyText: boolean
    unknownSuggestions: boolean
    openEditor: boolean
    processInOrder: boolean
    keepOriginals: boolean
  }
  
  type ProcessingOptionKey = Exclude<
    keyof ProcessingOptions,
    'keepOriginals'
  >
  
  interface ProcessingOptionDefinition {
    key: ProcessingOptionKey
    label: string
    description: string
  }
  
  /* =========================================================
     Configuration
     ========================================================= */
  
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  
  const workflowSteps = [
    'Upload Files',
    'Configure Options',
    'Review & Edit',
    'Save & Next',
  ]
  
  const processingOptionDefinitions: ProcessingOptionDefinition[] = [
    {
      key: 'learnedAliases',
      label: 'Use learned aliases',
      description:
        'Include previously confirmed field-name mappings.',
    },
    {
      key: 'pageTemplates',
      label: 'Use saved page templates',
      description:
        'Check for previously recognized document layouts.',
    },
    {
      key: 'nearbyText',
      label: 'Analyze nearby text / OCR',
      description:
        'Use surrounding document text when field names are unclear. OCR support will be added later.',
    },
    {
      key: 'unknownSuggestions',
      label: 'Suggest unknown field mappings',
      description:
        'Identify fields that may match existing dictionary keys.',
    },
    {
      key: 'openEditor',
      label: 'Open PDF Editor after processing',
      description:
        'Automatically open documents for mapping review.',
    },
    {
      key: 'processInOrder',
      label: 'Process files in upload order',
      description:
        'Maintain the original sequence of queued documents.',
    },
  ]
  
  /* =========================================================
     Utility Functions
     ========================================================= */
  
  /**
   * Convert file sizes into readable labels.
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`
    }
  
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
  
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  
  /**
   * Generate a stable identifier for a selected file.
   *
   * This also allows us to prevent accidental duplicate
   * entries when the same file is selected repeatedly.
   */
  function getFileId(file: File): string {
    return [
      file.name,
      file.size,
      file.lastModified,
    ].join('-')
  }
  
  /* =========================================================
     Icons
     ========================================================= */
  
  type IconName =
    | 'upload'
    | 'file'
    | 'folder'
    | 'trash'
    | 'plus'
    | 'check'
    | 'info'
  
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
      case 'upload':
        content = (
          <>
            <path d="M12 16V3" />
            <path d="m7 8 5-5 5 5" />
            <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
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
  
      case 'folder':
        content = (
          <>
            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </>
        )
        break
  
      case 'trash':
        content = (
          <>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M5 6l1 15h12l1-15" />
            <path d="M10 10v7" />
            <path d="M14 10v7" />
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
  
      case 'check':
        content = (
          <>
            <path d="m5 12 4 4L19 6" />
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
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">
            {title}
          </h2>
  
          {description && (
            <p className="mt-1 text-xs text-slate-500">
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
     Main Page
     ========================================================= */
  
  export function UploadProcessPage() {
    const fileInputRef = useRef<HTMLInputElement>(null)
  
    const [files, setFiles] = useState<QueuedFile[]>([])
  
    const [selectedIds, setSelectedIds] = useState<string[]>([])
  
    const [isDragging, setIsDragging] = useState(false)
  
    const [uploadMessage, setUploadMessage] = useState('')
  
    const [options, setOptions] = useState<ProcessingOptions>({
      learnedAliases: true,
      pageTemplates: true,
      nearbyText: false,
      unknownSuggestions: true,
      openEditor: true,
      processInOrder: true,
      keepOriginals: true,
    })
  
    /* =======================================================
       Prevent Accidental File Navigation
       ======================================================= */
  
    /**
     * Prevent dropping a PDF outside the upload area
     * from navigating Electron away from the application.
     */
    useEffect(() => {
      function preventDefault(event: globalThis.DragEvent) {
        event.preventDefault()
      }
  
      window.addEventListener('dragover', preventDefault)
      window.addEventListener('drop', preventDefault)
  
      return () => {
        window.removeEventListener('dragover', preventDefault)
        window.removeEventListener('drop', preventDefault)
      }
    }, [])
  
    /* =======================================================
       File Management
       ======================================================= */
  
    /**
     * Validate selected files and add accepted PDFs
     * to the in-memory queue.
     *
     * No PDF data is uploaded to a server.
     */
    function addFiles(newFiles: File[]) {
      const accepted: QueuedFile[] = []
      const rejected: string[] = []
  
      const existingIds = new Set(
        files.map((item) => item.id)
      )
  
      newFiles.forEach((file) => {
        const isPdf =
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/pdf'
  
        if (!isPdf) {
          rejected.push(`${file.name}: not a PDF`)
          return
        }
  
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(`${file.name}: exceeds 50 MB`)
          return
        }
  
        const id = getFileId(file)
  
        if (existingIds.has(id)) {
          rejected.push(`${file.name}: already queued`)
          return
        }
  
        existingIds.add(id)
  
        accepted.push({
          id,
          file,
        })
      })
  
      if (accepted.length > 0) {
        setFiles((current) => [
          ...current,
          ...accepted,
        ])
      }
  
      setUploadMessage(rejected.join(' | '))
    }
  
    /**
     * Open the native file-selection dialog.
     */
    function openFilePicker() {
      fileInputRef.current?.click()
    }
  
    /**
     * Handle files selected through the browser
     * file input.
     */
    function handleFileSelection(
      event: ChangeEvent<HTMLInputElement>
    ) {
      const selectedFiles = Array.from(
        event.target.files ?? []
      )
  
      addFiles(selectedFiles)
  
      // Allow the same file to be selected again later.
      event.target.value = ''
    }
  
    /**
     * Handle files dropped onto the upload area.
     */
    function handleFileDrop(
      event: DragEvent<HTMLDivElement>
    ) {
      event.preventDefault()
  
      setIsDragging(false)
  
      const droppedFiles = Array.from(
        event.dataTransfer.files
      )
  
      addFiles(droppedFiles)
    }
  
    /**
     * Toggle an individual queue selection.
     */
    function toggleSelection(id: string) {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
      )
    }
  
    /**
     * Select or deselect every queued document.
     */
    function toggleSelectAll() {
      if (selectedIds.length === files.length) {
        setSelectedIds([])
      } else {
        setSelectedIds(files.map((item) => item.id))
      }
    }
  
    /**
     * Remove one queued document.
     */
    function removeFile(id: string) {
      setFiles((current) =>
        current.filter((item) => item.id !== id)
      )
  
      setSelectedIds((current) =>
        current.filter((item) => item !== id)
      )
    }
  
    /**
     * Remove selected queued documents.
     */
    function removeSelected() {
      setFiles((current) =>
        current.filter(
          (item) => !selectedIds.includes(item.id)
        )
      )
  
      setSelectedIds([])
    }
  
    /**
     * Clear the entire queue.
     */
    function clearQueue() {
      setFiles([])
      setSelectedIds([])
      setUploadMessage('')
    }
  
    /* =======================================================
       Processing Options
       ======================================================= */
  
    function updateOption(
      key: keyof ProcessingOptions,
      checked: boolean
    ) {
      setOptions((current) => ({
        ...current,
        [key]: checked,
      }))
    }
  
    /* =======================================================
       Derived Information
       ======================================================= */
  
    const totalSize = files.reduce(
      (total, item) => total + item.file.size,
      0
    )
  
    const allSelected =
      files.length > 0 &&
      selectedIds.length === files.length
  
    // The frontend can progress to configuration,
    // but it cannot actually process files yet.
    const activeStep = files.length > 0 ? 1 : 0
  
    /* =======================================================
       Page Markup
       ======================================================= */
  
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-6 py-7 lg:px-8">
  
        {/* ===================================================
            Introduction
            =================================================== */}
  
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Prepare Your Documents
            </h2>
  
            <p className="mt-1 text-sm text-slate-500">
              Upload PDF forms and configure how their fields
              will be analyzed.
            </p>
          </div>
  
          <Badge variant="info" showDot>
            Frontend Preview
          </Badge>
        </div>
  
        {/* ===================================================
            Workflow Progress
            =================================================== */}
  
        <Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  
            {workflowSteps.map((step, index) => {
              const isActive = index === activeStep
              const isComplete = index < activeStep
  
              return (
                <div
                  key={step}
                  className="flex items-center gap-3"
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={clsx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
  
                      isComplete &&
                        'bg-green-100 text-green-700',
  
                      isActive &&
                        'bg-blue-600 text-white',
  
                      !isComplete &&
                        !isActive &&
                        'bg-slate-100 text-slate-400'
                    )}
                  >
                    {isComplete ? (
                      <Icon name="check" className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </span>
  
                  <div>
                    <p className="text-xs text-slate-400">
                      Step {index + 1}
                    </p>
  
                    <p
                      className={clsx(
                        'text-sm font-semibold',
                        isActive
                          ? 'text-blue-700'
                          : 'text-slate-700'
                      )}
                    >
                      {step}
                    </p>
                  </div>
                </div>
              )
            })}
  
          </div>
        </Card>
  
        {/* ===================================================
            Main Two-Column Layout
            =================================================== */}
  
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
  
          {/* =================================================
              LEFT COLUMN
              ================================================= */}
  
          <div className="min-w-0 space-y-6">
  
            {/* ===============================================
                Upload Area
                =============================================== */}
  
            <Card>
              <SectionHeading
                title="Upload PDF Files"
                description="Select one or more interactive PDF documents."
              />
  
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleFileSelection}
                className="hidden"
                aria-label="Choose PDF files"
              />
  
              <div
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={handleFileDrop}
                className={clsx(
                  'flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
  
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-slate-50/60'
                )}
              >
  
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <Icon name="upload" className="h-8 w-8" />
                </div>
  
                <h3 className="mt-5 text-base font-semibold text-slate-800">
                  Drag & Drop PDF Files Here
                </h3>
  
                <p className="mt-2 text-sm text-slate-500">
                  Or choose documents directly from your computer.
                </p>
  
                <Button
                  className="mt-5"
                  leftIcon={
                    <Icon name="plus" className="h-4 w-4" />
                  }
                  onClick={openFilePicker}
                >
                  Choose Files
                </Button>
  
                <p className="mt-4 text-xs text-slate-400">
                  PDF files only • Multiple files supported •
                  50 MB maximum per file
                </p>
  
              </div>
  
              {uploadMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                >
                  {uploadMessage}
                </div>
              )}
  
            </Card>
  
            {/* ===============================================
                Uploaded Files Queue
                =============================================== */}
  
            <Card padding="none" className="overflow-hidden">
  
              <div className="p-5">
                <SectionHeading
                  title="Uploaded Files"
                  description="Manage documents waiting to be processed."
                  action={
                    <Badge variant="neutral">
                      {files.length} Files
                    </Badge>
                  }
                />
  
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openFilePicker}
                    leftIcon={
                      <Icon name="plus" className="h-4 w-4" />
                    }
                  >
                    Add Files
                  </Button>
  
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedIds.length === 0}
                    onClick={removeSelected}
                  >
                    Remove Selected
                  </Button>
  
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={files.length === 0}
                    onClick={clearQueue}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
  
              <div className="overflow-x-auto">
  
                <table className="w-full min-w-[650px] text-left">
  
                  <thead className="border-y border-slate-200 bg-slate-50">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={files.length === 0}
                          onChange={toggleSelectAll}
                          aria-label="Select all files"
                          className="accent-blue-600"
                        />
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Filename
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Pages
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Size
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Status
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Detected Fields
                      </th>
  
                      <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
  
                  <tbody className="divide-y divide-slate-100">
  
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center py-12 text-center">
                            <Icon
                              name="file"
                              className="h-10 w-10 text-slate-300"
                            />
  
                            <p className="mt-3 text-sm font-medium text-slate-600">
                              No files added yet
                            </p>
  
                            <p className="mt-1 text-xs text-slate-400">
                              Selected PDF documents will appear here.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      files.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
  
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelection(item.id)}
                              aria-label={`Select ${item.file.name}`}
                              className="accent-blue-600"
                            />
                          </td>
  
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Icon
                                name="file"
                                className="h-5 w-5 text-red-500"
                              />
  
                              <span
                                className="max-w-60 truncate text-xs font-medium text-slate-700"
                                title={item.file.name}
                              >
                                {item.file.name}
                              </span>
                            </div>
                          </td>
  
                          <td className="px-3 py-3 text-xs text-slate-400">
                            —
                          </td>
  
                          <td className="px-3 py-3 text-xs text-slate-600">
                            {formatFileSize(item.file.size)}
                          </td>
  
                          <td className="px-3 py-3">
                            <Badge variant="neutral" size="sm">
                              Queued
                            </Badge>
                          </td>
  
                          <td className="px-3 py-3 text-xs text-slate-400">
                            —
                          </td>
  
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => removeFile(item.id)}
                              aria-label={`Remove ${item.file.name}`}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Icon
                                name="trash"
                                className="h-4 w-4"
                              />
                            </button>
                          </td>
  
                        </tr>
                      ))
                    )}
  
                  </tbody>
                </table>
  
              </div>
  
              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-xs text-slate-500">
                  {files.length} document(s) queued
                </span>
  
                <span className="text-xs text-slate-500">
                  Total size: {formatFileSize(totalSize)}
                </span>
              </div>
  
            </Card>
  
          </div>
  
          {/* =================================================
              RIGHT COLUMN
              ================================================= */}
  
          <div className="min-w-0 space-y-6">
  
            {/* ===============================================
                Output Folder
                =============================================== */}
  
            <Card>
              <SectionHeading
                title="Output Folder"
                description="Choose where processed PDFs will eventually be saved."
              />
  
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Icon
                  name="folder"
                  className="text-slate-400"
                />
  
                <span className="min-w-0 flex-1 text-xs text-slate-500">
                  No output folder selected
                </span>
  
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Folder selection will be implemented with Electron file services."
                >
                  Browse...
                </Button>
              </div>
  
              <div className="mt-5">
                <Toggle
                  label="Keep original files unchanged"
                  description="Recommended: save processed copies instead of overwriting source PDFs."
                  checked={options.keepOriginals}
                  onChange={(event) =>
                    updateOption(
                      'keepOriginals',
                      event.target.checked
                    )
                  }
                />
              </div>
  
            </Card>
  
            {/* ===============================================
                Processing Options
                =============================================== */}
  
            <Card>
              <SectionHeading
                title="Processing Options"
                description="Configure how PDF fields will be recognized."
              />
  
              <div className="space-y-5">
  
                {processingOptionDefinitions.map((option) => (
                  <Toggle
                    key={option.key}
                    label={option.label}
                    description={option.description}
                    checked={options[option.key]}
                    onChange={(event) =>
                      updateOption(
                        option.key,
                        event.target.checked
                      )
                    }
                  />
                ))}
  
              </div>
  
            </Card>
  
            {/* ===============================================
                Processing Summary
                =============================================== */}
  
            <Card>
              <SectionHeading
                title="Ready to Process"
                description="Review your upload queue before continuing."
              />
  
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
  
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Documents
                  </span>
  
                  <span className="font-semibold text-slate-800">
                    {files.length}
                  </span>
                </div>
  
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Total Size
                  </span>
  
                  <span className="font-semibold text-slate-800">
                    {formatFileSize(totalSize)}
                  </span>
                </div>
  
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Processing Status
                  </span>
  
                  <Badge variant="warning" size="sm">
                    Not Started
                  </Badge>
                </div>
  
              </div>
  
              <Button
                fullWidth
                size="lg"
                disabled
                className="mt-5"
                title="PDF processing will be enabled when the processing engine is implemented."
              >
                Start Processing
              </Button>
  
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <Icon
                  name="info"
                  className="h-4 w-4 text-blue-600"
                />
  
                <p className="text-xs leading-relaxed text-blue-800">
                  File selection and configuration are available.
                  PDF analysis and saving will be connected
                  during backend development.
                </p>
              </div>
  
            </Card>
  
          </div>
  
        </div>
  
      </div>
    )
  }
  
  export default UploadProcessPage