"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Copy } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApiKeyClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/auth-utils"

/** A selectable expiration preset for a new API key. */
export interface ApiKeyExpirationOption {
  /** Label shown in the select */
  label: string
  /** Seconds until expiry, or null for a key that never expires */
  seconds: number | null
}

const DAY = 60 * 60 * 24

const DEFAULT_EXPIRATION_OPTIONS: ApiKeyExpirationOption[] = [
  { label: "7 days", seconds: 7 * DAY },
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "Never", seconds: null },
]

/** Overridable UI strings for i18n / custom copy. */
export interface CreateApiKeyDialogLabels {
  triggerText?: string
  title?: string
  description?: string
  nameLabel?: string
  namePlaceholder?: string
  expirationLabel?: string
  cancel?: string
  submit?: string
  submitting?: string
  nameRequired?: string
  networkError?: string
  /** Title shown after the key is created */
  createdTitle?: string
  /** Description shown after the key is created */
  createdDescription?: string
  copy?: string
  copied?: string
  done?: string
}

const DEFAULT_LABELS: Required<CreateApiKeyDialogLabels> = {
  triggerText: "Create API Key",
  title: "Create API key",
  description: "Generate a new API key. You will only be able to view the key once.",
  nameLabel: "Name",
  namePlaceholder: "e.g. Production server",
  expirationLabel: "Expiration",
  cancel: "Cancel",
  submit: "Create key",
  submitting: "Creating...",
  nameRequired: "Name is required",
  networkError: "Unable to connect. Please try again.",
  createdTitle: "API key created",
  createdDescription: "Copy your key now. For security reasons it will not be shown again.",
  copy: "Copy",
  copied: "Copied",
  done: "Done",
}

/** Props for the CreateApiKeyDialog component */
export interface CreateApiKeyDialogProps {
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired with the full key string after successful creation */
  onSuccess?: ((key: string) => void) | undefined
  /** Callback fired when creation fails */
  onError?: ((error: Error) => void) | undefined
  /**
   * Expiration presets offered in the select. Defaults to 7/30/90 days and Never.
   * Provide your own list to customise (e.g. enforce a maximum lifetime).
   */
  expirationOptions?: ApiKeyExpirationOption[] | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: CreateApiKeyDialogLabels | undefined
  /** Additional CSS classes for the dialog content */
  className?: string | undefined
}

/**
 * Dialog for creating a new API key. After creation the full key is shown
 * exactly once with a copy button — it cannot be retrieved again afterwards.
 */
export function CreateApiKeyDialog({
  trigger,
  onSuccess,
  onError,
  expirationOptions = DEFAULT_EXPIRATION_OPTIONS,
  labels,
  className,
}: CreateApiKeyDialogProps) {
  const apiKey = useApiKeyClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const options = expirationOptions.length > 0 ? expirationOptions : DEFAULT_EXPIRATION_OPTIONS

  const createApiKeySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, l.nameRequired),
        /** Index into `options`, kept as a string for the Select component */
        expiration: z.string(),
      }),
    [l],
  )

  type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "", expiration: "0" },
  })

  const selectedExpiration = watch("expiration")

  async function onSubmit(values: CreateApiKeyFormValues) {
    setServerError(null)

    const option = options[Number(values.expiration)] ?? options[0]!
    const result = await apiKey.create({
      name: values.name,
      expiresIn: option.seconds,
    })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      onError?.(new Error(message))
      return
    }

    if (result.data) {
      setCreatedKey(result.data.key)
      onSuccess?.(result.data.key)
    }
  }

  async function handleCopy() {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the value remains selectable in the input.
    }
  }

  function resetState() {
    reset()
    setServerError(null)
    setCreatedKey(null)
    setCopied(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button>{l.triggerText}</Button>}</DialogTrigger>
      <DialogContent className={cn(className)}>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>{l.createdTitle}</DialogTitle>
              <DialogDescription>{l.createdDescription}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdKey}
                  aria-label={l.createdTitle}
                  className="font-mono text-sm"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopy()}
                  aria-label={copied ? l.copied : l.copy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {l.done}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
                  <Label htmlFor="create-api-key-name">{l.nameLabel}</Label>
                  <Input
                    id="create-api-key-name"
                    placeholder={l.namePlaceholder}
                    aria-describedby={errors.name ? "create-api-key-name-error" : undefined}
                    aria-invalid={!!errors.name}
                    disabled={isSubmitting}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p id="create-api-key-name-error" className="text-destructive text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-api-key-expiration">{l.expirationLabel}</Label>
                  <Select
                    value={selectedExpiration}
                    onValueChange={(value) => setValue("expiration", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="create-api-key-expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option, index) => (
                        <SelectItem key={option.label} value={String(index)}>
                          {option.label}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
