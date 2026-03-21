"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
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
import { useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"

/** Props for the DeleteAccountDialog component */
export interface DeleteAccountDialogProps {
  /** Custom trigger element. Defaults to a destructive "Delete Account" button. */
  trigger?: ReactNode | undefined
  /** Callback fired after successful account deletion */
  onSuccess?: (() => void) | undefined
  /** If true, requires the user's current password to confirm. Otherwise requires typing "DELETE". */
  requirePassword?: boolean | undefined
  /** Additional CSS classes for the dialog content */
  className?: string | undefined
}

/**
 * Account deletion dialog with a confirmation step.
 * Requires typing "DELETE" or entering current password to confirm (prop-controlled).
 */
export function DeleteAccountDialog({
  trigger,
  onSuccess,
  requirePassword = false,
  className,
}: DeleteAccountDialogProps) {
  const authClient = useAuthClient()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = requirePassword
    ? z.object({ confirmation: z.string().min(1, "Password is required") })
    : z.object({
        confirmation: z
          .string()
          .refine((val) => val === "DELETE", { message: 'Please type "DELETE" to confirm' }),
      })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ confirmation: string }>({
    resolver: zodResolver(schema),
    defaultValues: { confirmation: "" },
  })

  async function onSubmit(values: { confirmation: string }) {
    setServerError(null)

    const result = await authClient.deleteUser(
      requirePassword ? { password: values.confirmation } : {},
    )

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please check your internet connection and try again."
        : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setOpen(false)
    reset()
    onSuccess?.()
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
      <DialogTrigger asChild>
        {trigger ?? <Button variant="destructive">Delete Account</Button>}
      </DialogTrigger>
      <DialogContent className={cn(className)}>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All your data will be deleted.
          </DialogDescription>
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
              <Label htmlFor="delete-confirmation">
                {requirePassword ? "Enter your password to confirm" : 'Type "DELETE" to confirm'}
              </Label>
              <Input
                id="delete-confirmation"
                type={requirePassword ? "password" : "text"}
                autoComplete={requirePassword ? "current-password" : "off"}
                aria-describedby={errors.confirmation ? "delete-confirmation-error" : undefined}
                aria-invalid={!!errors.confirmation}
                disabled={isSubmitting}
                {...register("confirmation")}
              />
              {errors.confirmation && (
                <p id="delete-confirmation-error" className="text-destructive text-sm">
                  {errors.confirmation.message}
                </p>
              )}
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
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
