import {
    useState,
    type FormEvent,
  } from 'react'
  
  import { Button } from '../common/Button'
  
  import type {
    DictionaryCategory,
    DictionaryKey,
  } from '../../lib/supabase/dictionary'
  
  // ============================================================
  // PDF FIELD MAPPER
  // Dictionary Field Form
  // ============================================================
  //
  // PURPOSE:
  //
  // Reusable form for creating and editing master dictionary
  // records.
  //
  // The form does not communicate with Supabase directly.
  // Its parent component handles database operations.
  //
  // IMPORTANT:
  //
  // - Canonical key names cannot be renamed after creation.
  // - New keys are not automatically supported by the website.
  // - Website support uses three states:
  //   Unverified, Supported, Unsupported.
  //
  // ============================================================
  
  export interface DictionaryFieldFormValues {
    keyName: string
    displayName: string
    category: DictionaryCategory
    description: string
    websiteSupported: boolean | null
  }
  
  interface DictionaryFieldFormProps {
    mode: 'create' | 'edit'
    field?: DictionaryKey
    busy: boolean
    onCancel: () => void
    onSubmit: (
      values: DictionaryFieldFormValues
    ) => Promise<void>
  }
  
  const inputClassName =
    'w-full rounded-lg border border-slate-200 bg-white ' +
    'px-3 py-2.5 text-sm text-slate-700 outline-none ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
    'disabled:cursor-not-allowed disabled:bg-slate-100'
  
  const labelClassName =
    'mb-2 block text-xs font-semibold text-slate-600'
  
  // ============================================================
  // FORM COMPONENT
  // ============================================================
  
  export function DictionaryFieldForm({
    mode,
    field,
    busy,
    onCancel,
    onSubmit,
  }: DictionaryFieldFormProps) {
    const isCreating = mode === 'create'
  
    // ----------------------------------------------------------
    // Form State
    // ----------------------------------------------------------
  
    const [values, setValues] =
      useState<DictionaryFieldFormValues>(() => ({
        keyName: field?.key_name ?? '',
        displayName: field?.display_name ?? '',
        category: field?.category ?? 'CUSTOMER',
        description: field?.description ?? '',
        websiteSupported:
          field?.website_supported ?? null,
      }))
  
    // ----------------------------------------------------------
    // Update Form Values
    // ----------------------------------------------------------
  
    function updateValue<
      K extends keyof DictionaryFieldFormValues
    >(
      key: K,
      value: DictionaryFieldFormValues[K]
    ) {
      setValues((current) => ({
        ...current,
        [key]: value,
      }))
    }
  
    // ----------------------------------------------------------
    // Submit Form
    // ----------------------------------------------------------
  
    function handleSubmit(
      event: FormEvent<HTMLFormElement>
    ) {
      event.preventDefault()
  
      if (busy) {
        return
      }
  
      void onSubmit(values)
    }
  
    // ==========================================================
    // RENDER
    // ==========================================================
  
    return (
      <div>
        {/* =====================================================
            FORM HEADER
            ===================================================== */}
  
        <div className="mb-5">
  
          <h2 className="text-base font-semibold text-slate-800">
            {isCreating
              ? 'Add Dictionary Field'
              : 'Edit Dictionary Field'}
          </h2>
  
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {isCreating
              ? 'Create a new canonical field definition.'
              : 'Update the selected field’s metadata.'}
          </p>
  
        </div>
  
        {/* =====================================================
            FORM
            ===================================================== */}
  
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
  
          {/* ===================================================
              CANONICAL KEY
              =================================================== */}
  
          <div>
  
            <label
              htmlFor="dictionary-form-key"
              className={labelClassName}
            >
              Canonical Key
            </label>
  
            <input
              id="dictionary-form-key"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              value={values.keyName}
              onChange={(event) =>
                updateValue(
                  'keyName',
                  event.target.value
                )
              }
              disabled={!isCreating || busy}
              pattern="[a-z][a-z0-9_]*"
              title="Use lowercase letters, numbers, and underscores. Start with a letter."
              placeholder="example_field_name"
              className={`${inputClassName} font-mono`}
            />
  
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {isCreating
                ? 'Use lowercase letters, numbers, and underscores. This must eventually match a supported PermitPapers.com field.'
                : 'Canonical names are locked to preserve compatibility with existing PDFs and mappings.'}
            </p>
  
          </div>
  
          {/* ===================================================
              DISPLAY NAME
              =================================================== */}
  
          <div>
  
            <label
              htmlFor="dictionary-form-display-name"
              className={labelClassName}
            >
              Display Name
            </label>
  
            <input
              id="dictionary-form-display-name"
              type="text"
              required
              maxLength={150}
              value={values.displayName}
              onChange={(event) =>
                updateValue(
                  'displayName',
                  event.target.value
                )
              }
              disabled={busy}
              placeholder="Example Field Name"
              className={inputClassName}
            />
  
          </div>
  
          {/* ===================================================
              CATEGORY
              =================================================== */}
  
          <div>
  
            <label
              htmlFor="dictionary-form-category"
              className={labelClassName}
            >
              Category
            </label>
  
            <select
              id="dictionary-form-category"
              value={values.category}
              disabled={busy}
              onChange={(event) =>
                updateValue(
                  'category',
                  event.target.value as DictionaryCategory
                )
              }
              className={inputClassName}
            >
              <option value="CUSTOMER">
                Customer
              </option>
  
              <option value="COMPANY">
                Company
              </option>
  
              <option value="JOB_PROPERTY">
                Job / Property
              </option>
  
              <option value="GENERIC">
                Generic
              </option>
            </select>
  
          </div>
  
          {/* ===================================================
              DESCRIPTION
              =================================================== */}
  
          <div>
  
            <label
              htmlFor="dictionary-form-description"
              className={labelClassName}
            >
              Description
            </label>
  
            <textarea
              id="dictionary-form-description"
              rows={4}
              value={values.description}
              onChange={(event) =>
                updateValue(
                  'description',
                  event.target.value
                )
              }
              disabled={busy}
              placeholder="Describe the purpose of this field..."
              className={`${inputClassName} resize-y`}
            />
  
          </div>
  
          {/* ===================================================
              WEBSITE SUPPORT STATUS
              =================================================== */}
  
          {!isCreating && (
  
            <div>
  
              <label
                htmlFor="dictionary-form-website-support"
                className={labelClassName}
              >
                Website Compatibility
              </label>
  
              <select
                id="dictionary-form-website-support"
                disabled={busy}
                value={
                  values.websiteSupported === null
                    ? 'unverified'
                    : values.websiteSupported
                      ? 'supported'
                      : 'unsupported'
                }
                onChange={(event) => {
                  const value = event.target.value
  
                  updateValue(
                    'websiteSupported',
                    value === 'unverified'
                      ? null
                      : value === 'supported'
                  )
                }}
                className={inputClassName}
              >
  
                <option value="unverified">
                  Unverified
                </option>
  
                <option value="supported">
                  Supported
                </option>
  
                <option value="unsupported">
                  Unsupported
                </option>
  
              </select>
  
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Mark a key as supported only after
                verifying that PermitPapers.com can
                populate it correctly.
              </p>
  
            </div>
  
          )}
  
          {/* ===================================================
              COMPATIBILITY NOTICE
              =================================================== */}
  
          {isCreating && (
  
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
  
              <p className="text-xs font-semibold text-amber-800">
                Website Compatibility Required
              </p>
  
              <p className="mt-2 text-xs leading-relaxed text-amber-700">
                Creating a dictionary record does not
                automatically update the allowedKeys list
                in PermitPapers.com.
  
                New fields will initially be marked
                Unverified until their compatibility
                has been established.
              </p>
  
            </div>
  
          )}
  
          {/* ===================================================
              FORM ACTIONS
              =================================================== */}
  
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
  
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
  
            <Button
              type="submit"
              size="sm"
              disabled={busy}
            >
              {busy
                ? 'Saving...'
                : isCreating
                  ? 'Create Field'
                  : 'Save Changes'}
            </Button>
  
          </div>
  
        </form>
      </div>
    )
  }
  
  export default DictionaryFieldForm