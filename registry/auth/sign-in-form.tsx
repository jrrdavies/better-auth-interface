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
import { Checkbox } from "@/components/ui/checkbox"
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
export interface SignInFormLabels {
  title?: string
  description?: string
  emailLabel?: string
  emailPlaceholder?: string
  passwordLabel?: string
  forgotPassword?: string
  rememberMe?: string
  submit?: string
  submitting?: string
  noAccount?: string
  signUp?: string
  emailRequired?: string
  emailInvalid?: string
  passwordRequired?: string
  invalidCredentials?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<SignInFormLabels> = {
  title: "Sign in",
  description: "Enter your email and password to sign in to your account",
  emailLabel: "Email",
  emailPlaceholder: "name@example.com",
  passwordLabel: "Password",
  forgotPassword: "Forgot password?",
  rememberMe: "Remember me",
  submit: "Sign in",
  submitting: "Signing in...",
  noAccount: "Don't have an account?",
  signUp: "Sign up",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  passwordRequired: "Password is required",
  invalidCredentials: "Invalid email or password",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the SignInForm component */
export interface SignInFormProps {
  /** Callback fired after successful sign-in with the authenticated user */
  onSuccess?: ((user: User) => void) | undefined
  /** Callback fired when sign-in fails */
  onError?: ((error: Error) => void) | undefined
  /** URL to redirect to after successful sign-in */
  redirectTo?: string | undefined
  /** Whether to show a link to the sign-up page */
  showSignUpLink?: boolean | undefined
  /** URL for the sign-up page link */
  signUpHref?: string | undefined
  /** URL for the forgot password page link */
  forgotPasswordHref?: string | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: SignInFormLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Email & password sign-in form.
 * Uses generic error messages to prevent email enumeration.
 */
export function SignInForm({
  onSuccess,
  onError,
  redirectTo,
  showSignUpLink = false,
  signUpHref = "/sign-up",
  forgotPasswordHref = "/forgot-password",
  labels,
  className,
}: SignInFormProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [serverError, setServerError] = useState<string | null>(null)

  const signInSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, l.emailRequired).email(l.emailInvalid),
        password: z.string().min(1, l.passwordRequired),
        rememberMe: z.boolean().optional(),
      }),
    [l],
  )

  type SignInFormValues = z.infer<typeof signInSchema>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const rememberMe = watch("rememberMe")

  async function onSubmit(values: SignInFormValues) {
    setServerError(null)

    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: redirectTo,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : l.invalidCredentials
      setServerError(message)
      onError?.(new Error(getErrorMessage(result.error)))
      return
    }

    if (result.data) {
      onSuccess?.(result.data.user)
    }
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
            <Label htmlFor="sign-in-email">{l.emailLabel}</Label>
            <Input
              id="sign-in-email"
              type="email"
              placeholder={l.emailPlaceholder}
              autoComplete="email"
              aria-describedby={errors.email ? "sign-in-email-error" : undefined}
              aria-invalid={!!errors.email}
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email && (
              <p id="sign-in-email-error" className="text-destructive text-sm">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sign-in-password">{l.passwordLabel}</Label>
              <a
                href={forgotPasswordHref}
                tabIndex={-1}
                className="text-muted-foreground text-sm underline-offset-4 hover:text-primary hover:underline"
              >
                {l.forgotPassword}
              </a>
            </div>
            <Input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              aria-describedby={errors.password ? "sign-in-password-error" : undefined}
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p id="sign-in-password-error" className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sign-in-remember"
              checked={rememberMe ?? false}
              onCheckedChange={(checked) => {
                setValue("rememberMe", checked === true)
              }}
              disabled={isSubmitting}
            />
            <Label htmlFor="sign-in-remember" className="cursor-pointer text-sm font-normal">
              {l.rememberMe}
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? l.submitting : l.submit}
          </Button>

          {showSignUpLink && (
            <p className="text-muted-foreground text-center text-sm">
              {l.noAccount}{" "}
              <a href={signUpHref} className="text-primary underline-offset-4 hover:underline">
                {l.signUp}
              </a>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
