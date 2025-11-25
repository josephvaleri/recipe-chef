'use client'

import { useEffect, useState, useMemo } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { fetchDictionaryTerms, createTermMap } from '@/lib/terms-dictionary'

interface TextWithTooltipsProps {
  text: string
  className?: string
}

/**
 * Component that processes text and wraps matching dictionary terms with tooltips
 */
export function TextWithTooltips({ text, className = '' }: TextWithTooltipsProps) {
  const [termMap, setTermMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    // Fetch dictionary terms on mount
    const loadTerms = async () => {
      const terms = await fetchDictionaryTerms()
      const map = createTermMap(terms)
      setTermMap(map)
    }
    loadTerms()
  }, [])

  // Process text to find and wrap matching terms
  const processedText = useMemo(() => {
    if (termMap.size === 0 || !text) {
      return <span>{text}</span>
    }

    // Create a regex pattern from all terms (sorted by length descending to match longer terms first)
    const sortedTerms = Array.from(termMap.keys())
      .filter(term => term.length > 0) // Filter out empty terms
      .sort((a, b) => b.length - a.length)
    
    if (sortedTerms.length === 0) {
      return <span>{text}</span>
    }

    const pattern = new RegExp(
      `\\b(${sortedTerms.map(term => escapeRegex(term)).join('|')})\\b`,
      'gi'
    )

    const parts: (string | { word: string; definition: string })[] = []
    let lastIndex = 0
    
    // Find all matches (using a while loop with exec)
    let match
    const regex = new RegExp(pattern)
    while ((match = regex.exec(text)) !== null) {
      // Prevent infinite loops on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }

      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Add matched term with definition
      const matchedTerm = match[0].toLowerCase()
      const definition = termMap.get(matchedTerm)
      if (definition) {
        parts.push({ word: match[0], definition })
      } else {
        parts.push(match[0])
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    // If no matches found, return original text
    if (parts.length === 1 && typeof parts[0] === 'string') {
      return <span>{text}</span>
    }

    // Render parts with tooltips
    return (
      <>
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return <span key={index}>{part}</span>
          } else {
            return (
              <Tooltip key={index} content={part.definition}>
                {part.word}
              </Tooltip>
            )
          }
        })}
      </>
    )
  }, [text, termMap])

  return <span className={className}>{processedText}</span>
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

