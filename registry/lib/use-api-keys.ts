"use client"

import { useCallback, useEffect, useState } from "react"
import { useApiKeyClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/auth-utils"
import type { ApiKey } from "@/registry/lib/auth-types"

/** Options for {@link useApiKeys}. */
export interface UseApiKeysOptions {
  /** Called after any successful create, update, or delete (e.g. to show a toast). */
  onChange?: (() => void) | undefined
}

/**
 * Headless state + data orchestration for API key management UIs. Owns the key
 * list, its loading/error state, the enable/disable and delete mutations, and the
 * active-dialog target state. Compose your own layout from `ApiKeyList`,
 * `CreateApiKeyDialog`, and `ApiKeyDetailsDialog`, or build a custom one.
 *
 * @example
 * const keys = useApiKeys({ onChange: () => toast("API keys updated") })
 * // <CreateApiKeyDialog onSuccess={keys.refresh} />
 * // keys.list.map((k) => <Row key={k.id} onDisable={() => keys.toggleEnabled(k)} />)
 */
export interface UseApiKeysResult {
  /** The current user's API keys. */
  list: ApiKey[]
  /** Whether the list is currently loading. */
  loading: boolean
  /** Error message from loading the list, or `null`. */
  error: string | null
  /** Refetch the list. */
  refresh: () => void
  /** Id of the key with an in-flight enable/disable, or `null`. */
  busyId: string | null
  /** Toggle a key's enabled state, refreshing the list on success. */
  toggleEnabled: (key: ApiKey) => Promise<void>
  /** Permanently delete a key. Returns an error message on failure, or `null` on success. */
  deleteKey: (keyId: string) => Promise<string | null>
  /** Id of the key whose details dialog is open, or `null`. */
  detailsKeyId: string | null
  setDetailsKeyId: (id: string | null) => void
  /** Key pending delete confirmation, or `null`. */
  pendingDelete: ApiKey | null
  setPendingDelete: (key: ApiKey | null) => void
}

export function useApiKeys(options?: UseApiKeysOptions): UseApiKeysResult {
  const { onChange } = options ?? {}
  const apiKey = useApiKeyClient()

  const [list, setList] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [detailsKeyId, setDetailsKeyId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiKey.list()
    if (result.error) {
      setError(getErrorMessage(result.error))
      setLoading(false)
      return
    }
    setList(result.data ?? [])
    setLoading(false)
  }, [apiKey])

  useEffect(() => {
    void fetchKeys()
  }, [fetchKeys])

  const refresh = useCallback(() => {
    void fetchKeys()
    onChange?.()
  }, [fetchKeys, onChange])

  const toggleEnabled = useCallback(
    async (key: ApiKey) => {
      setBusyId(key.id)
      const result = await apiKey.update({ keyId: key.id, enabled: !key.enabled })
      setBusyId(null)
      if (!result.error) refresh()
    },
    [apiKey, refresh],
  )

  const deleteKey = useCallback(
    async (keyId: string) => {
      const result = await apiKey.delete({ keyId })
      if (result.error) return getErrorMessage(result.error)
      refresh()
      return null
    },
    [apiKey, refresh],
  )

  return {
    list,
    loading,
    error,
    refresh,
    busyId,
    toggleEnabled,
    deleteKey,
    detailsKeyId,
    setDetailsKeyId,
    pendingDelete,
    setPendingDelete,
  }
}
