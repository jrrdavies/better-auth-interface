"use client"

import { useState } from "react"
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
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

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

/** Props for the BanUserDialog component */
export interface BanUserDialogProps {
  /** The user to ban or unban */
  user: UserWithRole
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after successful ban/unban */
  onSuccess?: (() => void) | undefined
}

/**
 * Admin dialog for banning or unbanning a user.
 * Shows ban form if user is not banned, unban option if already banned.
 */
export function BanUserDialog({ user, trigger, onSuccess }: BanUserDialogProps) {
  const adminClient = useAdminClient()
  const [open, setOpen] = useState(false)
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
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please try again."
        : getErrorMessage(result.error)
      setServerError(message)
      return
    }

    setOpen(false)
    reset()
    onSuccess?.()
  }

  async function onUnban() {
    setServerError(null)
    setUnbanning(true)

    const result = await adminClient.admin.unbanUser({ userId: user.id })

    if (result.error) {
      const message = isNetworkError(result.error)
        ? "Unable to connect. Please try again."
        : getErrorMessage(result.error)
      setServerError(message)
      setUnbanning(false)
      return
    }

    setUnbanning(false)
    setOpen(false)
    onSuccess?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      setServerError(null)
    }
  }

  const isBanned = !!user.banned

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isBanned ? "outline" : "destructive"}>
            {isBanned ? "Unban" : "Ban"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBanned ? "Unban" : "Ban"} user</DialogTitle>
          <DialogDescription>
            {isBanned
              ? `Remove the ban on ${user.name} (${user.email}).`
              : `Ban ${user.name} (${user.email}) from the platform.`}
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
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onUnban()}
              disabled={unbanning}
              aria-busy={unbanning}
            >
              {unbanning ? "Unbanning..." : "Unban user"}
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={(e) => void handleSubmit(onBan)(e)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Ban reason</Label>
                <Textarea
                  id="ban-reason"
                  placeholder="Reason for ban (optional)"
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
                  Permanent ban
                </Label>
              </div>

              {!permanent && (
                <div className="space-y-2">
                  <Label htmlFor="ban-expires">Ban duration (days)</Label>
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
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Banning..." : "Ban user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
