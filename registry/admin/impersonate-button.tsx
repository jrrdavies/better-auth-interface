"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAdminClient, useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

/** Overridable UI strings for i18n / custom copy. */
export interface ImpersonateButtonLabels {
  /** Banner text while impersonating. `name` is the impersonated user's name node. */
  impersonatingBanner?: (name: ReactNode) => ReactNode
  stop?: string
  stopping?: string
  impersonate?: (userName: string) => string
  starting?: string
}

const DEFAULT_LABELS: Required<ImpersonateButtonLabels> = {
  impersonatingBanner: (name) => (
    <>
      Impersonating <strong>{name}</strong>
    </>
  ),
  stop: "Stop",
  stopping: "Stopping...",
  impersonate: (userName) => `Impersonate ${userName}`,
  starting: "Starting...",
}

/** Props for the ImpersonateButton component */
export interface ImpersonateButtonProps {
  /** The user to impersonate */
  user: UserWithRole
  /** Callback fired when impersonation starts */
  onImpersonateStart?: (() => void) | undefined
  /** Callback fired when impersonation stops */
  onImpersonateStop?: (() => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ImpersonateButtonLabels | undefined
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
  labels,
  className,
}: ImpersonateButtonProps) {
  const authClient = useAuthClient()
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
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
          "bg-yellow-500/10 border-yellow-500 fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-4 border-b px-4 py-2 text-sm",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <span>{l.impersonatingBanner(session.data?.user.name)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleStopImpersonating()}
          disabled={loading}
        >
          {loading ? l.stopping : l.stop}
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
        {loading ? l.starting : l.impersonate(user.name)}
      </Button>
      {error && (
        <p className="text-destructive mt-1 text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
