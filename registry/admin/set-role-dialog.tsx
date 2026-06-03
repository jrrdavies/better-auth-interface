"use client"

import { useMemo, useState } from "react"
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

/** Overridable UI strings for i18n / custom copy. */
export interface SetRoleDialogLabels {
  triggerText?: string
  title?: string
  description?: (user: UserWithRole) => string
  roleLabel?: string
  cancel?: string
  submit?: string
  submitting?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<SetRoleDialogLabels> = {
  triggerText: "Set Role",
  title: "Set role",
  description: (user) => `Change the role for ${user.name} (${user.email}).`,
  roleLabel: "Role",
  cancel: "Cancel",
  submit: "Save role",
  submitting: "Saving...",
  networkError: "Unable to connect. Please try again.",
}

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
  /** Overridable UI strings for i18n / custom copy */
  labels?: SetRoleDialogLabels | undefined
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
  labels,
}: SetRoleDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [role, setRole] = useState(user.role ?? "user")
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setServerError(null)
    setSaving(true)

    const result = await adminClient.admin.setRole({
      userId: user.id,
      role,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
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
        {trigger ?? <Button variant="outline">{l.triggerText}</Button>}
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

        <div className="space-y-2 py-4">
          <Label htmlFor="set-role-select">{l.roleLabel}</Label>
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
            {l.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? l.submitting : l.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
