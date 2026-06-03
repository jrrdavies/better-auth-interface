"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

/** Overridable UI strings for i18n / custom copy. */
export interface SetPasswordDialogLabels {
  triggerText?: string
  title?: string
  description?: (user: UserWithRole) => string
  passwordLabel?: string
  confirmPasswordLabel?: string
  cancel?: string
  submit?: string
  submitting?: string
  passwordMin?: string
  confirmRequired?: string
  passwordsNoMatch?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<SetPasswordDialogLabels> = {
  triggerText: "Set Password",
  title: "Set password",
  description: (user) => `Set a new password for ${user.name} (${user.email}).`,
  passwordLabel: "New password",
  confirmPasswordLabel: "Confirm password",
  cancel: "Cancel",
  submit: "Set password",
  submitting: "Setting password...",
  passwordMin: "Password must be at least 8 characters",
  confirmRequired: "Please confirm the password",
  passwordsNoMatch: "Passwords do not match",
  networkError: "Unable to connect. Please try again.",
}

/** Props for the SetPasswordDialog component */
export interface SetPasswordDialogProps {
  /** The user whose password to set */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful password change */
  onSuccess?: (() => void) | undefined
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: SetPasswordDialogLabels | undefined
}

/**
 * Admin dialog for setting a user's password.
 */
export function SetPasswordDialog({
  user,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
  labels,
}: SetPasswordDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [serverError, setServerError] = useState<string | null>(null)

  const setPasswordSchema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, l.passwordMin),
          confirmPassword: z.string().min(1, l.confirmRequired),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: l.passwordsNoMatch,
          path: ["confirmPassword"],
        }),
    [l],
  )

  type SetPasswordFormValues = z.infer<typeof setPasswordSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(values: SetPasswordFormValues) {
    setServerError(null)

    const result = await adminClient.admin.setUserPassword({
      userId: user.id,
      newPassword: values.password,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setInternalOpen(false)
    onOpenChange?.(false)
    reset()
    onSuccess?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      reset()
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

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="space-y-4 py-4">
            {serverError && (
              <div
                role="alert"
                aria-live="polite"
                className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              >
                {serverError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-set-password">{l.passwordLabel}</Label>
              <Input
                id="admin-set-password"
                type="password"
                autoComplete="new-password"
                aria-describedby={errors.password ? "admin-set-password-error" : undefined}
                aria-invalid={!!errors.password}
                disabled={isSubmitting}
                {...register("password")}
              />
              {errors.password && (
                <p id="admin-set-password-error" className="text-destructive text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-set-confirm-password">{l.confirmPasswordLabel}</Label>
              <Input
                id="admin-set-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-describedby={
                  errors.confirmPassword ? "admin-set-confirm-password-error" : undefined
                }
                aria-invalid={!!errors.confirmPassword}
                disabled={isSubmitting}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p id="admin-set-confirm-password-error" className="text-destructive text-sm">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {l.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? l.submitting : l.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
