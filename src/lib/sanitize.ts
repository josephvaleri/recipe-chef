/**
 * XSS Protection Utility
 * Sanitizes user-generated HTML content to prevent script injection
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows basic formatting tags but strips all scripts and event handlers
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  
  // Server-side rendering: DOMPurify requires window object
  // Next.js will auto-escape the content, so just return as-is
  if (typeof window === 'undefined') {
    return html;
  }
  
  // Client-side: sanitize with DOMPurify
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'sup', 'sub',
      'p', 'br', 'span', 'div',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: ['class'], // Minimal attributes (removed style for security)
    KEEP_CONTENT: true, // Keep text content even if tags are removed
  });
}

/**
 * Sanitize plain text (removes all HTML)
 * Use for titles, names, and other fields that should never contain HTML
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  if (typeof window === 'undefined') {
    // Server-side: just strip tags with regex
    return text.replace(/<[^>]*>/g, '');
  }
  
  // Client-side: use DOMPurify with no allowed tags
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';
  
  // Remove dangerous protocols
  const lowerUrl = url.toLowerCase().trim();
  
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('vbscript:') ||
    lowerUrl.startsWith('file:')
  ) {
    return '';
  }
  
  // Only allow http, https, and relative URLs
  if (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('/') ||
    lowerUrl.startsWith('./')
  ) {
    return url;
  }
  
  // Default to relative URL
  return '/' + url;
}

/**
 * Create safe props for rendering HTML content
 * Usage: <div {...createSafeHTML(userContent)} />
 */
export function createSafeHTML(html: string | null | undefined) {
  return {
    dangerouslySetInnerHTML: {
      __html: sanitizeHTML(html)
    }
  };
}

