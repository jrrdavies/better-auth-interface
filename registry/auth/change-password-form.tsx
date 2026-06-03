"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"

/** Overridable UI strings for i18n / custom copy. */
export interface ChangePasswordFormLabels {
  title?: string
  description?: string
  currentPasswordLabel?: string
  newPasswordLabel?: string
  confirmPasswordLabel?: string
  submit?: string
  submitting?: string
  successTitle?: string
  successDescription?: string
  notAuthTitle?: string
  notAuthDescription?: string
  currentRequired?: string
  newPasswordMin?: string
  confirmRequired?: string
  passwordsNoMatch?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<ChangePasswordFormLabels> = {
  title: "Change password",
  description: "Enter your current password and choose a new one",
  currentPasswordLabel: "Current password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submit: "Change password",
  submitting: "Changing password...",
  successTitle: "Password changed",
  successDescription: "Your password has been changed successfully.",
  notAuthTitle: "Not authenticated",
  notAuthDescription: "You must be signed in to change your password.",
  currentRequired: "Current password is required",
  newPasswordMin: "New password must be at least 8 characters",
  confirmRequired: "Please confirm your new password",
  passwordsNoMatch: "Passwords do not match",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the ChangePasswordForm component */
export interface ChangePasswordFormProps {
  /** Callback fired after successful password change */
  onSuccess?: (() => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ChangePasswordFormLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Change password form for authenticated users.
 * Requires current password plus new password with confirmation.
 */
export function ChangePasswordForm({ onSuccess, labels, className }: ChangePasswordFormProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const session = authClient.useSession()

  const changePasswordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, l.currentRequired),
          newPassword: z.string().min(8, l.newPasswordMin),
          confirmPassword: z.string().min(1, l.confirmRequired),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: l.passwordsNoMatch,
          path: ["confirmPassword"],
        }),
    [l],
  )

  type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  if (!session.data && !session.isPending) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>{l.notAuthTitle}</CardTitle>
          <CardDescription>{l.notAuthDescription}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null)

    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setSuccess(true)
    reset()
    onSuccess?.()
  }

  if (success) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>{l.successTitle}</CardTitle>
          <CardDescription>{l.successDescription}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>{l.title}</CardTitle>
        <CardDescription>{l.description}</CardDescription>
      </CardHeader>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-6">
        <CardContent className="space-y-4">
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
            <Label htmlFor="change-current-password">{l.currentPasswordLabel}</Label>
            <Input
              id="change-current-password"
              type="password"
              autoComplete="current-password"
              aria-describedby={
                errors.currentPassword ? "change-current-password-error" : undefined
              }
              aria-invalid={!!errors.currentPassword}
              disabled={isSubmitting}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p id="change-current-password-error" className="text-destructive text-sm">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-new-password">{l.newPasswordLabel}</Label>
            <Input
              id="change-new-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.newPassword ? "change-new-password-error" : undefined}
              aria-invalid={!!errors.newPassword}
              disabled={isSubmitting}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p id="change-new-password-error" className="text-destructive text-sm">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-confirm-password">{l.confirmPasswordLabel}</Label>
            <Input
              id="change-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword ? "change-confirm-password-error" : undefined
              }
              aria-invalid={!!errors.confirmPassword}
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="change-confirm-password-error" className="text-destructive text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? l.submitting : l.submit}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
