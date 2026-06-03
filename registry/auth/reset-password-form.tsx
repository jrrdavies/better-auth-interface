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
export interface ResetPasswordFormLabels {
  title?: string
  description?: string
  newPasswordLabel?: string
  confirmPasswordLabel?: string
  submit?: string
  submitting?: string
  successTitle?: string
  successDescription?: string
  invalidTitle?: string
  invalidDescription?: string
  passwordMin?: string
  confirmRequired?: string
  passwordsNoMatch?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<ResetPasswordFormLabels> = {
  title: "Reset your password",
  description: "Enter your new password below",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submit: "Reset password",
  submitting: "Resetting...",
  successTitle: "Password reset",
  successDescription:
    "Your password has been reset successfully. You can now sign in with your new password.",
  invalidTitle: "Invalid reset link",
  invalidDescription:
    "This password reset link is invalid or has expired. Please request a new one.",
  passwordMin: "Password must be at least 8 characters",
  confirmRequired: "Please confirm your password",
  passwordsNoMatch: "Passwords do not match",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the ResetPasswordForm component */
export interface ResetPasswordFormProps {
  /** Override the token from URL search params */
  token?: string | undefined
  /** Callback fired after successful password reset */
  onSuccess?: (() => void) | undefined
  /** URL to redirect to after successful password reset */
  redirectTo?: string | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ResetPasswordFormLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Reset password form. Reads the reset token from URL search params by default,
 * or accepts a token prop as an override.
 */
export function ResetPasswordForm({
  token: tokenProp,
  onSuccess,
  redirectTo,
  labels,
  className,
}: ResetPasswordFormProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Read token from URL search params if not provided as a prop
  const token =
    tokenProp ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null)

  const resetPasswordSchema = useMemo(
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

  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  if (!token) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>{l.invalidTitle}</CardTitle>
          <CardDescription>{l.invalidDescription}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)

    const result = await authClient.resetPassword({
      newPassword: values.password,
      token: token ?? undefined,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setSuccess(true)
    onSuccess?.()

    if (redirectTo && typeof window !== "undefined") {
      window.location.href = redirectTo
    }
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
            <Label htmlFor="reset-password">{l.newPasswordLabel}</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.password ? "reset-password-error" : undefined}
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p id="reset-password-error" className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">{l.confirmPasswordLabel}</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? "reset-confirm-password-error" : undefined}
              aria-invalid={!!errors.confirmPassword}
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="reset-confirm-password-error" className="text-destructive text-sm">
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
