"use client"

import { useCallback, useEffect, useState } from "react"
import { Users, ShieldAlert, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminClient, useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"
import { UserTable } from "@/registry/admin/user-table"
import { CreateUserDialog } from "@/registry/admin/create-user-dialog"
import { EditUserDialog } from "@/registry/admin/edit-user-dialog"
import { BanUserDialog } from "@/registry/admin/ban-user-dialog"
import { SetRoleDialog } from "@/registry/admin/set-role-dialog"
import { DeleteUserDialog } from "@/registry/admin/delete-user-dialog"
import { SetPasswordDialog } from "@/registry/admin/set-password-dialog"
import { ImpersonateButton } from "@/registry/admin/impersonate-button"

/** Props for the AdminDashboard component */
export interface AdminDashboardProps {
  /** Dashboard title */
  title?: string | undefined
  /** Dashboard description */
  description?: string | undefined
  /** Available roles for user management */
  availableRoles?: string[] | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

interface Stats {
  totalUsers: number
  bannedUsers: number
  adminCount: number
}

/**
 * Composite admin dashboard block with stats cards, user table,
 * and all admin action dialogs wired up.
 */
export function AdminDashboard({
  title = "Admin Dashboard",
  description = "Manage users and permissions",
  availableRoles = ["user", "admin"],
  className,
}: AdminDashboardProps) {
  const authClient = useAuthClient()
  const adminClient = useAdminClient()

  const [stats, setStats] = useState<Stats>({ totalUsers: 0, bannedUsers: 0, adminCount: 0 })
  const [statsError, setStatsError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Active dialog state
  const [editUser, setEditUser] = useState<UserWithRole | null>(null)
  const [banUser, setBanUser] = useState<UserWithRole | null>(null)
  const [roleUser, setRoleUser] = useState<UserWithRole | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null)
  const [impersonateUser, setImpersonateUser] = useState<UserWithRole | null>(null)

  const session = authClient.useSession()

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      setStatsError(null)

      const result = await adminClient.admin.listUsers({ limit: 1, offset: 0 })
      if (result.error) {
        setStatsError(getErrorMessage(result.error))
        return
      }

      if (result.data) {
        const total = result.data.total

        // Fetch banned count
        const bannedResult = await adminClient.admin.listUsers({
          filterField: "banned",
          filterValue: true,
          filterOperator: "eq",
          limit: 1,
          offset: 0,
        })
        const bannedCount = bannedResult.data?.total ?? 0

        // Fetch admin count
        const adminResult = await adminClient.admin.listUsers({
          filterField: "role",
          filterValue: "admin",
          filterOperator: "eq",
          limit: 1,
          offset: 0,
        })
        const adminCount = adminResult.data?.total ?? 0

        setStats({ totalUsers: total, bannedUsers: bannedCount, adminCount })
      }
    }

    void fetchStats()
  }, [adminClient, refreshKey])

  if (!session.data && !session.isPending) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        You must be signed in as an admin to access this dashboard.
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Impersonation banner */}
      {impersonateUser && (
        <ImpersonateButton
          user={impersonateUser}
          onImpersonateStart={refresh}
          onImpersonateStop={() => {
            setImpersonateUser(null)
            refresh()
          }}
        />
      )}

      {/* Stats cards */}
      {statsError ? (
        <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          Failed to load stats: {statsError}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Total Users</CardDescription>
                <Users className="text-muted-foreground h-4 w-4" />
              </div>
              <CardTitle className="text-4xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Registered accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Banned Users</CardDescription>
                <ShieldAlert className="text-muted-foreground h-4 w-4" />
              </div>
              <CardTitle className="text-4xl">{stats.bannedUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Currently banned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Admins</CardDescription>
                <Shield className="text-muted-foreground h-4 w-4" />
              </div>
              <CardTitle className="text-4xl">{stats.adminCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Users with admin role</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create user button */}
      <div className="flex justify-end">
        <CreateUserDialog roles={availableRoles} onSuccess={refresh} />
      </div>

      {/* User table */}
      <UserTable
        key={refreshKey}
        availableRoles={availableRoles}
        onEditUser={setEditUser}
        onSetRole={setRoleUser}
        onBanUser={setBanUser}
        onSetPassword={setPasswordUser}
        onImpersonate={setImpersonateUser}
        onDeleteUser={setDeleteUser}
      />

      {/* Action dialogs — controlled open state from table row actions */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          roles={availableRoles}
          open={!!editUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditUser(null)
          }}
          onSuccess={() => {
            setEditUser(null)
            refresh()
          }}
        />
      )}
      {banUser && (
        <BanUserDialog
          user={banUser}
          open={!!banUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setBanUser(null)
          }}
          onSuccess={() => {
            setBanUser(null)
            refresh()
          }}
        />
      )}
      {roleUser && (
        <SetRoleDialog
          user={roleUser}
          availableRoles={availableRoles}
          open={!!roleUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setRoleUser(null)
          }}
          onSuccess={() => {
            setRoleUser(null)
            refresh()
          }}
        />
      )}
      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeleteUser(null)
          }}
          onSuccess={() => {
            setDeleteUser(null)
            refresh()
          }}
        />
      )}
      {passwordUser && (
        <SetPasswordDialog
          user={passwordUser}
          open={!!passwordUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setPasswordUser(null)
          }}
          onSuccess={() => {
            setPasswordUser(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
