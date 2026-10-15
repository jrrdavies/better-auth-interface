"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError, parseRoles } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

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
  roleLabel: "Roles",
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
  /** Roles offered as checkboxes; a user can be given several */
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
 * Admin dialog for changing a user's roles.
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
  const [roles, setRoles] = useState(() => parseRoles(user.role ?? "user"))
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setServerError(null)
    setSaving(true)

    const result = await adminClient.admin.setRole({
      userId: user.id,
      role: roles,
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
      setRoles(parseRoles(user.role ?? "user"))
    }
    if (!nextOpen) {
      setServerError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {(trigger !== undefined || openProp === undefined) && (
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline">{l.triggerText}</Button>}
        </DialogTrigger>
      )}
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
          <Label id="set-role-label">{l.roleLabel}</Label>
          <div role="group" aria-labelledby="set-role-label" className="space-y-2">
            {availableRoles.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={`set-role-${r}`}
                  checked={roles.includes(r)}
                  onCheckedChange={(checked) =>
                    setRoles(checked === true ? [...roles, r] : roles.filter((x) => x !== r))
                  }
                  disabled={saving}
                />
                <Label htmlFor={`set-role-${r}`} className="cursor-pointer text-sm font-normal">
                  {r}
                </Label>
              </div>
            ))}
          </div>
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
            disabled={saving || roles.length === 0}
            aria-busy={saving}
          >
            {saving ? l.submitting : l.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
