'use client'

import { ReactNode } from 'react'

interface BackgroundWrapperProps {
  children: ReactNode
  backgroundImage?: string
  className?: string
  showFade?: boolean
}

export default function BackgroundWrapper({ 
  children, 
  backgroundImage = '/background_home.png',
  className = '',
  showFade = true
}: BackgroundWrapperProps) {
  return (
    <div 
      className={`min-h-screen relative ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Faded overlay - 50% opacity (conditional) */}
      {showFade && <div className="absolute inset-0 bg-white/50"></div>}
      
      {/* Content without opacity reduction */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
