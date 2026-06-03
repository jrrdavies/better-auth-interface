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
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { User } from "@/registry/lib/types"

/** Overridable UI strings for i18n / custom copy. */
export interface SignUpFormLabels {
  title?: string
  description?: string
  nameLabel?: string
  namePlaceholder?: string
  emailLabel?: string
  emailPlaceholder?: string
  passwordLabel?: string
  confirmPasswordLabel?: string
  submit?: string
  submitting?: string
  haveAccount?: string
  signIn?: string
  verifyTitle?: string
  verifyDescription?: string
  nameRequired?: string
  emailRequired?: string
  emailInvalid?: string
  passwordMin?: string
  confirmRequired?: string
  passwordsNoMatch?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<SignUpFormLabels> = {
  title: "Create an account",
  description: "Enter your details to create a new account",
  nameLabel: "Name",
  namePlaceholder: "John Doe",
  emailLabel: "Email",
  emailPlaceholder: "name@example.com",
  passwordLabel: "Password",
  confirmPasswordLabel: "Confirm password",
  submit: "Create account",
  submitting: "Creating account...",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  verifyTitle: "Check your email",
  verifyDescription:
    "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.",
  nameRequired: "Name is required",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  passwordMin: "Password must be at least 8 characters",
  confirmRequired: "Please confirm your password",
  passwordsNoMatch: "Passwords do not match",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the SignUpForm component */
export interface SignUpFormProps {
  /** Callback fired after successful sign-up */
  onSuccess?: ((user: User) => void) | undefined
  /** Whether the user must verify their email before signing in */
  requireEmailVerification?: boolean | undefined
  /** URL to redirect to after successful sign-up */
  redirectTo?: string | undefined
  /** Whether to show a link to the sign-in page */
  showSignInLink?: boolean | undefined
  /** URL for the sign-in page link */
  signInHref?: string | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: SignUpFormLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Email & password sign-up form with name, email, password, and confirmation.
 */
export function SignUpForm({
  onSuccess,
  requireEmailVerification = false,
  redirectTo,
  showSignInLink = false,
  signInHref = "/sign-in",
  labels,
  className,
}: SignUpFormProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const signUpSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, l.nameRequired),
          email: z.string().min(1, l.emailRequired).email(l.emailInvalid),
          password: z.string().min(8, l.passwordMin),
          confirmPassword: z.string().min(1, l.confirmRequired),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: l.passwordsNoMatch,
          path: ["confirmPassword"],
        }),
    [l],
  )

  type SignUpFormValues = z.infer<typeof signUpSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: SignUpFormValues) {
    setServerError(null)

    const result = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: redirectTo,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    if (result.data) {
      if (requireEmailVerification) {
        setEmailSent(true)
      }
      onSuccess?.(result.data.user)
    }
  }

  if (emailSent) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>{l.verifyTitle}</CardTitle>
          <CardDescription>{l.verifyDescription}</CardDescription>
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
            <Label htmlFor="sign-up-name">{l.nameLabel}</Label>
            <Input
              id="sign-up-name"
              type="text"
              placeholder={l.namePlaceholder}
              autoComplete="name"
              aria-describedby={errors.name ? "sign-up-name-error" : undefined}
              aria-invalid={!!errors.name}
              disabled={isSubmitting}
              {...register("name")}
            />
            {errors.name && (
              <p id="sign-up-name-error" className="text-destructive text-sm">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-email">{l.emailLabel}</Label>
            <Input
              id="sign-up-email"
              type="email"
              placeholder={l.emailPlaceholder}
              autoComplete="email"
              aria-describedby={errors.email ? "sign-up-email-error" : undefined}
              aria-invalid={!!errors.email}
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email && (
              <p id="sign-up-email-error" className="text-destructive text-sm">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-password">{l.passwordLabel}</Label>
            <Input
              id="sign-up-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.password ? "sign-up-password-error" : undefined}
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p id="sign-up-password-error" className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-confirm-password">{l.confirmPasswordLabel}</Label>
            <Input
              id="sign-up-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword ? "sign-up-confirm-password-error" : undefined
              }
              aria-invalid={!!errors.confirmPassword}
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="sign-up-confirm-password-error" className="text-destructive text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? l.submitting : l.submit}
          </Button>

          {showSignInLink && (
            <p className="text-muted-foreground text-center text-sm">
              {l.haveAccount}{" "}
              <a href={signInHref} className="text-primary underline-offset-4 hover:underline">
                {l.signIn}
              </a>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
