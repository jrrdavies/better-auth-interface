"use client"

import { useState } from "react"
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

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

/** Props for the CreateUserDialog component */
export interface CreateUserDialogProps {
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful user creation */
  onSuccess?: ((user: UserWithRole) => void) | undefined
  /** Available roles for the role select */
  roles?: string[] | undefined
}

/**
 * Admin dialog for creating a new user.
 */
export function CreateUserDialog({
  trigger,
  onSuccess,
  roles = ["user", "admin"],
}: CreateUserDialogProps) {
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
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: roles[0] ?? "user" },
  })

  const selectedRole = watch("role")

  async function onSubmit(values: CreateUserFormValues) {
    setServerError(null)

    const result = await adminClient.admin.createUser({
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
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
      reset()
      onSuccess?.(result.data.user)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      setServerError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button>Create User</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Add a new user to the system.</DialogDescription>
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
              <Label htmlFor="create-user-name">Name</Label>
              <Input
                id="create-user-name"
                aria-describedby={errors.name ? "create-user-name-error" : undefined}
                aria-invalid={!!errors.name}
                disabled={isSubmitting}
                {...register("name")}
              />
              {errors.name && (
                <p id="create-user-name-error" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                aria-describedby={errors.email ? "create-user-email-error" : undefined}
                aria-invalid={!!errors.email}
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p id="create-user-email-error" className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-password">Password</Label>
              <Input
                id="create-user-password"
                type="password"
                autoComplete="new-password"
                aria-describedby={errors.password ? "create-user-password-error" : undefined}
                aria-invalid={!!errors.password}
                disabled={isSubmitting}
                {...register("password")}
              />
              {errors.password && (
                <p id="create-user-password-error" className="text-destructive text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue("role", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="create-user-role">
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
              {isSubmitting ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
