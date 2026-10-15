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
  const roles = (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
  return [...new Set(roles)]
}

/**
 * Every user who holds `role`, with the rest of `query` (search, sorting) applied. Better Auth's
 * list filter can only compare text, so `contains` also returns users whose role only includes the
 * name (`admin` in `sysadmin`); this reads all candidates in batches and keeps the exact matches.
 * The batches are read in `id` order, the one order that stays the same from one batch to the
 * next, and the requested sort is applied afterwards.
 */
export async function listUsersWithRole(
  adminClient: AdminClientShape,
  role: string,
  query?: ListUsersQuery,
): Promise<{ users: UserWithRole[]; error: BetterFetchError | null }> {
  const { sortBy, sortDirection, ...rest } = query ?? {}
  const users: UserWithRole[] = []
  let offset = 0
  let candidates = Infinity
  while (offset < candidates) {
    const result = await adminClient.admin.listUsers({
      query: {
        ...rest,
        sortBy: "id",
        sortDirection: "asc",
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
  if (sortBy) {
    const direction = sortDirection === "desc" ? -1 : 1
    const field = (user: UserWithRole) => (user as unknown as Record<string, unknown>)[sortBy]
    users.sort((a, b) => direction * compareValues(field(a), field(b)))
  }
  return { users, error: null }
}

/** Order two values of one user field, with empty values last as a database sorts ascending. */
function compareValues(a: unknown, b: unknown): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b)
  return String(a).localeCompare(String(b))
}
