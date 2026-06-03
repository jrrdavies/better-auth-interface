"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

/** Overridable UI strings for i18n / custom copy. */
export interface DeleteUserDialogLabels {
  triggerText?: string
  title?: string
  description?: (user: UserWithRole) => string
  cancel?: string
  submit?: string
  submitting?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<DeleteUserDialogLabels> = {
  triggerText: "Delete",
  title: "Delete user",
  description: (user) =>
    `Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`,
  cancel: "Cancel",
  submit: "Delete user",
  submitting: "Deleting...",
  networkError: "Unable to connect. Please try again.",
}

/** Props for the DeleteUserDialog component */
export interface DeleteUserDialogProps {
  /** The user to delete */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful user deletion */
  onSuccess?: (() => void) | undefined
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: DeleteUserDialogLabels | undefined
}

/**
 * Admin confirmation dialog for deleting a user.
 */
export function DeleteUserDialog({
  user,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
  labels,
}: DeleteUserDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setServerError(null)
    setDeleting(true)

    const result = await adminClient.admin.removeUser({ userId: user.id })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      setDeleting(false)
      return
    }

    setDeleting(false)
    setInternalOpen(false)
    onOpenChange?.(false)
    onSuccess?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      setServerError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="destructive">{l.triggerText}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.description(user)}</DialogDescription>
        </DialogHeader>

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          >
            {serverError}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            {l.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-busy={deleting}
          >
            {deleting ? l.submitting : l.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
