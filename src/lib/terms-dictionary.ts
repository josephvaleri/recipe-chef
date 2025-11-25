import { supabase } from './supabase'

export interface DictionaryTerm {
  id: string
  terms: string
  alternate_names: string | null
  definition: string | null
}

/**
 * Fetches all terms from the terms_dictionary table
 */
export async function fetchDictionaryTerms(): Promise<DictionaryTerm[]> {
  try {
    const { data, error } = await supabase
      .from('terms_dictionary')
      .select('id, terms, alternate_names, definition')
      .order('terms', { ascending: true })

    if (error) {
      console.error('Error fetching dictionary terms:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching dictionary terms:', error)
    return []
  }
}

/**
 * Creates a map of search terms to definitions for quick lookup
 * Includes both the main term and alternate names
 */
export function createTermMap(terms: DictionaryTerm[]): Map<string, string> {
  const termMap = new Map<string, string>()

  for (const term of terms) {
    const definition = term.definition || ''
    
    // Add main term (case-insensitive)
    if (term.terms) {
      termMap.set(term.terms.toLowerCase(), definition)
    }

    // Add alternate names (case-insensitive)
    if (term.alternate_names) {
      const alternates = term.alternate_names.split(',').map(a => a.trim())
      for (const alternate of alternates) {
        if (alternate) {
          termMap.set(alternate.toLowerCase(), definition)
        }
      }
    }
  }

  return termMap
}

