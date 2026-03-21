"use client"

import { useState } from "react"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

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
}: DeleteUserDialogProps) {
  const adminClient = useAdminClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setServerError(null)
    setDeleting(true)

    const result = await adminClient.admin.deleteUser({ userId: user.id })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please try again."
        : getErrorMessage(result.error)
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
        {trigger ?? <Button variant="destructive">Delete</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user.name} ({user.email})? This action cannot be
            undone.
          </DialogDescription>
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
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-busy={deleting}
          >
            {deleting ? "Deleting..." : "Delete user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
