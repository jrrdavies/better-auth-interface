"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useApiKeyClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { ApiKey } from "@/registry/lib/types"

/** Overridable UI strings for i18n / custom copy. */
export interface ApiKeyDetailsDialogLabels {
  triggerText?: string
  title?: string
  description?: string
  nameLabel?: string
  enabledLabel?: string
  enabledDescription?: string
  prefixLabel?: string
  createdLabel?: string
  expiresLabel?: string
  lastUsedLabel?: string
  never?: string
  cancel?: string
  submit?: string
  submitting?: string
  loading?: string
  nameRequired?: string
  loadErrorTitle?: string
  notFound?: string
  retry?: string
  networkError?: string
  /** Formats a date for display. Defaults to the locale date string. */
  formatDate?: (date: Date) => string
}

const DEFAULT_LABELS: Required<ApiKeyDetailsDialogLabels> = {
  triggerText: "Details",
  title: "API key details",
  description: "View and edit this API key.",
  nameLabel: "Name",
  enabledLabel: "Enabled",
  enabledDescription: "Disable to reject all requests using this key without deleting it.",
  prefixLabel: "Key",
  createdLabel: "Created",
  expiresLabel: "Expires",
  lastUsedLabel: "Last used",
  never: "Never",
  cancel: "Cancel",
  submit: "Save changes",
  submitting: "Saving...",
  loading: "Loading key...",
  nameRequired: "Name is required",
  loadErrorTitle: "Failed to load key",
  notFound: "API key not found.",
  retry: "Retry",
  networkError: "Unable to connect. Please try again.",
  formatDate: (date) => date.toLocaleDateString(),
}

/** Props for the ApiKeyDetailsDialog component */
export interface ApiKeyDetailsDialogProps {
  /** The id of the API key to view and edit */
  keyId: string
  /** Custom trigger element */
  trigger?: ReactNode | undefined
  /** Callback fired after a successful update */
  onUpdate?: (() => void) | undefined
  /** Controlled open state */
  open?: boolean | undefined
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ApiKeyDetailsDialogLabels | undefined
  /** Additional CSS classes for the dialog content */
  className?: string | undefined
}

function displayKey(key: ApiKey): string {
  // `start` already includes any configured prefix, so it is shown as-is.
  if (key.start) return `${key.start}…`
  if (key.prefix) return `${key.prefix}…`
  return "—"
}

/**
 * Dialog for viewing an API key's metadata and editing its name and enabled state.
 * The full key value cannot be shown — only its prefix and start are available.
 */
export function ApiKeyDetailsDialog({
  keyId,
  trigger,
  onUpdate,
  open: openProp,
  onOpenChange,
  labels,
  className,
}: ApiKeyDetailsDialogProps) {
  const apiKey = useApiKeyClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = openProp ?? internalOpen
  // In controlled mode (open prop set) with no explicit trigger, render no trigger
  // so the dialog can be opened programmatically without a stray button in the layout.
  const showTrigger = trigger !== undefined || openProp === undefined

  const [data, setData] = useState<ApiKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [nameError, setNameError] = useState<string | null>(null)

  const fetchKey = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setServerError(null)

    const result = await apiKey.get({ query: { id: keyId } })

    if (result.error) {
      setLoadError(getErrorMessage(result.error))
      setLoading(false)
      return
    }

    if (result.data) {
      setData(result.data)
      setName(result.data.name ?? "")
      setEnabled(result.data.enabled)
    } else {
      setData(null)
    }
    setLoading(false)
  }, [apiKey, keyId])

  useEffect(() => {
    if (isOpen) {
      void fetchKey()
    }
  }, [isOpen, fetchKey])

  async function handleSave() {
    if (name.trim().length === 0) {
      setNameError(l.nameRequired)
      return
    }
    setNameError(null)
    setServerError(null)
    setSaving(true)

    const result = await apiKey.update({ keyId, name, enabled })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setServerError(message)
      setSaving(false)
      return
    }

    setSaving(false)
    setInternalOpen(false)
    onOpenChange?.(false)
    onUpdate?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      setServerError(null)
      setNameError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline">{l.triggerText}</Button>}
        </DialogTrigger>
      )}
      <DialogContent className={cn(className)}>
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground py-8 text-center text-sm" aria-busy="true">
            {l.loading}
          </div>
        ) : loadError ? (
          <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
            <p className="font-medium">{l.loadErrorTitle}</p>
            <p className="text-sm">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void fetchKey()}>
              {l.retry}
            </Button>
          </div>
        ) : !data ? (
          <div role="alert" className="bg-muted text-muted-foreground rounded-md p-4 text-sm">
            {l.notFound}
          </div>
        ) : (
          <>
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
                <Label htmlFor="api-key-details-name">{l.nameLabel}</Label>
                <Input
                  id="api-key-details-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-describedby={nameError ? "api-key-details-name-error" : undefined}
                  aria-invalid={!!nameError}
                  disabled={saving}
                />
                {nameError && (
                  <p id="api-key-details-name-error" className="text-destructive text-sm">
                    {nameError}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="api-key-details-enabled"
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(checked === true)}
                  disabled={saving}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="api-key-details-enabled">{l.enabledLabel}</Label>
                  <p className="text-muted-foreground text-sm">{l.enabledDescription}</p>
                </div>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{l.prefixLabel}</dt>
                <dd className="font-mono">{displayKey(data)}</dd>
                <dt className="text-muted-foreground">{l.createdLabel}</dt>
                <dd>{l.formatDate(new Date(data.createdAt))}</dd>
                <dt className="text-muted-foreground">{l.expiresLabel}</dt>
                <dd>{data.expiresAt ? l.formatDate(new Date(data.expiresAt)) : l.never}</dd>
                <dt className="text-muted-foreground">{l.lastUsedLabel}</dt>
                <dd>{data.lastRequest ? l.formatDate(new Date(data.lastRequest)) : l.never}</dd>
              </dl>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                {l.cancel}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? l.submitting : l.submit}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
