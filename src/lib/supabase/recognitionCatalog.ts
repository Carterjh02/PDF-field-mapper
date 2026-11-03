// ============================================================
// PDF FIELD MAPPER
// SHARED RECOGNITION CATALOG
// ============================================================
//
// PURPOSE:
//
// Centralize dictionary and learned-alias retrieval for
// the PDF recognition system.
//
// RESPONSIBILITIES:
//
// - Retrieve canonical dictionary keys from Supabase.
// - Retrieve active learned aliases from Supabase.
// - Cache recognition data temporarily.
// - Share pending requests between components.
// - Allow explicit recognition-data refreshes.
// - Notify subscribed components when data changes.
// - Support cache invalidation after future database writes.
//
// IMPORTANT:
//
// This service is READ-ONLY.
//
// It does not modify PDF documents.
// It does not create dictionary entries.
// It does not create or update learned aliases.
//
// Supabase remains the authoritative data source.
//
// ============================================================

import {
  getDictionaryKeys,
  type DictionaryKey,
} from './dictionary'

import {
  getFieldAliases,
  type FieldAlias,
} from './aliases'

// ============================================================
// RECOGNITION CATALOG
// ============================================================

export interface RecognitionCatalog {

  // All canonical dictionary entries.
  //
  // Includes inactive entries so existing mappings
  // can be identified and validated.
  dictionaryKeys: DictionaryKey[]

  // Active global learned aliases.
  fieldAliases: FieldAlias[]

  // Alias retrieval errors are nonfatal.
  //
  // Dictionary recognition and manual mapping should
  // remain available if aliases cannot be loaded.
  aliasesError: string | null

}

// ============================================================
// RETRIEVAL OPTIONS
// ============================================================

export interface GetRecognitionCatalogOptions {

  // Bypass cached data and request fresh Supabase records.
  forceRefresh?: boolean

}

// ============================================================
// CACHE CONFIGURATION
// ============================================================

const CACHE_DURATION_MS = 60_000

interface RecognitionCatalogCache {

  catalog: RecognitionCatalog

  loadedAt: number

}

// ============================================================
// CACHE STATE
// ============================================================

let cachedCatalog:
  RecognitionCatalogCache | null = null

// Shares an outstanding request between callers.
let pendingRequest:
  Promise<RecognitionCatalog> | null = null

// Prevents an outdated request from overwriting
// a newer cache after invalidation.
let cacheGeneration = 0

// ============================================================
// CATALOG SUBSCRIPTIONS
// ============================================================
//
// Components can subscribe to recognition-data changes.
//
// Whenever fresh data is successfully retrieved,
// all subscribers receive the updated catalog.
//
// This allows independent React components to remain
// synchronized without introducing another state library.
//
// ============================================================

export type RecognitionCatalogListener = (
  catalog: RecognitionCatalog
) => void

const catalogListeners =
  new Set<RecognitionCatalogListener>()

// ============================================================
// NOTIFY SUBSCRIBERS
// ============================================================

function notifyCatalogListeners(
  catalog: RecognitionCatalog
): void {

  for (const listener of catalogListeners) {

    try {

      listener(catalog)

    } catch (error) {

      // A failing subscriber must not interrupt
      // recognition-data retrieval or other subscribers.
      console.error(
        '[Recognition Catalog] Subscriber error:',
        error
      )

    }

  }

}

// ============================================================
// SUBSCRIBE TO RECOGNITION DATA
// ============================================================
//
// Returns an unsubscribe function.
//
// React components should unsubscribe when they unmount.
//
// Example:
//
// const unsubscribe = subscribeRecognitionCatalog(
//   (catalog) => {
//     setCatalog(catalog)
//   }
// )
//
// return unsubscribe
//
// ============================================================

export function subscribeRecognitionCatalog(
  listener: RecognitionCatalogListener
): () => void {

  catalogListeners.add(listener)

  return () => {

    catalogListeners.delete(listener)

  }

}

// ============================================================
// RETRIEVE RECOGNITION DATA FROM SUPABASE
// ============================================================
//
// Uses the existing dictionary and alias services.
//
// Dictionary retrieval is required.
//
// Alias retrieval is nonfatal so users can continue
// working if the alias table is temporarily unavailable.
//
// ============================================================

async function fetchRecognitionCatalog():
  Promise<RecognitionCatalog> {

  // ----------------------------------------------------------
  // LOAD CANONICAL DICTIONARY
  // ----------------------------------------------------------

  const dictionaryKeys =
    await getDictionaryKeys({
      includeInactive: true,
    })

  // ----------------------------------------------------------
  // LOAD APPROVED GLOBAL ALIASES
  // ----------------------------------------------------------

  let fieldAliases: FieldAlias[] = []

  let aliasesError: string | null = null

  try {

    fieldAliases = await getFieldAliases({
      includeInactive: false,
    })

  } catch (error) {

    aliasesError =
      error instanceof Error
        ? error.message
        : 'Unable to load learned aliases.'

    console.warn(
      '[Recognition Catalog] Alias retrieval failed:',
      error
    )

  }

  // ----------------------------------------------------------
  // RETURN COMBINED DATA
  // ----------------------------------------------------------

  return {

    dictionaryKeys,

    fieldAliases,

    aliasesError,

  }

}

// ============================================================
// GET RECOGNITION CATALOG
// ============================================================
//
// RETRIEVAL BEHAVIOR:
//
// 1. Optionally invalidate existing cache.
// 2. Return valid cached data when available.
// 3. Reuse an existing pending request.
// 4. Otherwise retrieve fresh data from Supabase.
// 5. Cache the successful result.
// 6. Notify all registered subscribers.
//
// Dictionary retrieval failures are not cached.
//
// ============================================================

export async function getRecognitionCatalog(

  options: GetRecognitionCatalogOptions = {}

): Promise<RecognitionCatalog> {

  const {
    forceRefresh = false,
  } = options

  // ----------------------------------------------------------
  // FORCE REFRESH
  // ----------------------------------------------------------

  if (forceRefresh) {

    invalidateRecognitionCatalog()

  }

  // ----------------------------------------------------------
  // RETURN VALID CACHED DATA
  // ----------------------------------------------------------

  if (cachedCatalog) {

    const cacheAge =
      Date.now() - cachedCatalog.loadedAt

    if (cacheAge < CACHE_DURATION_MS) {

      return cachedCatalog.catalog

    }

  }

  // ----------------------------------------------------------
  // REUSE OUTSTANDING REQUEST
  // ----------------------------------------------------------

  if (pendingRequest) {

    return pendingRequest

  }

  // ----------------------------------------------------------
  // START NEW REQUEST
  // ----------------------------------------------------------

  const requestGeneration =
    cacheGeneration

  const request = fetchRecognitionCatalog()

    .then((catalog) => {

      // ------------------------------------------------------
      // PREVENT STALE REQUESTS FROM UPDATING THE CACHE
      // ------------------------------------------------------

      if (
        requestGeneration === cacheGeneration
      ) {

        cachedCatalog = {

          catalog,

          loadedAt: Date.now(),

        }

        // Notify other components that fresh
        // recognition data is now available.
        notifyCatalogListeners(catalog)

        console.log(
          '[Recognition Catalog] Dictionary keys:',
          catalog.dictionaryKeys.length
        )

        console.log(
          '[Recognition Catalog] Active aliases:',
          catalog.fieldAliases.length
        )

      }

      return catalog

    })

  pendingRequest = request

  // ----------------------------------------------------------
  // AWAIT REQUEST
  // ----------------------------------------------------------

  try {

    return await request

  } finally {

    // Only clear the request if it is still current.
    //
    // A force refresh may already have started a
    // newer request.
    if (pendingRequest === request) {

      pendingRequest = null

    }

  }

}

// ============================================================
// INVALIDATE RECOGNITION CATALOG
// ============================================================
//
// Clears cached data so the next retrieval will query
// Supabase again.
//
// IMPORTANT:
//
// Invalidation does not erase the currently displayed
// catalog from subscribed React components.
//
// This prevents the mapping interface from disappearing
// while a refresh is in progress.
//
// Subscribers receive new data after successful retrieval.
//
// ============================================================

export function invalidateRecognitionCatalog(): void {

  cacheGeneration++

  cachedCatalog = null

  pendingRequest = null

}

// ============================================================
// GET CACHED CATALOG
// ============================================================
//
// Returns the most recently cached catalog without
// initiating a database request.
//
// Useful for components that mount after another component
// has already retrieved recognition data.
//
// Returns null when no catalog is cached.
//
// ============================================================

export function getCachedRecognitionCatalog():
  RecognitionCatalog | null {

  return cachedCatalog?.catalog ?? null

}