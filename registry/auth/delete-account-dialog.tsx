"use client"

import { useMemo, useState } from "react"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"

/** Overridable UI strings for i18n / custom copy. */
export interface DeleteAccountDialogLabels {
  triggerText?: string
  title?: string
  description?: string
  passwordPrompt?: string
  /** Prompt for the type-to-confirm flow. `{keyword}` is replaced with `confirmationKeyword`. */
  typeToConfirmPrompt?: string
  cancel?: string
  submit?: string
  submitting?: string
  passwordRequired?: string
  /** Error for the type-to-confirm flow. `{keyword}` is replaced with `confirmationKeyword`. */
  typeToConfirmError?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<DeleteAccountDialogLabels> = {
  triggerText: "Delete Account",
  title: "Delete your account",
  description: "This action is permanent and cannot be undone. All your data will be deleted.",
  passwordPrompt: "Enter your password to confirm",
  typeToConfirmPrompt: 'Type "{keyword}" to confirm',
  cancel: "Cancel",
  submit: "Delete account",
  submitting: "Deleting...",
  passwordRequired: "Password is required",
  typeToConfirmError: 'Please type "{keyword}" to confirm',
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the DeleteAccountDialog component */
export interface DeleteAccountDialogProps {
  /** Custom trigger element. Defaults to a destructive button using `labels.triggerText`. */
  trigger?: ReactNode | undefined
  /** Callback fired after successful account deletion */
  onSuccess?: (() => void) | undefined
  /** If true, requires the user's current password to confirm. Otherwise requires typing the keyword. */
  requirePassword?: boolean | undefined
  /** Word the user must type to confirm (type-to-confirm flow). Defaults to "DELETE". */
  confirmationKeyword?: string | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: DeleteAccountDialogLabels | undefined
  /** Additional CSS classes for the dialog content */
  className?: string | undefined
}

/**
 * Account deletion dialog with a confirmation step.
 * Requires typing a keyword or entering the current password to confirm (prop-controlled).
 */
export function DeleteAccountDialog({
  trigger,
  onSuccess,
  requirePassword = false,
  confirmationKeyword = "DELETE",
  labels,
  className,
}: DeleteAccountDialogProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      requirePassword
        ? z.object({ confirmation: z.string().min(1, l.passwordRequired) })
        : z.object({
            confirmation: z.string().refine((val) => val === confirmationKeyword, {
              message: l.typeToConfirmError.replace("{keyword}", confirmationKeyword),
            }),
          }),
    [requirePassword, confirmationKeyword, l],
  )

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
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
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
        {trigger ?? <Button variant="destructive">{l.triggerText}</Button>}
      </DialogTrigger>
      <DialogContent className={cn(className)}>
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
              <Label htmlFor="delete-confirmation">
                {requirePassword
                  ? l.passwordPrompt
                  : l.typeToConfirmPrompt.replace("{keyword}", confirmationKeyword)}
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
              {l.cancel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? l.submitting : l.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
