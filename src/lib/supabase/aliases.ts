// ============================================================
// PDF FIELD MAPPER
// Global Alias Database Service
// ============================================================
//
// PURPOSE:
//
// - Retrieve learned global aliases.
// - Create manually approved aliases.
// - Edit existing aliases.
// - Activate and deactivate aliases.
// - Normalize names consistently.
// - Prevent unsafe generic global mappings.
//
// IMPORTANT:
//
// Global aliases are different from page-template mappings.
//
// A global alias should only be created when an original
// PDF field name has an unambiguous meaning across documents.
//
// Examples:
//
// HomeownerFullName -> customer_name
// ContractorBusinessName -> company_name
//
// Unsafe global examples:
//
// Text1
// Field17
// CheckBox3
//
// Those require page-specific recognition.
//
// Automatic learning will be implemented later, after
// successful PDF output saving is available.
//
// ============================================================

import { supabase } from './client'

import {
  getDictionaryKeys,
  getDictionaryKeyById,
} from './dictionary'

// ============================================================
// TYPES
// ============================================================

export interface FieldAlias {
  id: string

  original_name: string

  normalized_name: string

  notes: string | null

  is_active: boolean

  created_at: string

  updated_at: string

  dictionary_key_id: string
}

export interface CreateFieldAliasInput {
  originalName: string
  dictionaryKeyId: string
  notes?: string | null
}

export interface UpdateFieldAliasInput {
  originalName?: string
  dictionaryKeyId?: string
  notes?: string | null
}

export interface GetFieldAliasesOptions {
  includeInactive?: boolean
}

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

const ALIAS_COLUMNS = `
  id,
  original_name,
  normalized_name,
  notes,
  is_active,
  created_at,
  updated_at,
  dictionary_key_id
`

const PAGE_SIZE = 500

// ============================================================
// ALIAS NORMALIZATION
// ============================================================

/**
 * Convert a PDF field name into a consistent lookup value.
 *
 * Rules:
 *
 * 1. Normalize Unicode representation.
 * 2. Remove surrounding whitespace.
 * 3. Collapse repeated whitespace.
 * 4. Convert to lowercase.
 *
 * We intentionally preserve underscores, punctuation,
 * and other meaningful characters.
 *
 * Examples:
 *
 * "HomeownerFullName"  -> "homeownerfullname"
 * " Customer  Name "  -> "customer name"
 * "Owner_Name"         -> "owner_name"
 *
 * This same function should be reused by the future
 * PDF recognition pipeline.
 */
export function normalizeAliasName(
  originalName: string
): string {
  return originalName
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// ============================================================
// GENERIC FIELD DETECTION
// ============================================================

/**
 * Identify names that are too generic to safely
 * map globally.
 *
 * This is a deliberately conservative safeguard.
 *
 * It is not a complete PDF field classification engine.
 *
 * The future recognition pipeline must still distinguish
 * global aliases from page-specific mappings.
 */
export function isGenericFieldName(
  originalName: string
): boolean {
  const normalized = normalizeAliasName(originalName)

  // Common ambiguous labels.
  const ambiguousNames = new Set([
    'name',
    'date',
    'address',
    'city',
    'state',
    'zip',
    'phone',
    'email',
    'signature',
    'license',
    'amount',
    'price',
    'description',
    'text',
    'field',
    'checkbox',
    'check box',
    'button',
    'untitled',
    'unnamed',
    'unknown',
  ])

  if (ambiguousNames.has(normalized)) {
    return true
  }

  /**
   * Detect automatically generated PDF field names.
   *
   * Examples:
   *
   * Text1
   * Text_12
   * Text Field 4
   * Field17
   * FormField8
   * CheckBox3
   * RadioButton2
   * Button10
   * Signature1
   */
  const genericPattern =
    /^(?:text(?:[\s._-]*field)?|form[\s._-]*field|field|check[\s._-]*box|radio(?:[\s._-]*button)?|button|signature|sig|widget|untitled|unnamed|unknown)[\s._#-]*\d+[a-z]?(?:#\d+)?$/

  return genericPattern.test(normalized)
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate that a proposed alias is meaningful
 * and safe for global use.
 */
async function validateAliasName(
  originalName: string
): Promise<{
  originalName: string
  normalizedName: string
}> {
  const trimmedName = originalName.trim()

  if (!trimmedName) {
    throw new Error(
      'Please enter the original PDF field name.'
    )
  }

  if (trimmedName.length > 255) {
    throw new Error(
      'Alias names cannot exceed 255 characters.'
    )
  }

  if (isGenericFieldName(trimmedName)) {
    throw new Error(
      `"${trimmedName}" is too generic for a global alias. ` +
      'Use a page-template mapping for this type of field.'
    )
  }

  const normalizedName = normalizeAliasName(trimmedName)

  /**
   * Prevent aliases from shadowing canonical names.
   *
   * Exact canonical matches should always be handled
   * by the dictionary recognition process.
   */
  const dictionaryKeys = await getDictionaryKeys({
    includeInactive: true,
  })

  const canonicalConflict = dictionaryKeys.some(
    (key) =>
      normalizeAliasName(key.key_name) === normalizedName
  )

  if (canonicalConflict) {
    throw new Error(
      `"${trimmedName}" is already a canonical dictionary key. ` +
      'It does not need a global alias.'
    )
  }

  return {
    originalName: trimmedName,
    normalizedName,
  }
}

/**
 * Verify that an alias points to an active
 * dictionary key.
 */
async function validateDictionaryTarget(
  dictionaryKeyId: string
): Promise<void> {
  if (!dictionaryKeyId) {
    throw new Error(
      'Please select a dictionary key.'
    )
  }

  const dictionaryKey =
    await getDictionaryKeyById(dictionaryKeyId)

  if (!dictionaryKey) {
    throw new Error(
      'The selected dictionary key does not exist.'
    )
  }

  if (!dictionaryKey.is_active) {
    throw new Error(
      'Global aliases cannot be assigned to inactive dictionary keys.'
    )
  }
}

/**
 * Convert Supabase errors into readable messages.
 */
function createAliasError(
  action: string,
  message: string,
  code?: string
): Error {
  if (code === '23505') {
    return new Error(
      'An alias with this normalized name already exists. ' +
      'Search for the existing alias and edit or reactivate it.'
    )
  }

  return new Error(
    `Unable to ${action}: ${message}`
  )
}

// ============================================================
// GET GLOBAL ALIASES
// ============================================================

/**
 * Retrieve all global aliases.
 *
 * Pagination prevents Supabase's default row limit
 * from silently truncating larger collections.
 *
 * By default, both active and inactive records
 * are returned.
 */
export async function getFieldAliases(
  options: GetFieldAliasesOptions = {}
): Promise<FieldAlias[]> {
  const {
    includeInactive = true,
  } = options

  const allAliases: FieldAlias[] = []

  let offset = 0
  let hasMoreRecords = true

  while (hasMoreRecords) {
    const query = supabase
      .from('field_aliases')
      .select(ALIAS_COLUMNS)
      .order('normalized_name', {
        ascending: true,
      })
      .range(
        offset,
        offset + PAGE_SIZE - 1
      )

    const filteredQuery = includeInactive
      ? query
      : query.eq('is_active', true)

    const {
      data,
      error,
    } = await filteredQuery

    if (error) {
      throw new Error(
        `Unable to load field aliases: ${error.message}`
      )
    }

    const records = (data ?? []) as FieldAlias[]

    allAliases.push(...records)

    if (records.length < PAGE_SIZE) {
      hasMoreRecords = false
    } else {
      offset += PAGE_SIZE
    }
  }

  return allAliases
}

// ============================================================
// CREATE GLOBAL ALIAS
// ============================================================

/**
 * Create a manually approved global alias.
 *
 * Normalization is stored in the database so
 * recognition can use consistent lookup values.
 *
 * The database enforces uniqueness through
 * field_aliases.normalized_name.
 */
export async function createFieldAlias(
  input: CreateFieldAliasInput
): Promise<FieldAlias> {
  const validatedName =
    await validateAliasName(input.originalName)

  await validateDictionaryTarget(
    input.dictionaryKeyId
  )

  const {
    data,
    error,
  } = await supabase
    .from('field_aliases')
    .insert({
      original_name: validatedName.originalName,
      normalized_name: validatedName.normalizedName,
      dictionary_key_id: input.dictionaryKeyId,
      notes: input.notes?.trim() || null,
      is_active: true,
    })
    .select(ALIAS_COLUMNS)
    .single()

  if (error) {
    throw createAliasError(
      'create alias',
      error.message,
      error.code
    )
  }

  if (!data) {
    throw new Error(
      'The database did not return the new alias.'
    )
  }

  return data as FieldAlias
}

// ============================================================
// UPDATE GLOBAL ALIAS
// ============================================================

/**
 * Update an existing alias.
 *
 * The caller may update:
 *
 * - Original field name
 * - Dictionary target
 * - Notes
 *
 * Changing the original name also updates its
 * normalized lookup value.
 *
 * Database uniqueness constraints remain enforced.
 */
export async function updateFieldAlias(
  id: string,
  input: UpdateFieldAliasInput
): Promise<FieldAlias> {
  const updates: Record<string, unknown> = {}

  if (input.originalName !== undefined) {
    const validatedName =
      await validateAliasName(input.originalName)

    updates.original_name =
      validatedName.originalName

    updates.normalized_name =
      validatedName.normalizedName
  }

  if (input.dictionaryKeyId !== undefined) {
    await validateDictionaryTarget(
      input.dictionaryKeyId
    )

    updates.dictionary_key_id =
      input.dictionaryKeyId
  }

  if (input.notes !== undefined) {
    updates.notes =
      input.notes?.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    throw new Error(
      'No alias changes were provided.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('field_aliases')
    .update(updates)
    .eq('id', id)
    .select(ALIAS_COLUMNS)
    .single()

  if (error) {
    throw createAliasError(
      'update alias',
      error.message,
      error.code
    )
  }

  if (!data) {
    throw new Error(
      'The requested alias could not be found.'
    )
  }

  return data as FieldAlias
}

// ============================================================
// ACTIVATE / DEACTIVATE ALIAS
// ============================================================

/**
 * Activate or deactivate an alias.
 *
 * Deactivation preserves the record and historical
 * information rather than deleting it.
 *
 * Reactivation requires an active dictionary target.
 */
export async function setFieldAliasActive(
  id: string,
  isActive: boolean
): Promise<FieldAlias> {
  if (isActive) {
    const {
      data: existingAlias,
      error: lookupError,
    } = await supabase
      .from('field_aliases')
      .select('dictionary_key_id')
      .eq('id', id)
      .single()

    if (lookupError || !existingAlias) {
      throw new Error(
        'Unable to retrieve the alias before reactivation.'
      )
    }

    await validateDictionaryTarget(
      existingAlias.dictionary_key_id
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('field_aliases')
    .update({
      is_active: isActive,
    })
    .eq('id', id)
    .select(ALIAS_COLUMNS)
    .single()

  if (error) {
    throw createAliasError(
      isActive
        ? 'reactivate alias'
        : 'deactivate alias',
      error.message,
      error.code
    )
  }

  if (!data) {
    throw new Error(
      'The requested alias could not be found.'
    )
  }

  return data as FieldAlias
}