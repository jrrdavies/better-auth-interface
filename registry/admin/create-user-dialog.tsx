"use client"

import { useMemo, useState } from "react"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

/** Overridable UI strings for i18n / custom copy. */
export interface CreateUserDialogLabels {
  triggerText?: string
  title?: string
  description?: string
  nameLabel?: string
  emailLabel?: string
  passwordLabel?: string
  roleLabel?: string
  cancel?: string
  submit?: string
  submitting?: string
  nameRequired?: string
  emailRequired?: string
  emailInvalid?: string
  passwordMin?: string
  roleRequired?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<CreateUserDialogLabels> = {
  triggerText: "Create User",
  title: "Create user",
  description: "Add a new user to the system.",
  nameLabel: "Name",
  emailLabel: "Email",
  passwordLabel: "Password",
  roleLabel: "Role",
  cancel: "Cancel",
  submit: "Create user",
  submitting: "Creating...",
  nameRequired: "Name is required",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  passwordMin: "Password must be at least 8 characters",
  roleRequired: "Role is required",
  networkError: "Unable to connect. Please try again.",
}

/** Props for the CreateUserDialog component */
export interface CreateUserDialogProps {
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful user creation */
  onSuccess?: ((user: UserWithRole) => void) | undefined
  /** Available roles for the role select */
  roles?: string[] | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: CreateUserDialogLabels | undefined
}

/**
 * Admin dialog for creating a new user.
 */
export function CreateUserDialog({
  trigger,
  onSuccess,
  roles = ["user", "admin"],
  labels,
}: CreateUserDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const createUserSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, l.nameRequired),
        email: z.string().min(1, l.emailRequired).email(l.emailInvalid),
        password: z.string().min(8, l.passwordMin),
        role: z.string().min(1, l.roleRequired),
      }),
    [l],
  )

  type CreateUserFormValues = z.infer<typeof createUserSchema>

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
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
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
      <DialogTrigger asChild>{trigger ?? <Button>{l.triggerText}</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
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
              <Label htmlFor="create-user-name">{l.nameLabel}</Label>
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
              <Label htmlFor="create-user-email">{l.emailLabel}</Label>
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
              <Label htmlFor="create-user-password">{l.passwordLabel}</Label>
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
              <Label htmlFor="create-user-role">{l.roleLabel}</Label>
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
              {l.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? l.submitting : l.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
