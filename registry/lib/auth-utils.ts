import type {
  AdminClientShape,
  BetterFetchError,
  ListUsersQuery,
  UserWithRole,
} from "@/registry/lib/auth-types"

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

/**
 * Split a user's role field into its separate roles. Better Auth stores multiple roles as one
 * comma-separated string (e.g. `"editor,viewer"`).
 */
export function parseRoles(role: string | null | undefined): string[] {
  return (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
}

/**
 * Every user who holds `role`, with the rest of `query` (search, sorting) applied. Better Auth's
 * list filter can only compare text, so `contains` also returns users whose role only includes the
 * name (`admin` in `sysadmin`); this reads all candidates in batches and keeps the exact matches.
 */
export async function listUsersWithRole(
  adminClient: AdminClientShape,
  role: string,
  query?: ListUsersQuery,
): Promise<{ users: UserWithRole[]; error: BetterFetchError | null }> {
  const users: UserWithRole[] = []
  let offset = 0
  let candidates = Infinity
  while (offset < candidates) {
    const result = await adminClient.admin.listUsers({
      query: {
        ...query,
        filterField: "role",
        filterValue: role,
        filterOperator: "contains",
        limit: 100,
        offset,
      },
    })
    if (result.error) return { users: [], error: result.error }
    const batch = result.data?.users ?? []
    if (batch.length === 0) break
    users.push(...batch.filter((user) => parseRoles(user.role).includes(role)))
    candidates = result.data?.total ?? 0
    offset += batch.length
  }
  return { users, error: null }
}
