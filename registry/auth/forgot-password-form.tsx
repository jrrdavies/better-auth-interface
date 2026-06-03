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
import { isNetworkError } from "@/registry/lib/utils"

/** Overridable UI strings for i18n / custom copy. */
export interface ForgotPasswordFormLabels {
  title?: string
  description?: string
  emailLabel?: string
  emailPlaceholder?: string
  submit?: string
  submitting?: string
  submittedTitle?: string
  submittedDescription?: string
  emailRequired?: string
  emailInvalid?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<ForgotPasswordFormLabels> = {
  title: "Forgot your password?",
  description: "Enter your email address and we'll send you a link to reset your password.",
  emailLabel: "Email",
  emailPlaceholder: "name@example.com",
  submit: "Send reset link",
  submitting: "Sending...",
  submittedTitle: "Check your email",
  submittedDescription:
    "If an account exists with that email address, we've sent a password reset link. Please check your inbox and spam folder.",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the ForgotPasswordForm component */
export interface ForgotPasswordFormProps {
  /** Callback fired after the request is submitted (regardless of whether the email exists) */
  onSuccess?: (() => void) | undefined
  /** Callback URL included in the reset email — the page where reset-password-form is rendered */
  redirectTo?: string | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ForgotPasswordFormLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Forgot password form. Always shows the same success message regardless of
 * whether the email exists to prevent email enumeration.
 */
export function ForgotPasswordForm({
  onSuccess,
  redirectTo,
  labels,
  className,
}: ForgotPasswordFormProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const forgotPasswordSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, l.emailRequired).email(l.emailInvalid),
      }),
    [l],
  )

  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

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
      setServerError(l.networkError)
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
          <CardTitle>{l.submittedTitle}</CardTitle>
          <CardDescription>{l.submittedDescription}</CardDescription>
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
            <Label htmlFor="forgot-email">{l.emailLabel}</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder={l.emailPlaceholder}
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
            {isSubmitting ? l.submitting : l.submit}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
