import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scaleAmount(amount: string, factor: number): string {
  // naive: multiply first numeric token; leave rest
  const m = amount.match(/^(\d+(\.\d+)?)/)
  if (!m) return amount
  const n = parseFloat(m[0]) * factor
  return amount.replace(m[0], (Math.round(n*100)/100).toString())
}

export function formatTime(timeStr: string): string {
  // Convert various time formats to readable format
  if (!timeStr) return ''
  
  // Handle formats like "PT30M", "PT1H30M", etc.
  const ptMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (ptMatch) {
    const hours = ptMatch[1] ? parseInt(ptMatch[1]) : 0
    const minutes = ptMatch[2] ? parseInt(ptMatch[2]) : 0
    
    if (hours && minutes) return `${hours}h ${minutes}m`
    if (hours) return `${hours}h`
    if (minutes) return `${minutes}m`
  }
  
  return timeStr
}

export function calculateTotalTime(prepTime?: string, cookTime?: string): string {
  if (!prepTime && !cookTime) return ''
  
  const prepMinutes = parseTimeToMinutes(prepTime || '')
  const cookMinutes = parseTimeToMinutes(cookTime || '')
  const totalMinutes = prepMinutes + cookMinutes
  
  if (totalMinutes === 0) return ''
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  
  // Handle ISO 8601 duration format
  const ptMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (ptMatch) {
    const hours = ptMatch[1] ? parseInt(ptMatch[1]) : 0
    const minutes = ptMatch[2] ? parseInt(ptMatch[2]) : 0
    return hours * 60 + minutes
  }
  
  // Handle simple formats like "30 minutes", "1 hour"
  const hourMatch = timeStr.match(/(\d+)\s*h/i)
  const minuteMatch = timeStr.match(/(\d+)\s*m/i)
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
  
  return hours * 60 + minutes
}
