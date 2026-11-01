import { supabase } from './client'

import type {
  DictionaryCategory,
  DictionaryKey,
} from './dictionary'

// ============================================================
// PDF FIELD MAPPER
// Dictionary Mutation Service
// ============================================================
//
// PURPOSE:
//
// - Create approved dictionary records.
// - Update dictionary metadata.
// - Activate and deactivate dictionary keys.
//
// IMPORTANT:
//
// Canonical key names are treated as stable.
//
// Existing canonical key names cannot be changed through
// the update function.
//
// Keys should be deactivated rather than deleted because
// aliases, templates, and confirmations may reference them.
//
// All operations are protected by Supabase RLS.
//
// ============================================================


// ============================================================
// TYPES
// ============================================================

export interface CreateDictionaryKeyInput {
  keyName: string
  displayName: string
  category: DictionaryCategory
  description?: string | null
}

export interface UpdateDictionaryKeyInput {
  displayName?: string
  category?: DictionaryCategory
  description?: string | null
  websiteSupported?: boolean | null
}


// ============================================================
// COLUMN SELECTION
// ============================================================

const DICTIONARY_COLUMNS = `
  id,
  key_name,
  display_name,
  category,
  description,
  website_supported,
  is_active,
  created_at,
  updated_at
`


// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate canonical dictionary key formatting.
 *
 * Approved keys use lowercase letters, numbers,
 * and underscores.
 *
 * This only validates syntax.
 *
 * It does NOT prove that PermitPapers.com recognizes
 * the new key.
 */
function validateKeyName(keyName: string): string {
  const normalized = keyName.trim()

  const isValid = /^[a-z][a-z0-9_]*$/.test(normalized)

  if (!isValid) {
    throw new Error(
      'Dictionary keys must begin with a lowercase letter ' +
      'and contain only lowercase letters, numbers, and underscores.'
    )
  }

  return normalized
}

/**
 * Ensure required display names contain meaningful text.
 */
function validateDisplayName(displayName: string): string {
  const normalized = displayName.trim()

  if (!normalized) {
    throw new Error(
      'A dictionary field must have a display name.'
    )
  }

  return normalized
}

/**
 * Convert database errors into readable application errors.
 */
function createDatabaseError(
  operation: string,
  message: string
): Error {
  return new Error(
    `Unable to ${operation}: ${message}`
  )
}


// ============================================================
// CREATE DICTIONARY KEY
// ============================================================

/**
 * Create a new approved dictionary record.
 *
 * New keys are marked:
 *
 * is_active = true
 * website_supported = null
 *
 * The website support status remains unverified
 * until compatibility has been confirmed.
 *
 * IMPORTANT:
 *
 * Adding a key here does not automatically add support
 * to PermitPapers.com's fillPdf.ts allowedKeys list.
 *
 * That compatibility must be handled separately.
 */
export async function createDictionaryKey(
  input: CreateDictionaryKeyInput
): Promise<DictionaryKey> {
  const keyName = validateKeyName(input.keyName)

  const displayName = validateDisplayName(
    input.displayName
  )

  const { data, error } = await supabase
    .from('dictionary_keys')
    .insert({
      key_name: keyName,
      display_name: displayName,
      category: input.category,
      description: input.description?.trim() || null,
      website_supported: null,
      is_active: true,
    })
    .select(DICTIONARY_COLUMNS)
    .single()

  if (error) {
    throw createDatabaseError(
      'create dictionary key',
      error.message
    )
  }

  if (!data) {
    throw new Error(
      'The database did not return the created dictionary key.'
    )
  }

  return data as DictionaryKey
}


// ============================================================
// UPDATE DICTIONARY KEY
// ============================================================

/**
 * Update editable dictionary metadata.
 *
 * The canonical key name and UUID are intentionally
 * excluded from the update interface.
 *
 * This prevents accidental changes to field names
 * already referenced by PermitPapers.com.
 */
export async function updateDictionaryKey(
  id: string,
  input: UpdateDictionaryKeyInput
): Promise<DictionaryKey> {
  const updates: Record<string, unknown> = {}

  if (input.displayName !== undefined) {
    updates.display_name = validateDisplayName(
      input.displayName
    )
  }

  if (input.category !== undefined) {
    updates.category = input.category
  }

  if (input.description !== undefined) {
    updates.description =
      input.description?.trim() || null
  }

  if (input.websiteSupported !== undefined) {
    updates.website_supported =
      input.websiteSupported
  }

  if (Object.keys(updates).length === 0) {
    throw new Error(
      'No dictionary changes were provided.'
    )
  }

  const { data, error } = await supabase
    .from('dictionary_keys')
    .update(updates)
    .eq('id', id)
    .select(DICTIONARY_COLUMNS)
    .single()

  if (error) {
    throw createDatabaseError(
      'update dictionary key',
      error.message
    )
  }

  if (!data) {
    throw new Error(
      'The dictionary key could not be found.'
    )
  }

  return data as DictionaryKey
}


// ============================================================
// ACTIVATE / DEACTIVATE DICTIONARY KEY
// ============================================================

/**
 * Change whether a dictionary key may be used for
 * future PDF mappings.
 *
 * Deactivation is preferred over physical deletion.
 *
 * Existing aliases, page-template mappings, and audit
 * records remain intact.
 */
export async function setDictionaryKeyActive(
  id: string,
  isActive: boolean
): Promise<DictionaryKey> {
  const { data, error } = await supabase
    .from('dictionary_keys')
    .update({
      is_active: isActive,
    })
    .eq('id', id)
    .select(DICTIONARY_COLUMNS)
    .single()

  if (error) {
    throw createDatabaseError(
      isActive
        ? 'activate dictionary key'
        : 'deactivate dictionary key',
      error.message
    )
  }

  if (!data) {
    throw new Error(
      'The dictionary key could not be found.'
    )
  }

  return data as DictionaryKey
}