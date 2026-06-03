/**
 * Shared TypeScript types mirroring Better Auth's user/session shapes.
 * Defined manually so components have no hard dependency on a specific Better Auth version.
 */

/** Base user record returned by Better Auth */
export interface User {
  /** Unique user identifier */
  id: string
  /** When the user was created */
  createdAt: Date
  /** When the user was last updated */
  updatedAt: Date
  /** User email address */
  email: string
  /** Whether the email has been verified */
  emailVerified: boolean
  /** Display name */
  name: string
  /** Avatar image URL */
  image?: string | null | undefined
}

/** User with admin-plugin fields (role, ban status) */
export interface UserWithRole extends User {
  /** User role (e.g. "user", "admin") */
  role?: string | undefined
  /** Whether the user is currently banned */
  banned?: boolean | null | undefined
  /** Reason for the ban */
  banReason?: string | null | undefined
  /** When the ban expires (null = permanent) */
  banExpires?: Date | null | undefined
}

/** Session record returned by Better Auth */
export interface Session {
  /** Unique session identifier */
  id: string
  /** When the session was created */
  createdAt: Date
  /** When the session was last updated */
  updatedAt: Date
  /** ID of the user who owns this session */
  userId: string
  /** When the session expires */
  expiresAt: Date
  /** Session token */
  token: string
  /** IP address of the client */
  ipAddress?: string | null | undefined
  /** User agent string of the client */
  userAgent?: string | null | undefined
  /** If impersonating, the ID of the admin who initiated it */
  impersonatedBy?: string | undefined
}

/** Shape of the session data returned by useSession */
export interface SessionData {
  /** The authenticated user */
  user: User
  /** The active session */
  session: Session
}

/**
 * API key record returned by the Better Auth api-key plugin.
 * The secret key value is never included here — it is only returned once by `create`.
 */
export interface ApiKey {
  /** Unique key identifier */
  id: string
  /** Human-readable key name */
  name: string | null
  /** First few characters of the key, safe to display for identification */
  start: string | null
  /** Configured key prefix */
  prefix: string | null
  /** ID of the user who owns the key */
  userId: string
  /** Whether the key is currently enabled (a disabled key is rejected on use) */
  enabled: boolean
  /** When the key expires (null = never expires) */
  expiresAt: Date | null
  /** When the key was created */
  createdAt: Date
  /** When the key was last updated */
  updatedAt: Date
  /** When the key was last used to make a request (null = never used) */
  lastRequest: Date | null
  /** Remaining requests when a usage limit is configured (null = unlimited) */
  remaining: number | null
  /** Arbitrary metadata attached at creation */
  metadata: Record<string, unknown> | null
}

/**
 * API key including the full secret value.
 * Returned only by `apiKey.create` — the value cannot be retrieved again afterwards.
 */
export interface CreatedApiKey extends ApiKey {
  /** The full API key secret. Shown once on creation and never retrievable again. */
  key: string
}

/** Better Auth API error response shape */
export interface APIErrorResponse {
  /** Machine-readable error code */
  code?: string | undefined
  /** Human-readable error message */
  message?: string | undefined
}

/** Response shape returned by Better Auth client methods */
export interface BetterFetchResponse<T> {
  /** Response data on success, null on error */
  data: T | null
  /** Error details on failure, null on success */
  error: BetterFetchError | null
}

/** Error shape from the fetch layer */
export interface BetterFetchError {
  /** Human-readable error message */
  message: string
  /** HTTP status code */
  status: number
  /** HTTP status text */
  statusText: string
}

/**
 * Loosely-typed auth client shape matching the Better Auth client API.
 * Components use this via context so they work with any Better Auth client configuration.
 */
export interface AuthClientShape {
  signIn: {
    email: (data: {
      email: string
      password: string
      callbackURL?: string | undefined
      rememberMe?: boolean | undefined
    }) => Promise<BetterFetchResponse<{ redirect: boolean; token: string; user: User }>>
  }
  signUp: {
    email: (data: {
      email: string
      password: string
      name: string
      image?: string | undefined
      callbackURL?: string | undefined
    }) => Promise<BetterFetchResponse<{ token: string | null; user: User }>>
  }
  requestPasswordReset: (data: {
    email: string
    redirectTo?: string | undefined
  }) => Promise<BetterFetchResponse<{ status: boolean; message: string }>>
  resetPassword: (data: {
    newPassword: string
    token?: string | undefined
  }) => Promise<BetterFetchResponse<{ status: boolean }>>
  verifyEmail: (query: {
    token: string
    callbackURL?: string | undefined
  }) => Promise<BetterFetchResponse<{ status: boolean; user?: User | undefined }>>
  changePassword: (data: {
    newPassword: string
    currentPassword: string
    revokeOtherSessions?: boolean | undefined
  }) => Promise<BetterFetchResponse<{ token: string | null; user: User }>>
  updateUser: (data: {
    name?: string | undefined
    image?: string | null | undefined
  }) => Promise<BetterFetchResponse<{ status: boolean }>>
  deleteUser: (data: {
    callbackURL?: string | undefined
    password?: string | undefined
    token?: string | undefined
  }) => Promise<BetterFetchResponse<{ success: boolean; message: string }>>
  useSession: () => {
    data: SessionData | null
    error: BetterFetchError | null
    isPending: boolean
  }
  /**
   * API key plugin methods. Present only when the Better Auth api-key plugin
   * is configured on the client. Access via the `useApiKeyClient()` hook,
   * which throws a helpful error when the plugin is missing.
   */
  apiKey?: ApiKeyMethods | undefined
}

/** Client methods provided by the Better Auth api-key plugin. */
export interface ApiKeyMethods {
  /** Create a new API key. The full secret is returned once in the response. */
  create: (data: {
    name?: string | undefined
    /** Seconds until the key expires. Omit or pass null for a key that never expires. */
    expiresIn?: number | null | undefined
    /** Optional prefix prepended to the generated key */
    prefix?: string | undefined
    /** Arbitrary metadata to attach to the key */
    metadata?: Record<string, unknown> | undefined
  }) => Promise<BetterFetchResponse<CreatedApiKey>>
  /** List all API keys owned by the current user. */
  list: () => Promise<BetterFetchResponse<ApiKey[]>>
  /** Fetch a single API key's metadata by id. */
  get: (data: { query: { id: string } }) => Promise<BetterFetchResponse<ApiKey | null>>
  /** Update an API key's name or enabled state. */
  update: (data: {
    keyId: string
    name?: string | undefined
    enabled?: boolean | undefined
  }) => Promise<BetterFetchResponse<ApiKey>>
  /** Permanently delete an API key. */
  delete: (data: { keyId: string }) => Promise<BetterFetchResponse<{ success: boolean }>>
}

/** Admin client methods provided by the Better Auth admin plugin */
export interface AdminClientShape {
  admin: {
    listUsers: (args?: {
      query?:
        | {
            searchValue?: string | undefined
            searchField?: "name" | "email" | undefined
            searchOperator?: "contains" | "starts_with" | "ends_with" | undefined
            limit?: number | undefined
            offset?: number | undefined
            sortBy?: string | undefined
            sortDirection?: "asc" | "desc" | undefined
            filterField?: string | undefined
            filterValue?: string | number | boolean | undefined
            filterOperator?: string | undefined
          }
        | undefined
    }) => Promise<BetterFetchResponse<{ users: UserWithRole[]; total: number }>>
    createUser: (data: {
      email: string
      name: string
      password?: string | undefined
      role?: string | undefined
      data?: Record<string, unknown> | undefined
    }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    updateUser: (data: {
      userId: string
      data: Record<string, unknown>
    }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    removeUser: (data: { userId: string }) => Promise<BetterFetchResponse<{ success: boolean }>>
    banUser: (data: {
      userId: string
      banReason?: string | undefined
      banExpiresIn?: number | undefined
    }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    unbanUser: (data: { userId: string }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    setRole: (data: {
      userId: string
      role: string
    }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    setUserPassword: (data: {
      userId: string
      newPassword: string
    }) => Promise<BetterFetchResponse<{ user: UserWithRole }>>
    impersonateUser: (data: {
      userId: string
    }) => Promise<BetterFetchResponse<{ session: Session; user: UserWithRole }>>
    stopImpersonating: () => Promise<BetterFetchResponse<{ session: Session; user: User }>>
  }
}
