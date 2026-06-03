"use client"

import { useMemo, useState } from "react"
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
import { useAuthClient } from "@/registry/lib/auth-provider"
import { useApiKeys } from "@/registry/lib/use-api-keys"
import type { ApiKey } from "@/registry/lib/auth-types"
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
 * enable/disable, and delete actions. State and data are orchestrated by the
 * `useApiKeys` hook — compose that hook directly if you need a custom layout.
 */
export function ApiKeyList({ onUpdate, labels, className }: ApiKeyListProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const keys = useApiKeys({ onChange: onUpdate })

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const session = authClient.useSession()

  async function handleDelete() {
    if (!keys.pendingDelete) return
    setDeleteError(null)
    setDeleting(true)
    const error = await keys.deleteKey(keys.pendingDelete.id)
    setDeleting(false)
    if (error) {
      setDeleteError(error)
      return
    }
    keys.setPendingDelete(null)
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

  if (keys.error) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        <p className="font-medium">{l.loadErrorTitle}</p>
        <p className="text-sm">{keys.error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={keys.refresh}>
          {l.retry}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-end">
        <CreateApiKeyDialog onSuccess={keys.refresh} labels={{ triggerText: l.createTrigger }} />
      </div>

      <div className="rounded-md border">
        <Table aria-busy={keys.loading}>
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
            {keys.loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {l.loading}
                </TableCell>
              </TableRow>
            ) : keys.list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {l.empty}
                </TableCell>
              </TableRow>
            ) : (
              keys.list.map((key) => (
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
                          disabled={keys.busyId === key.id}
                          aria-label={`Actions for ${key.name ?? l.unnamed}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => keys.setDetailsKeyId(key.id)}>
                          {l.details}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void keys.toggleEnabled(key)}>
                          {key.enabled ? l.disable : l.enable}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteError(null)
                            keys.setPendingDelete(key)
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

      {keys.detailsKeyId && (
        <ApiKeyDetailsDialog
          keyId={keys.detailsKeyId}
          open={true}
          onOpenChange={(open) => {
            if (!open) keys.setDetailsKeyId(null)
          }}
          onUpdate={keys.refresh}
          labels={{ formatDate: l.formatDate }}
        />
      )}

      <Dialog
        open={keys.pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            keys.setPendingDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l.deleteTitle}</DialogTitle>
            <DialogDescription>
              {keys.pendingDelete ? l.deleteDescription(keys.pendingDelete) : ""}
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
              onClick={() => keys.setPendingDelete(null)}
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
