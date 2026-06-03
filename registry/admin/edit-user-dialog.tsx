"use client"

import { useEffect, useMemo, useState } from "react"
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

/** Overridable UI strings for i18n / custom copy. */
export interface EditUserDialogLabels {
  triggerText?: string
  title?: string
  description?: (user: UserWithRole) => string
  nameLabel?: string
  emailLabel?: string
  roleLabel?: string
  cancel?: string
  submit?: string
  submitting?: string
  nameRequired?: string
  emailRequired?: string
  emailInvalid?: string
  roleRequired?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<EditUserDialogLabels> = {
  triggerText: "Edit",
  title: "Edit user",
  description: (user) => `Update user details for ${user.name}.`,
  nameLabel: "Name",
  emailLabel: "Email",
  roleLabel: "Role",
  cancel: "Cancel",
  submit: "Save changes",
  submitting: "Saving...",
  nameRequired: "Name is required",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  roleRequired: "Role is required",
  networkError: "Unable to connect. Please try again.",
}

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
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: EditUserDialogLabels | undefined
}

/**
 * Admin dialog for editing an existing user's name, email, and role.
 */
export function EditUserDialog({
  user,
  trigger,
  onSuccess,
  roles = ["user", "admin"],
  open: openProp,
  onOpenChange,
  labels,
}: EditUserDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [serverError, setServerError] = useState<string | null>(null)

  const editUserSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, l.nameRequired),
        email: z.string().min(1, l.emailRequired).email(l.emailInvalid),
        role: z.string().min(1, l.roleRequired),
      }),
    [l],
  )

  type EditUserFormValues = z.infer<typeof editUserSchema>

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
    if (isOpen) {
      reset({ name: user.name, email: user.email, role: user.role ?? "user" })
    }
  }, [isOpen, user, reset])

  async function onSubmit(values: EditUserFormValues) {
    setServerError(null)

    const result = await adminClient.admin.updateUser({
      userId: user.id,
      data: { name: values.name, email: values.email, role: values.role },
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    if (result.data) {
      setInternalOpen(false)
      onOpenChange?.(false)
      onSuccess?.(result.data.user)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      setServerError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">{l.triggerText}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.description(user)}</DialogDescription>
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
              <Label htmlFor="edit-user-name">{l.nameLabel}</Label>
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
              <Label htmlFor="edit-user-email">{l.emailLabel}</Label>
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
              <Label htmlFor="edit-user-role">{l.roleLabel}</Label>
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
