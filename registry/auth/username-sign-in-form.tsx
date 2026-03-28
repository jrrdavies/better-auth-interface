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

const usernameSignInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
})

type UsernameSignInFormValues = z.infer<typeof usernameSignInSchema>

/** Props for the UsernameSignInForm component */
export interface UsernameSignInFormProps {
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
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Username & password sign-in form.
 * Requires the Better Auth username plugin to be enabled.
 * Uses generic error messages to prevent username enumeration.
 */
export function UsernameSignInForm({
  onSuccess,
  onError,
  redirectTo,
  showSignUpLink = false,
  signUpHref = "/sign-up",
  forgotPasswordHref = "/forgot-password",
  className,
}: UsernameSignInFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UsernameSignInFormValues>({
    resolver: zodResolver(usernameSignInSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  })

  const rememberMe = watch("rememberMe")

  async function onSubmit(values: UsernameSignInFormValues) {
    setServerError(null)

    if (!authClient.signIn.username) {
      setServerError("Username sign-in is not enabled. Please enable the username plugin.")
      return
    }

    const result = await authClient.signIn.username({
      username: values.username,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: redirectTo,
    })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : "Invalid username or password"
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
        <CardDescription>
          Enter your username and password to sign in to your account
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
            <Label htmlFor="username-sign-in-username">Username</Label>
            <Input
              id="username-sign-in-username"
              type="text"
              placeholder="johndoe"
              autoComplete="username"
              aria-describedby={errors.username ? "username-sign-in-username-error" : undefined}
              aria-invalid={!!errors.username}
              disabled={isSubmitting}
              {...register("username")}
            />
            {errors.username && (
              <p id="username-sign-in-username-error" className="text-destructive text-sm">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="username-sign-in-password">Password</Label>
              <a
                href={forgotPasswordHref}
                tabIndex={-1}
                className="text-muted-foreground text-sm underline-offset-4 hover:text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="username-sign-in-password"
              type="password"
              autoComplete="current-password"
              aria-describedby={errors.password ? "username-sign-in-password-error" : undefined}
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p id="username-sign-in-password-error" className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="username-sign-in-remember"
              checked={rememberMe ?? false}
              onCheckedChange={(checked) => {
                setValue("rememberMe", checked === true)
              }}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="username-sign-in-remember"
              className="cursor-pointer text-sm font-normal"
            >
              Remember me
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
