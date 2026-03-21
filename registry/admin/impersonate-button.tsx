"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAdminClient, useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

/** Props for the ImpersonateButton component */
export interface ImpersonateButtonProps {
  /** The user to impersonate */
  user: UserWithRole
  /** Callback fired when impersonation starts */
  onImpersonateStart?: (() => void) | undefined
  /** Callback fired when impersonation stops */
  onImpersonateStop?: (() => void) | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

/**
 * Button to start impersonating a user.
 * When an impersonation session is active, shows a persistent banner
 * with a "Stop" button to end impersonation.
 */
export function ImpersonateButton({
  user,
  onImpersonateStart,
  onImpersonateStop,
  className,
}: ImpersonateButtonProps) {
  const authClient = useAuthClient()
  const adminClient = useAdminClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const session = authClient.useSession()
  const isImpersonating = !!session.data?.session.impersonatedBy

  async function handleImpersonate() {
    setError(null)
    setLoading(true)

    const result = await adminClient.admin.impersonateUser({ userId: user.id })

    if (result.error) {
      setError(getErrorMessage(result.error))
      setLoading(false)
      return
    }

    setLoading(false)
    onImpersonateStart?.()
  }

  async function handleStopImpersonating() {
    setError(null)
    setLoading(true)

    const result = await adminClient.admin.stopImpersonating()

    if (result.error) {
      setError(getErrorMessage(result.error))
      setLoading(false)
      return
    }

    setLoading(false)
    onImpersonateStop?.()
  }

  if (isImpersonating) {
    return (
      <div
        className={cn(
          "bg-warning/10 border-warning fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-4 border-b px-4 py-2 text-sm",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <span>
          Impersonating <strong>{session.data?.user.name}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleStopImpersonating()}
          disabled={loading}
        >
          {loading ? "Stopping..." : "Stop"}
        </Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    )
  }

  return (
    <div className={cn(className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleImpersonate()}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Starting..." : `Impersonate ${user.name}`}
      </Button>
      {error && (
        <p className="text-destructive mt-1 text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
