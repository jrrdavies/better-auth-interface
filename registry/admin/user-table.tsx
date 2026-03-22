"use client"

import { useCallback, useEffect, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
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
import { getErrorMessage } from "@/registry/lib/utils"
import type { UserWithRole } from "@/registry/lib/types"

/** Props for the UserTable component */
export interface UserTableProps {
  /** Number of users per page */
  pageSize?: number | undefined
  /** Callback when a user row is clicked */
  onUserClick?: ((user: UserWithRole) => void) | undefined
  /** Available roles for filtering */
  availableRoles?: string[] | undefined
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
  availableRoles = ["user", "admin"],
  onEditUser,
  onSetRole,
  onBanUser,
  onSetPassword,
  onImpersonate,
  onDeleteUser,
  className,
}: UserTableProps) {
  const authClient = useAuthClient()
  const adminClient = useAdminClient()

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

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const sortCol = sorting[0]
    const result = await adminClient.admin.listUsers({
      limit: pageSize,
      offset: page * pageSize,
      searchValue: search || undefined,
      searchField: search ? "email" : undefined,
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
  }, [adminClient, page, pageSize, search, sorting, roleFilter, banFilter])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const columns: ColumnDef<UserWithRole>[] = [
    {
      id: "user",
      header: "User",
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
      header: "Role",
      accessorFn: (row) => row.role,
      cell: ({ row }) => {
        const role = row.original.role ?? "user"
        return <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
      },
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.banned,
      cell: ({ row }) => {
        const banned = row.original.banned
        return (
          <Badge variant={banned ? "destructive" : "outline"}>{banned ? "Banned" : "Active"}</Badge>
        )
      },
    },
    {
      id: "createdAt",
      header: "Created",
      accessorFn: (row) => row.createdAt,
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return <span className="text-muted-foreground text-sm">{date.toLocaleDateString()}</span>
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEditUser && (
                <DropdownMenuItem onClick={() => onEditUser(user)}>Edit</DropdownMenuItem>
              )}
              {onSetRole && (
                <DropdownMenuItem onClick={() => onSetRole(user)}>Set Role</DropdownMenuItem>
              )}
              {onBanUser && (
                <DropdownMenuItem onClick={() => onBanUser(user)}>
                  {user.banned ? "Unban" : "Ban"}
                </DropdownMenuItem>
              )}
              {onSetPassword && (
                <DropdownMenuItem onClick={() => onSetPassword(user)}>
                  Set Password
                </DropdownMenuItem>
              )}
              {onImpersonate && (
                <DropdownMenuItem onClick={() => onImpersonate(user)}>Impersonate</DropdownMenuItem>
              )}
              {onDeleteUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteUser(user)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
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
    pageCount: Math.ceil(total / pageSize),
    state: { sorting },
    onSortingChange: setSorting,
  })

  if (!session.data && !session.isPending) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        You must be signed in to access the admin panel.
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-4">
        <p className="font-medium">Failed to load users</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void fetchUsers()}>
          Retry
        </Button>
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="max-w-sm"
          aria-label="Search users"
        />
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by role">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={banFilter}
            onValueChange={(value) => {
              setBanFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
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
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
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
        <p className="text-muted-foreground text-sm">
          {total} user{total !== 1 ? "s" : ""} total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
