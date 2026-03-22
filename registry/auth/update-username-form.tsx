"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
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

const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    ),
})

type UpdateUsernameFormValues = z.infer<typeof updateUsernameSchema>

/** Props for the UpdateUsernameForm component */
export interface UpdateUsernameFormProps {
  /** Callback fired after successful username update */
  onSuccess?: (() => void) | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Update username form for authenticated users.
 * Pre-fills with the current username and checks availability in real-time.
 * Requires the Better Auth username plugin to be enabled.
 */
export function UpdateUsernameForm({ onSuccess, className }: UpdateUsernameFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const session = authClient.useSession()
  const currentUsername = (session.data?.user as Record<string, unknown> | undefined)?.username as
    | string
    | undefined

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUsernameFormValues>({
    resolver: zodResolver(updateUsernameSchema),
    defaultValues: { username: "" },
  })

  // Pre-fill when session loads
  useEffect(() => {
    if (currentUsername) {
      reset({ username: currentUsername })
    }
  }, [currentUsername, reset])

  const username = watch("username")

  const checkAvailability = useCallback(
    async (value: string) => {
      if (!authClient.isUsernameAvailable) return
      if (!value || value.length < 3 || value === currentUsername) {
        setAvailability("idle")
        return
      }

      setAvailability("checking")
      const result = await authClient.isUsernameAvailable({ username: value })
      if (result.data) {
        setAvailability(result.data.available ? "available" : "taken")
      } else {
        setAvailability("idle")
      }
    },
    [authClient, currentUsername],
  )

  // Debounced availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!username || username === currentUsername || username.length < 3) {
      setAvailability("idle")
      return
    }

    // Validate format before checking
    const isValidFormat = /^[a-zA-Z0-9_-]+$/.test(username)
    if (!isValidFormat) {
      setAvailability("idle")
      return
    }

    debounceRef.current = setTimeout(() => {
      void checkAvailability(username)
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username, currentUsername, checkAvailability])

  if (!session.data && !session.isPending) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>Not authenticated</CardTitle>
          <CardDescription>You must be signed in to update your username.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function onSubmit(values: UpdateUsernameFormValues) {
    setServerError(null)
    setSuccess(false)

    if (values.username === currentUsername) {
      setSuccess(true)
      onSuccess?.()
      return
    }

    if (availability === "taken") {
      setServerError("This username is already taken.")
      return
    }

    const result = await authClient.updateUser({
      username: values.username,
    })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setSuccess(true)
    setAvailability("idle")
    onSuccess?.()
  }

  const isUnchanged = username === currentUsername

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Change username</CardTitle>
        <CardDescription>Choose a new username for your account</CardDescription>
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

          {success && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400"
            >
              Username updated successfully.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="update-username">Username</Label>
            <div className="relative">
              <Input
                id="update-username"
                type="text"
                autoComplete="username"
                aria-describedby={
                  errors.username
                    ? "update-username-error"
                    : availability !== "idle"
                      ? "update-username-availability"
                      : undefined
                }
                aria-invalid={!!errors.username || availability === "taken"}
                disabled={isSubmitting || session.isPending}
                {...register("username")}
              />
              {!errors.username && !isUnchanged && (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  {availability === "checking" && (
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  )}
                  {availability === "available" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {availability === "taken" && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              )}
            </div>
            {errors.username && (
              <p id="update-username-error" className="text-destructive text-sm">
                {errors.username.message}
              </p>
            )}
            {!errors.username && availability === "taken" && (
              <p id="update-username-availability" className="text-destructive text-sm">
                This username is already taken.
              </p>
            )}
            {!errors.username && availability === "available" && (
              <p
                id="update-username-availability"
                className="text-sm text-green-600 dark:text-green-400"
              >
                Username is available.
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || session.isPending || availability === "taken" || isUnchanged}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save username"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
