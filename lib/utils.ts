import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get current date in Philippine timezone (Asia/Manila, UTC+8)
export function getPhilippineDate(): string {
  const now = new Date()
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  const year = phTime.getFullYear()
  const month = String(phTime.getMonth() + 1).padStart(2, "0")
  const day = String(phTime.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Get current datetime in Philippine timezone as ISO string
export function getPhilippineDateTime(): string {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
}
