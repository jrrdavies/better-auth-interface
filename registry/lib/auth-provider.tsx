"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { AdminClientShape, AuthClientShape } from "./types"

interface AuthContextValue {
  authClient: AuthClientShape
  adminClient: AdminClientShape | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Props for the AuthProvider component */
export interface AuthProviderProps {
  /** The Better Auth client instance */
  authClient: AuthClientShape
  /** The Better Auth admin client instance (only needed for admin components) */
  adminClient?: AdminClientShape | undefined
  /** Child components that will have access to the auth context */
  children: ReactNode
}

/**
 * React context provider wrapping the Better Auth client.
 * All better-auth-ui components must be rendered inside this provider.
 *
 * @example
 * ```tsx
 * import { AuthProvider } from "@/components/auth-provider"
 * import { authClient } from "@/lib/auth-client"
 *
 * function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <AuthProvider authClient={authClient}>
 *       {children}
 *     </AuthProvider>
 *   )
 * }
 * ```
 */
export function AuthProvider({ authClient, adminClient, children }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ authClient, adminClient: adminClient ?? null }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access the Better Auth client from context.
 * Must be called within an AuthProvider.
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuthClient(): AuthClientShape {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthClient must be used within an AuthProvider")
  }
  return context.authClient
}

/**
 * Hook to access the Better Auth admin client from context.
 * Returns the admin client or throws if not provided.
 * Must be called within an AuthProvider that has an adminClient prop.
 *
 * @throws Error if used outside of AuthProvider or if adminClient was not provided
 */
export function useAdminClient(): AdminClientShape {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAdminClient must be used within an AuthProvider")
  }
  if (!context.adminClient) {
    throw new Error(
      "useAdminClient requires an adminClient prop on AuthProvider. " +
        "Make sure you have the Better Auth admin plugin configured and pass " +
        "the admin client to AuthProvider.",
    )
  }
  return context.adminClient
}
