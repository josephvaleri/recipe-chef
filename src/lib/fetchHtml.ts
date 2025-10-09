import { extract } from '@extractus/article-extractor'

export interface FetchResult {
  html: string
  title?: string
  content?: string
  url: string
}

export async function fetchHtml(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeChef/1.0; +https://recipechef.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Try to extract article content
    const article = await extract(html)
    
    return {
      html,
      title: article?.title,
      content: article?.content,
      url: response.url,
    }
  } catch (error) {
    console.error('Error fetching HTML:', error)
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
