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
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { User } from "@/registry/lib/types"

const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

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
  className,
}: SignUpFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

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
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : getErrorMessage(result.error)
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
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to your email address. Please check your inbox and
            click the link to verify your account.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to create a new account</CardDescription>
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
            <Label htmlFor="sign-up-name">Name</Label>
            <Input
              id="sign-up-name"
              type="text"
              placeholder="John Doe"
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
            <Label htmlFor="sign-up-email">Email</Label>
            <Input
              id="sign-up-email"
              type="email"
              placeholder="name@example.com"
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
            <Label htmlFor="sign-up-password">Password</Label>
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
            <Label htmlFor="sign-up-confirm-password">Confirm password</Label>
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          {showSignInLink && (
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <a href={signInHref} className="text-primary underline-offset-4 hover:underline">
                Sign in
              </a>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
