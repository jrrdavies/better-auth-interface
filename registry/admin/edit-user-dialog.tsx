"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  role: z.string().min(1, "Role is required"),
})

type EditUserFormValues = z.infer<typeof editUserSchema>

/** Props for the EditUserDialog component */
export interface EditUserDialogProps {
  /** The user to edit */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful user update */
  onSuccess?: ((user: UserWithRole) => void) | undefined
  /** Available roles for the role select */
  roles?: string[] | undefined
}

/**
 * Admin dialog for editing an existing user's name, email, and role.
 */
export function EditUserDialog({
  user,
  trigger,
  onSuccess,
  roles = ["user", "admin"],
}: EditUserDialogProps) {
  const adminClient = useAdminClient()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role ?? "user" },
  })

  const selectedRole = watch("role")

  useEffect(() => {
    if (open) {
      reset({ name: user.name, email: user.email, role: user.role ?? "user" })
    }
  }, [open, user, reset])

  async function onSubmit(values: EditUserFormValues) {
    setServerError(null)

    const result = await adminClient.admin.updateUser({
      userId: user.id,
      data: { name: values.name, email: values.email, role: values.role },
    })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please try again."
        : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    if (result.data) {
      setOpen(false)
      onSuccess?.(result.data.user)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setServerError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline">Edit</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update user details for {user.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="space-y-4 py-4">
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
              <Label htmlFor="edit-user-name">Name</Label>
              <Input
                id="edit-user-name"
                aria-describedby={errors.name ? "edit-user-name-error" : undefined}
                aria-invalid={!!errors.name}
                disabled={isSubmitting}
                {...register("name")}
              />
              {errors.name && (
                <p id="edit-user-name-error" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                aria-describedby={errors.email ? "edit-user-email-error" : undefined}
                aria-invalid={!!errors.email}
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p id="edit-user-email-error" className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue("role", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
