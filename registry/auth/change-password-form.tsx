"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

/** Props for the ChangePasswordForm component */
export interface ChangePasswordFormProps {
  /** Callback fired after successful password change */
  onSuccess?: (() => void) | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Change password form for authenticated users.
 * Requires current password plus new password with confirmation.
 */
export function ChangePasswordForm({ onSuccess, className }: ChangePasswordFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const session = authClient.useSession()

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
          <CardTitle>Not authenticated</CardTitle>
          <CardDescription>You must be signed in to change your password.</CardDescription>
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
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : getErrorMessage(result.error)
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
          <CardTitle>Password changed</CardTitle>
          <CardDescription>Your password has been changed successfully.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Enter your current password and choose a new one</CardDescription>
      </CardHeader>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
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
            <Label htmlFor="change-current-password">Current password</Label>
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
            <Label htmlFor="change-new-password">New password</Label>
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
            <Label htmlFor="change-confirm-password">Confirm new password</Label>
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
            {isSubmitting ? "Changing password..." : "Change password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
