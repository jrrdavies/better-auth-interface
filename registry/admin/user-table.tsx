"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { ChevronDown, ChevronsUpDown, ChevronUp, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminClient, useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage } from "@/registry/lib/auth-utils"
import type { UserWithRole } from "@/registry/lib/auth-types"

/** Row-level admin actions that can be offered per user. */
export type UserAction = "edit" | "setRole" | "ban" | "setPassword" | "impersonate" | "delete"

/** Overridable UI strings (for i18n / custom copy). */
export interface UserTableLabels {
  searchPlaceholder?: string
  allRoles?: string
  allStatuses?: string
  active?: string
  banned?: string
  columnUser?: string
  columnRole?: string
  columnStatus?: string
  columnCreated?: string
  edit?: string
  setRole?: string
  ban?: string
  unban?: string
  setPassword?: string
  impersonate?: string
  delete?: string
  loading?: string
  empty?: string
  notSignedIn?: string
  loadErrorTitle?: string
  retry?: string
  previous?: string
  next?: string
  totalUsers?: (total: number) => string
  pageOf?: (page: number, totalPages: number) => string
}

const DEFAULT_LABELS: Required<UserTableLabels> = {
  searchPlaceholder: "Search...",
  allRoles: "All roles",
  allStatuses: "All statuses",
  active: "Active",
  banned: "Banned",
  columnUser: "User",
  columnRole: "Role",
  columnStatus: "Status",
  columnCreated: "Created",
  edit: "Edit",
  setRole: "Set Role",
  ban: "Ban",
  unban: "Unban",
  setPassword: "Set Password",
  impersonate: "Impersonate",
  delete: "Delete",
  loading: "Loading users...",
  empty: "No users found.",
  notSignedIn: "You must be signed in to access the admin panel.",
  loadErrorTitle: "Failed to load users",
  retry: "Retry",
  previous: "Previous",
  next: "Next",
  totalUsers: (total) => `${total} user${total !== 1 ? "s" : ""} total`,
  pageOf: (page, totalPages) => `Page ${page} of ${totalPages}`,
}

/** Props for the UserTable component */
export interface UserTableProps {
  /** Number of users per page */
  pageSize?: number | undefined
  /** Callback when a user row is clicked */
  onUserClick?: ((user: UserWithRole) => void) | undefined
  /**
   * Roles offered in the role filter dropdown. When omitted or empty,
   * the role filter is hidden entirely.
   */
  filterableRoles?: string[] | undefined
  /** Which user field the search box queries. Defaults to "email". */
  searchField?: "name" | "email" | undefined
  /**
   * Per-row gate deciding whether a given action is available for a user.
   * Return `false` to hide the action for that row. Defaults to allowing all.
   */
  canPerformAction?: ((action: UserAction, user: UserWithRole) => boolean) | undefined
  /** Callback to open the edit user dialog */
  onEditUser?: ((user: UserWithRole) => void) | undefined
  /** Callback to open the set role dialog */
  onSetRole?: ((user: UserWithRole) => void) | undefined
  /** Callback to open the ban/unban dialog */
  onBanUser?: ((user: UserWithRole) => void) | undefined
  /** Callback to open the set password dialog */
  onSetPassword?: ((user: UserWithRole) => void) | undefined
  /** Callback to start impersonation */
  onImpersonate?: ((user: UserWithRole) => void) | undefined
  /** Callback to open the delete user dialog */
  onDeleteUser?: ((user: UserWithRole) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: UserTableLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Full-featured admin user data table with server-side pagination,
 * search, sorting, and role/ban filtering.
 */
export function UserTable({
  pageSize = 20,
  onUserClick,
  filterableRoles,
  searchField = "email",
  canPerformAction,
  onEditUser,
  onSetRole,
  onBanUser,
  onSetPassword,
  onImpersonate,
  onDeleteUser,
  labels,
  className,
}: UserTableProps) {
  const authClient = useAuthClient()
  const adminClient = useAdminClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])

  const [users, setUsers] = useState<UserWithRole[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [banFilter, setBanFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const session = authClient.useSession()
  const showRoleFilter = !!filterableRoles && filterableRoles.length > 0

  const can = useCallback(
    (action: UserAction, user: UserWithRole) =>
      canPerformAction ? canPerformAction(action, user) : true,
    [canPerformAction],
  )

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const sortCol = sorting[0]
    const result = await adminClient.admin.listUsers({
      query: {
        limit: pageSize,
        offset: page * pageSize,
        searchValue: search || undefined,
        searchField: search ? searchField : undefined,
        searchOperator: search ? "contains" : undefined,
        sortBy: sortCol?.id,
        sortDirection: sortCol?.desc ? "desc" : "asc",
        filterField: roleFilter !== "all" ? "role" : banFilter !== "all" ? "banned" : undefined,
        filterValue:
          roleFilter !== "all"
            ? roleFilter
            : banFilter !== "all"
              ? banFilter === "banned"
              : undefined,
        filterOperator: roleFilter !== "all" || banFilter !== "all" ? "eq" : undefined,
      },
    })

    if (result.error) {
      setError(getErrorMessage(result.error))
      setLoading(false)
      return
    }

    if (result.data) {
      setUsers(result.data.users)
      setTotal(result.data.total)
    }
    setLoading(false)
  }, [adminClient, page, pageSize, search, searchField, sorting, roleFilter, banFilter])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const columns: ColumnDef<UserWithRole>[] = [
    {
      id: "name",
      header: l.columnUser,
      accessorFn: (row) => row.name,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: "role",
      header: l.columnRole,
      accessorFn: (row) => row.role,
      cell: ({ row }) => {
        const role = row.original.role ?? "user"
        return <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
      },
    },
    {
      id: "banned",
      header: l.columnStatus,
      accessorFn: (row) => row.banned,
      cell: ({ row }) => {
        const banned = row.original.banned
        return (
          <Badge variant={banned ? "destructive" : "outline"}>{banned ? l.banned : l.active}</Badge>
        )
      },
    },
    {
      id: "createdAt",
      header: l.columnCreated,
      accessorFn: (row) => row.createdAt,
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return <span className="text-muted-foreground text-sm">{date.toLocaleDateString()}</span>
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        const items = {
          edit: !!onEditUser && can("edit", user),
          setRole: !!onSetRole && can("setRole", user),
          ban: !!onBanUser && can("ban", user),
          setPassword: !!onSetPassword && can("setPassword", user),
          impersonate: !!onImpersonate && can("impersonate", user),
          delete: !!onDeleteUser && can("delete", user),
        }
        if (!Object.values(items).some(Boolean)) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {items.edit && (
                <DropdownMenuItem onClick={() => onEditUser?.(user)}>{l.edit}</DropdownMenuItem>
              )}
              {items.setRole && (
                <DropdownMenuItem onClick={() => onSetRole?.(user)}>{l.setRole}</DropdownMenuItem>
              )}
              {items.ban && (
                <DropdownMenuItem onClick={() => onBanUser?.(user)}>
                  {user.banned ? l.unban : l.ban}
                </DropdownMenuItem>
              )}
              {items.setPassword && (
                <DropdownMenuItem onClick={() => onSetPassword?.(user)}>
                  {l.setPassword}
                </DropdownMenuItem>
              )}
              {items.impersonate && (
                <DropdownMenuItem onClick={() => onImpersonate?.(user)}>
                  {l.impersonate}
                </DropdownMenuItem>
              )}
              {items.delete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteUser?.(user)}
                    className="text-destructive focus:text-destructive"
                  >
                    {l.delete}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    sortDescFirst: false,
    pageCount: Math.ceil(total / pageSize),
    state: { sorting },
    onSortingChange: setSorting,
  })

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
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void fetchUsers()}>
          {l.retry}
        </Button>
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={l.searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="max-w-sm"
          aria-label={l.searchPlaceholder}
        />
        <div className="flex gap-2">
          {showRoleFilter && (
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[140px]" aria-label={l.allRoles}>
                <SelectValue placeholder={l.allRoles} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l.allRoles}</SelectItem>
                {filterableRoles?.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={banFilter}
            onValueChange={(value) => {
              setBanFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[140px]" aria-label={l.allStatuses}>
              <SelectValue placeholder={l.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l.allStatuses}</SelectItem>
              <SelectItem value="active">{l.active}</SelectItem>
              <SelectItem value="banned">{l.banned}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table aria-busy={loading}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}
                    role={header.column.getCanSort() ? "button" : undefined}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      if (header.column.getCanSort() && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        header.column.getToggleSortingHandler()?.(e)
                      }
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                          ))}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {l.loading}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {l.empty}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onUserClick ? "cursor-pointer" : ""}
                  onClick={() => onUserClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{l.totalUsers(total)}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            {l.previous}
          </Button>
          <span className="text-sm">{l.pageOf(page + 1, totalPages || 1)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {l.next}
          </Button>
        </div>
      </div>
    </div>
  )
}
