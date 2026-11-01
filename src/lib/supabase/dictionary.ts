// ============================================================
// PDF FIELD MAPPER
// Dictionary Database Service
// ============================================================
//
// PURPOSE:
//
// Provide a centralized interface for reading approved
// dictionary keys from Supabase PostgreSQL.
//
// CURRENT FUNCTIONALITY:
//
// - Retrieve dictionary records.
// - Retrieve active or inactive records.
// - Preserve database categories and metadata.
// - Return strongly typed records.
// - Report database query failures.
//
// FUTURE FUNCTIONALITY:
//
// - Create approved dictionary keys.
// - Update dictionary metadata.
// - Deactivate or reactivate dictionary keys.
// - Retrieve related aliases.
// - Validate field-name conflicts.
//
// IMPORTANT:
//
// All queries use the authenticated Supabase client.
//
// Database permissions are enforced through Supabase RLS.
//
// ============================================================

import { supabase } from './client'

// ============================================================
// TYPES
// ============================================================

/**
 * Dictionary categories.
 *
 * These correspond to the FieldCategory enum
 * defined in prisma/schema.prisma.
 */
export type DictionaryCategory =
  | 'CUSTOMER'
  | 'COMPANY'
  | 'JOB_PROPERTY'
  | 'GENERIC'

/**
 * Represents an approved dictionary record returned
 * from the dictionary_keys table.
 *
 * Property names match PostgreSQL column names.
 *
 * Keeping this database-facing type separate from
 * the UI allows us to adapt the data later without
 * requiring changes to the underlying schema.
 */
export interface DictionaryKey {
  id: string

  key_name: string

  display_name: string

  category: DictionaryCategory

  description: string | null

  website_supported: boolean | null

  is_active: boolean

  created_at: string

  updated_at: string
}

/**
 * Options accepted by the dictionary query.
 */
export interface GetDictionaryKeysOptions {
  includeInactive?: boolean
}

// ============================================================
// QUERY CONFIGURATION
// ============================================================

/**
 * Explicitly select the fields used by the application.
 *
 * This avoids requesting unnecessary database columns.
 */
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

/**
 * Supabase database queries have row-count limits.
 *
 * Our initial dictionary contains 78 keys, but this
 * service supports pagination so future additions
 * do not silently disappear from the results.
 */
const PAGE_SIZE = 500

// ============================================================
// GET DICTIONARY KEYS
// ============================================================

/**
 * Retrieve approved dictionary records from Supabase.
 *
 * By default, both active and inactive keys are returned.
 *
 * Records are retrieved in batches to prevent Supabase
 * row limits from truncating larger dictionaries.
 *
 * Pagination stops when the database returns fewer
 * records than the requested page size.
 *
 * Throws an Error if Supabase cannot complete the query.
 */
export async function getDictionaryKeys(
  options: GetDictionaryKeysOptions = {}
): Promise<DictionaryKey[]> {
  const {
    includeInactive = true,
  } = options

  const allKeys: DictionaryKey[] = []

  let offset = 0

  // Track whether additional database pages are available.
  let hasMoreRecords = true

  // ----------------------------------------------------------
  // Retrieve Records in Pages
  // ----------------------------------------------------------

  while (hasMoreRecords) {
    const query = supabase
      .from('dictionary_keys')
      .select(DICTIONARY_COLUMNS)
      .order('key_name', {
        ascending: true,
      })
      .range(
        offset,
        offset + PAGE_SIZE - 1
      )

    // --------------------------------------------------------
    // Apply Active Filter
    // --------------------------------------------------------

    const filteredQuery = includeInactive
      ? query
      : query.eq('is_active', true)

    // --------------------------------------------------------
    // Execute Query
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await filteredQuery

    if (error) {
      throw new Error(
        `Unable to load dictionary keys: ${error.message}`
      )
    }

    const records = (data ?? []) as DictionaryKey[]

    allKeys.push(...records)

    // --------------------------------------------------------
    // Determine Whether Another Page Is Needed
    // --------------------------------------------------------

    if (records.length < PAGE_SIZE) {
      // Fewer records than requested means we've reached
      // the end of the available results.
      hasMoreRecords = false
    } else {
      // A full page was returned. Continue retrieving
      // records beginning at the next offset.
      offset += PAGE_SIZE
    }
  }

  return allKeys
}

// ============================================================
// GET DICTIONARY KEY BY ID
// ============================================================

/**
 * Retrieve a specific dictionary key.
 *
 * Returns null if the record does not exist or is not
 * visible to the current user under database policies.
 *
 * This will eventually support the field-details panel
 * and dictionary editing operations.
 */
export async function getDictionaryKeyById(
  id: string
): Promise<DictionaryKey | null> {
  const {
    data,
    error,
  } = await supabase
    .from('dictionary_keys')
    .select(DICTIONARY_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Unable to retrieve dictionary key: ${error.message}`
    )
  }

  return data as DictionaryKey | null
}

// ============================================================
// CATEGORY UTILITIES
// ============================================================

/**
 * Convert a database category into a human-readable label.
 *
 * Used by the Dictionary page and potentially other
 * application interfaces.
 */
export function getDictionaryCategoryLabel(
  category: DictionaryCategory
): string {
  switch (category) {
    case 'CUSTOMER':
      return 'Customer'

    case 'COMPANY':
      return 'Company'

    case 'JOB_PROPERTY':
      return 'Job / Property'

    case 'GENERIC':
      return 'Generic'
  }
}

/**
 * Return the total number of keys in a loaded collection.
 *
 * This is a convenience function for the Dictionary UI
 * and future dashboard statistics.
 */
export function getDictionaryKeyCount(
  keys: DictionaryKey[],
  includeInactive = true
): number {
  if (includeInactive) {
    return keys.length
  }

  return keys.filter(
    (key) => key.is_active
  ).length
}

// ============================================================
// END OF DICTIONARY SERVICE
// ============================================================