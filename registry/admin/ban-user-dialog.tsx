"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

const banUserSchema = z.object({
  banReason: z.string().optional(),
  banExpiresInDays: z.string().optional(),
  permanent: z.boolean().optional(),
})

interface BanUserFormValues {
  banReason?: string | undefined
  banExpiresInDays?: string | undefined
  permanent?: boolean | undefined
}

/** Overridable UI strings for i18n / custom copy. */
export interface BanUserDialogLabels {
  banTrigger?: string
  unbanTrigger?: string
  banTitle?: string
  unbanTitle?: string
  banDescription?: (user: UserWithRole) => string
  unbanDescription?: (user: UserWithRole) => string
  banReasonLabel?: string
  banReasonPlaceholder?: string
  permanentLabel?: string
  durationLabel?: string
  cancel?: string
  banSubmit?: string
  banSubmitting?: string
  unbanSubmit?: string
  unbanSubmitting?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<BanUserDialogLabels> = {
  banTrigger: "Ban",
  unbanTrigger: "Unban",
  banTitle: "Ban user",
  unbanTitle: "Unban user",
  banDescription: (user) => `Ban ${user.name} (${user.email}) from the platform.`,
  unbanDescription: (user) => `Remove the ban on ${user.name} (${user.email}).`,
  banReasonLabel: "Ban reason",
  banReasonPlaceholder: "Reason for ban (optional)",
  permanentLabel: "Permanent ban",
  durationLabel: "Ban duration (days)",
  cancel: "Cancel",
  banSubmit: "Ban user",
  banSubmitting: "Banning...",
  unbanSubmit: "Unban user",
  unbanSubmitting: "Unbanning...",
  networkError: "Unable to connect. Please try again.",
}

/** Props for the BanUserDialog component */
export interface BanUserDialogProps {
  /** The user to ban or unban */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful ban/unban */
  onSuccess?: (() => void) | undefined
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: BanUserDialogLabels | undefined
}

/**
 * Admin dialog for banning or unbanning a user.
 * Shows ban form if user is not banned, unban option if already banned.
 */
export function BanUserDialog({
  user,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
  labels,
}: BanUserDialogProps) {
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  const [serverError, setServerError] = useState<string | null>(null)
  const [unbanning, setUnbanning] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BanUserFormValues>({
    resolver: zodResolver(banUserSchema),
    defaultValues: { banReason: "", banExpiresInDays: undefined, permanent: true },
  })

  const permanent = watch("permanent")

  async function onBan(values: BanUserFormValues) {
    setServerError(null)

    const days = values.banExpiresInDays ? parseInt(values.banExpiresInDays, 10) : 0
    const banExpiresIn = values.permanent || !days ? undefined : days * 24 * 60 * 60

    const result = await adminClient.admin.banUser({
      userId: user.id,
      banReason: values.banReason || undefined,
      banExpiresIn,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setInternalOpen(false)
    onOpenChange?.(false)
    reset()
    onSuccess?.()
  }

  async function onUnban() {
    setServerError(null)
    setUnbanning(true)

    const result = await adminClient.admin.unbanUser({ userId: user.id })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      setUnbanning(false)
      return
    }

    setUnbanning(false)
    setInternalOpen(false)
    onOpenChange?.(false)
    onSuccess?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      reset()
      setServerError(null)
    }
  }

  const isBanned = !!user.banned

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isBanned ? "outline" : "destructive"}>
            {isBanned ? l.unbanTrigger : l.banTrigger}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBanned ? l.unbanTitle : l.banTitle}</DialogTitle>
          <DialogDescription>
            {isBanned ? l.unbanDescription(user) : l.banDescription(user)}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          >
            {serverError}
          </div>
        )}

        {isBanned ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={unbanning}
            >
              {l.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => void onUnban()}
              disabled={unbanning}
              aria-busy={unbanning}
            >
              {unbanning ? l.unbanSubmitting : l.unbanSubmit}
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={(e) => void handleSubmit(onBan)(e)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ban-reason">{l.banReasonLabel}</Label>
                <Textarea
                  id="ban-reason"
                  placeholder={l.banReasonPlaceholder}
                  disabled={isSubmitting}
                  {...register("banReason")}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ban-permanent"
                  checked={permanent ?? false}
                  onCheckedChange={(checked) => {
                    setValue("permanent", checked === true)
                  }}
                  disabled={isSubmitting}
                />
                <Label htmlFor="ban-permanent" className="cursor-pointer text-sm font-normal">
                  {l.permanentLabel}
                </Label>
              </div>

              {!permanent && (
                <div className="space-y-2">
                  <Label htmlFor="ban-expires">{l.durationLabel}</Label>
                  <Input
                    id="ban-expires"
                    type="number"
                    min={1}
                    aria-describedby={errors.banExpiresInDays ? "ban-expires-error" : undefined}
                    aria-invalid={!!errors.banExpiresInDays}
                    disabled={isSubmitting}
                    {...register("banExpiresInDays")}
                  />
                  {errors.banExpiresInDays && (
                    <p id="ban-expires-error" className="text-destructive text-sm">
                      {errors.banExpiresInDays.message}
                    </p>
                  )}
                </div>
              )}
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
                {isSubmitting ? l.banSubmitting : l.banSubmit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
