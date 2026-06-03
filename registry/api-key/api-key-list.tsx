"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useApiKeyClient, useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"
import type { ApiKey } from "@/registry/lib/types"
import { CreateApiKeyDialog } from "@/registry/api-key/create-api-key-dialog"
import { ApiKeyDetailsDialog } from "@/registry/api-key/api-key-details-dialog"

/** Overridable UI strings for i18n / custom copy. */
export interface ApiKeyListLabels {
  createTrigger?: string
  columnName?: string
  columnKey?: string
  columnCreated?: string
  columnExpires?: string
  columnStatus?: string
  active?: string
  disabled?: string
  expired?: string
  never?: string
  unnamed?: string
  details?: string
  enable?: string
  disable?: string
  delete?: string
  loading?: string
  empty?: string
  notSignedIn?: string
  loadErrorTitle?: string
  retry?: string
  deleteTitle?: string
  deleteDescription?: (key: ApiKey) => string
  deleteCancel?: string
  deleteConfirm?: string
  deleting?: string
  networkError?: string
  /** Formats a date for display. Defaults to the locale date string. */
  formatDate?: (date: Date) => string
}

const DEFAULT_LABELS: Required<ApiKeyListLabels> = {
  createTrigger: "Create API Key",
  columnName: "Name",
  columnKey: "Key",
  columnCreated: "Created",
  columnExpires: "Expires",
  columnStatus: "Status",
  active: "Active",
  disabled: "Disabled",
  expired: "Expired",
  never: "Never",
  unnamed: "Unnamed key",
  details: "Details",
  enable: "Enable",
  disable: "Disable",
  delete: "Delete",
  loading: "Loading API keys...",
  empty: "No API keys yet.",
  notSignedIn: "You must be signed in to manage API keys.",
  loadErrorTitle: "Failed to load API keys",
  retry: "Retry",
  deleteTitle: "Delete API key",
  deleteDescription: (key) =>
    `Are you sure you want to delete ${key.name ?? "this key"}? Any application using it will immediately lose access. This cannot be undone.`,
  deleteCancel: "Cancel",
  deleteConfirm: "Delete key",
  deleting: "Deleting...",
  networkError: "Unable to connect. Please try again.",
  formatDate: (date) => date.toLocaleDateString(),
}

/** Props for the ApiKeyList component */
export interface ApiKeyListProps {
  /** Callback fired after any successful create, update, or delete */
  onUpdate?: (() => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: ApiKeyListLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

function isExpired(key: ApiKey): boolean {
  return key.expiresAt !== null && new Date(key.expiresAt).getTime() < Date.now()
}

function displayKey(key: ApiKey): string {
  // `start` already includes any configured prefix, so it is shown as-is.
  if (key.start) return `${key.start}…`
  if (key.prefix) return `${key.prefix}…`
  return "—"
}

/**
 * Self-contained table of the current user's API keys with create, details,
 * enable/disable, and delete actions.
 */
export function ApiKeyList({ onUpdate, labels, className }: ApiKeyListProps) {
  const authClient = useAuthClient()
  const apiKey = useApiKeyClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [detailsKeyId, setDetailsKeyId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const session = authClient.useSession()

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await apiKey.list()

    if (result.error) {
      setError(getErrorMessage(result.error))
      setLoading(false)
      return
    }

    setKeys(result.data ?? [])
    setLoading(false)
  }, [apiKey])

  useEffect(() => {
    void fetchKeys()
  }, [fetchKeys])

  function handleMutated() {
    void fetchKeys()
    onUpdate?.()
  }

  async function handleToggleEnabled(key: ApiKey) {
    setBusyId(key.id)
    const result = await apiKey.update({ keyId: key.id, enabled: !key.enabled })
    setBusyId(null)
    if (!result.error) {
      handleMutated()
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleteError(null)
    setDeleting(true)

    const result = await apiKey.delete({ keyId: pendingDelete.id })

    if (result.error) {
      const message = isNetworkError(result.error) ? l.networkError : getErrorMessage(result.error)
      setDeleteError(message)
      setDeleting(false)
      return
    }

    setDeleting(false)
    setPendingDelete(null)
    handleMutated()
  }

  function statusBadge(key: ApiKey) {
    if (isExpired(key)) return <Badge variant="outline">{l.expired}</Badge>
    if (!key.enabled) return <Badge variant="secondary">{l.disabled}</Badge>
    return <Badge variant="default">{l.active}</Badge>
  }

  if (!session.data && !session.isPending) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        {l.notSignedIn}
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        <p className="font-medium">{l.loadErrorTitle}</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void fetchKeys()}>
          {l.retry}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-end">
        <CreateApiKeyDialog onSuccess={handleMutated} labels={{ triggerText: l.createTrigger }} />
      </div>

      <div className="rounded-md border">
        <Table aria-busy={loading}>
          <TableHeader>
            <TableRow>
              <TableHead>{l.columnName}</TableHead>
              <TableHead>{l.columnKey}</TableHead>
              <TableHead>{l.columnCreated}</TableHead>
              <TableHead>{l.columnExpires}</TableHead>
              <TableHead>{l.columnStatus}</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {l.loading}
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {l.empty}
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name ?? l.unnamed}</TableCell>
                  <TableCell className="font-mono text-sm">{displayKey(key)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {l.formatDate(new Date(key.createdAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.expiresAt ? l.formatDate(new Date(key.expiresAt)) : l.never}
                  </TableCell>
                  <TableCell>{statusBadge(key)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === key.id}
                          aria-label={`Actions for ${key.name ?? l.unnamed}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailsKeyId(key.id)}>
                          {l.details}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleToggleEnabled(key)}>
                          {key.enabled ? l.disable : l.enable}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteError(null)
                            setPendingDelete(key)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          {l.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {detailsKeyId && (
        <ApiKeyDetailsDialog
          keyId={detailsKeyId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDetailsKeyId(null)
          }}
          onUpdate={handleMutated}
          labels={{ formatDate: l.formatDate }}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l.deleteTitle}</DialogTitle>
            <DialogDescription>
              {pendingDelete ? l.deleteDescription(pendingDelete) : ""}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              {l.deleteCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
              aria-busy={deleting}
            >
              {deleting ? l.deleting : l.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
