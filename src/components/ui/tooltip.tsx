'use client'

import * as React from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  if (!content) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="underline decoration-dotted decoration-orange-400 cursor-help">
        {children}
      </span>
      {isVisible && (
        <div 
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg whitespace-normal pointer-events-none"
          style={{ 
            width: '300px',
            minWidth: '300px',
            maxWidth: '300px',
            boxSizing: 'border-box'
          }}
        >
          <div className="relative w-full">
            {content}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-600"></div>
          </div>
        </div>
      )}
    </span>
  )
}

