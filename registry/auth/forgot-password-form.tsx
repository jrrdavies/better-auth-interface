"use client"

import { useState } from "react"
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
import { isNetworkError } from "@/registry/lib/utils"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

/** Props for the ForgotPasswordForm component */
export interface ForgotPasswordFormProps {
  /** Callback fired after the request is submitted (regardless of whether the email exists) */
  onSuccess?: (() => void) | undefined
  /** Callback URL included in the reset email — the page where reset-password-form is rendered */
  redirectTo?: string | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Forgot password form. Always shows the same success message regardless of
 * whether the email exists to prevent email enumeration.
 */
export function ForgotPasswordForm({ onSuccess, redirectTo, className }: ForgotPasswordFormProps) {
  const authClient = useAuthClient()
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null)

    const result = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo,
    })

    if (result.error && isNetworkError(result.error)) {
      setServerError("Unable to connect. Please check your internet connection and try again.")
      return
    }

    // Always show success to prevent email enumeration
    setSubmitted(true)
    onSuccess?.()
  }

  if (submitted) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists with that email address, we&apos;ve sent a password reset link.
            Please check your inbox and spam folder.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
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
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              aria-describedby={errors.email ? "forgot-email-error" : undefined}
              aria-invalid={!!errors.email}
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email && (
              <p id="forgot-email-error" className="text-destructive text-sm">
                {errors.email.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
