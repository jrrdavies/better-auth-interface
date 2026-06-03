"use client"

import { useCallback, useEffect, useState } from "react"
import { useAdminClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

/** Aggregate user counts for the dashboard stat cards. */
export interface UserStats {
  totalUsers: number
  bannedUsers: number
  adminCount: number
}

/** Options for {@link useAdminUsers}. */
export interface UseAdminUsersOptions {
  /** Role counted in `stats.adminCount`. Defaults to `"admin"`. */
  adminRole?: string | undefined
  /** Whether to fetch the aggregate stats. Defaults to `true`. */
  fetchStats?: boolean | undefined
}

/**
 * Headless state + data orchestration for user-management UIs. Compose your own
 * layout from `UserTable`, the action dialogs and your own create button while
 * sharing one refresh signal and the active-dialog state.
 *
 * @example
 * const admin = useAdminUsers({ adminRole: "admin" })
 * // <CreateUserDialog onSuccess={admin.refresh} /> anywhere (e.g. a page header)
 * // <UserTable key={admin.refreshKey} onEditUser={admin.setEditUser} ... />
 * // <EditUserDialog user={admin.editUser} onSuccess={() => { admin.setEditUser(null); admin.refresh() }} ... />
 */
export interface UseAdminUsersResult {
  /** Increments on every {@link refresh}. Pass as `key` to `<UserTable />` to refetch. */
  refreshKey: number
  /** Refetch the table (via `refreshKey`) and the stats. */
  refresh: () => void
  /** Aggregate stats; zeroed until loaded and when `fetchStats` is false. */
  stats: UserStats
  /** Error message from loading stats, or `null`. */
  statsError: string | null
  editUser: UserWithRole | null
  setEditUser: (user: UserWithRole | null) => void
  banUser: UserWithRole | null
  setBanUser: (user: UserWithRole | null) => void
  roleUser: UserWithRole | null
  setRoleUser: (user: UserWithRole | null) => void
  deleteUser: UserWithRole | null
  setDeleteUser: (user: UserWithRole | null) => void
  passwordUser: UserWithRole | null
  setPasswordUser: (user: UserWithRole | null) => void
  impersonateUser: UserWithRole | null
  setImpersonateUser: (user: UserWithRole | null) => void
}

export function useAdminUsers(options?: UseAdminUsersOptions): UseAdminUsersResult {
  const { adminRole = "admin", fetchStats = true } = options ?? {}
  const adminClient = useAdminClient()

  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, bannedUsers: 0, adminCount: 0 })
  const [statsError, setStatsError] = useState<string | null>(null)

  const [editUser, setEditUser] = useState<UserWithRole | null>(null)
  const [banUser, setBanUser] = useState<UserWithRole | null>(null)
  const [roleUser, setRoleUser] = useState<UserWithRole | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null)
  const [impersonateUser, setImpersonateUser] = useState<UserWithRole | null>(null)

  useEffect(() => {
    if (!fetchStats) return
    let cancelled = false

    async function load() {
      setStatsError(null)
      const total = await adminClient.admin.listUsers({ query: { limit: 1, offset: 0 } })
      if (cancelled) return
      if (total.error) {
        setStatsError(getErrorMessage(total.error))
        return
      }
      const banned = await adminClient.admin.listUsers({
        query: {
          filterField: "banned",
          filterValue: true,
          filterOperator: "eq",
          limit: 1,
          offset: 0,
        },
      })
      const admins = await adminClient.admin.listUsers({
        query: {
          filterField: "role",
          filterValue: adminRole,
          filterOperator: "eq",
          limit: 1,
          offset: 0,
        },
      })
      if (cancelled) return
      setStats({
        totalUsers: total.data?.total ?? 0,
        bannedUsers: banned.data?.total ?? 0,
        adminCount: admins.data?.total ?? 0,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [adminClient, adminRole, fetchStats, refreshKey])

  return {
    refreshKey,
    refresh,
    stats,
    statsError,
    editUser,
    setEditUser,
    banUser,
    setBanUser,
    roleUser,
    setRoleUser,
    deleteUser,
    setDeleteUser,
    passwordUser,
    setPasswordUser,
    impersonateUser,
    setImpersonateUser,
  }
}
