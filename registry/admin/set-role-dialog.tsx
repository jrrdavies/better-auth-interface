"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

/** Props for the SetRoleDialog component */
export interface SetRoleDialogProps {
  /** The user whose role to change */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Available roles */
  availableRoles?: string[] | undefined
  /** Callback fired after successful role change */
  onSuccess?: (() => void) | undefined
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
}

/**
 * Admin dialog for changing a user's role.
 */
export function SetRoleDialog({
  user,
  trigger,
  availableRoles = ["user", "admin"],
  onSuccess,
  open: openProp,
  onOpenChange,
}: SetRoleDialogProps) {
  const adminClient = useAdminClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [role, setRole] = useState(user.role ?? "user")
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setServerError(null)
    setSaving(true)

    const result = await adminClient.admin.setUserRole({
      userId: user.id,
      role,
    })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please try again."
        : getErrorMessage(result.error)
      setServerError(message)
      setSaving(false)
      return
    }

    setSaving(false)
    setInternalOpen(false)
    onOpenChange?.(false)
    onSuccess?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (nextOpen) {
      setRole(user.role ?? "user")
    }
    if (!nextOpen) {
      setServerError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Set Role</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set role</DialogTitle>
          <DialogDescription>
            Change the role for {user.name} ({user.email}).
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

        <div className="space-y-2 py-4">
          <Label htmlFor="set-role-select">Role</Label>
          <Select value={role} onValueChange={setRole} disabled={saving}>
            <SelectTrigger id="set-role-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Saving..." : "Save role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
