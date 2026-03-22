"use client"

import { useEffect, useState } from "react"
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

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().url("Please enter a valid URL").or(z.literal("")),
})

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>

/** Props for the UpdateProfileForm component */
export interface UpdateProfileFormProps {
  /** Callback fired after successful profile update */
  onSuccess?: ((user: User) => void) | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

/**
 * Update profile form for authenticated users.
 * Pre-fills with the current user's display name and avatar URL.
 */
export function UpdateProfileForm({ onSuccess, className }: UpdateProfileFormProps) {
  const authClient = useAuthClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const session = authClient.useSession()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "", image: "" },
  })

  // Pre-fill form when session loads
  const userName = session.data?.user?.name
  const userImage = session.data?.user?.image
  useEffect(() => {
    if (userName != null) {
      reset({
        name: userName,
        image: userImage ?? "",
      })
    }
  }, [userName, userImage, reset])

  if (!session.data && !session.isPending) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>Not authenticated</CardTitle>
          <CardDescription>You must be signed in to update your profile.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function onSubmit(values: UpdateProfileFormValues) {
    setServerError(null)
    setSuccess(false)

    const result = await authClient.updateUser({
      name: values.name,
      image: values.image || null,
    })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setSuccess(true)
    if (session.data?.user) {
      onSuccess?.({
        ...session.data.user,
        name: values.name,
        image: values.image || null,
      })
    }
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Update profile</CardTitle>
        <CardDescription>Update your display name and avatar</CardDescription>
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
              Profile updated successfully.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              type="text"
              autoComplete="name"
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              aria-invalid={!!errors.name}
              disabled={isSubmitting || session.isPending}
              {...register("name")}
            />
            {errors.name && (
              <p id="profile-name-error" className="text-destructive text-sm">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-image">Avatar URL</Label>
            <Input
              id="profile-image"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              aria-describedby={errors.image ? "profile-image-error" : undefined}
              aria-invalid={!!errors.image}
              disabled={isSubmitting || session.isPending}
              {...register("image")}
            />
            {errors.image && (
              <p id="profile-image-error" className="text-destructive text-sm">
                {errors.image.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || session.isPending}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
