import type { BetterFetchError } from "./types"

/**
 * Extract a human-readable error message from a Better Auth API error.
 * Falls back to a generic message if the error shape is unexpected.
 */
export function getErrorMessage(error: BetterFetchError | null | undefined): string {
  if (!error) {
    return "An unexpected error occurred"
  }
  if (error.message) {
    return error.message
  }
  if (error.statusText) {
    return error.statusText
  }
  return "An unexpected error occurred"
}

/**
 * Check if an error is a network error (as opposed to a server-side validation error).
 */
export function isNetworkError(error: BetterFetchError | null | undefined): boolean {
  if (!error) return false
  return error.status === 0 || error.status >= 500
}
