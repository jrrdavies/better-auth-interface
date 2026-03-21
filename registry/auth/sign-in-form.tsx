"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
})

type SignInFormValues = z.infer<typeof signInSchema>

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
  className,
}: SignInFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)

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
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : "Invalid email or password"
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
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email and password to sign in to your account</CardDescription>
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
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              type="email"
              placeholder="name@example.com"
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
            <Label htmlFor="sign-in-password">Password</Label>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sign-in-remember"
              checked={rememberMe ?? false}
              onCheckedChange={(checked) => {
                setValue("rememberMe", checked === true)
              }}
              disabled={isSubmitting}
            />
            <Label htmlFor="sign-in-remember" className="cursor-pointer text-sm font-normal">
              Remember me
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          {showSignUpLink && (
            <p className="text-muted-foreground text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href={signUpHref} className="text-primary underline-offset-4 hover:underline">
                Sign up
              </a>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
