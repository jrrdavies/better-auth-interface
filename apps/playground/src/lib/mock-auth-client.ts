import type { AuthClientShape, AdminClientShape, UserWithRole } from "@/registry/lib/types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mockUsers: UserWithRole[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-06-01"),
    role: "admin",
    banned: false,
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
    createdAt: new Date("2024-03-22"),
    updatedAt: new Date("2024-05-15"),
    role: "user",
    banned: false,
  },
  {
    id: "3",
    name: "Charlie Brown",
    email: "charlie@example.com",
    emailVerified: false,
    image: null,
    createdAt: new Date("2024-06-10"),
    updatedAt: new Date("2024-06-10"),
    role: "user",
    banned: true,
    banReason: "Spam activity",
  },
  {
    id: "4",
    name: "Diana Prince",
    email: "diana@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=diana",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-04-20"),
    role: "admin",
    banned: false,
  },
  {
    id: "5",
    name: "Eve Wilson",
    email: "eve@example.com",
    emailVerified: true,
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=eve",
    createdAt: new Date("2024-07-05"),
    updatedAt: new Date("2024-07-05"),
    role: "user",
    banned: false,
  },
]

const ok = <T>(data: T) => ({ data, error: null })
const err = (message: string, status = 400) => ({
  data: null,
  error: { message, status, statusText: "Error" },
})

let currentUser = mockUsers[0]!
let isLoggedIn = true
let impersonating = false

export const mockAuthClient: AuthClientShape = {
  signIn: {
    email: async ({ email, password }) => {
      await delay(800)
      if (email === "fail@example.com") return err("Invalid credentials", 401)
      if (!password) return err("Password is required")
      const user = mockUsers.find((u) => u.email === email) ?? mockUsers[0]!
      currentUser = user
      isLoggedIn = true
      return ok({ redirect: false, token: "mock-token-123", user })
    },
    username: async ({ username, password }) => {
      await delay(800)
      if (username === "fail") return err("Invalid credentials", 401)
      if (!password) return err("Password is required")
      const user = mockUsers.find((u) => u.name.toLowerCase().replace(/\s+/g, "") === username.toLowerCase()) ?? mockUsers[0]!
      currentUser = user
      isLoggedIn = true
      return ok({ redirect: false, token: "mock-token-123", user })
    },
  },
  signUp: {
    email: async ({ name, email }) => {
      await delay(800)
      if (email === "taken@example.com") return err("Email already in use")
      const user = {
        id: String(mockUsers.length + 1),
        name,
        email,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      return ok({ token: "mock-token-456", user })
    },
  },
  requestPasswordReset: async () => {
    await delay(800)
    return ok({ status: true, message: "Reset email sent" })
  },
  resetPassword: async () => {
    await delay(800)
    return ok({ status: true })
  },
  verifyEmail: async () => {
    await delay(1500)
    return ok({ status: true, user: currentUser })
  },
  changePassword: async ({ currentPassword }) => {
    await delay(800)
    if (currentPassword === "wrong") return err("Current password is incorrect")
    return ok({ token: "new-token", user: currentUser })
  },
  updateUser: async () => {
    await delay(800)
    return ok({ status: true })
  },
  deleteUser: async ({ password }) => {
    await delay(800)
    if (password === "wrong") return err("Incorrect password")
    return ok({ success: true, message: "Account deleted" })
  },
  useSession: () => {
    if (!isLoggedIn) return { data: null, error: null, isPending: false }
    return {
      data: {
        user: currentUser,
        session: {
          id: "session-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: currentUser.id,
          expiresAt: new Date(Date.now() + 86400000),
          token: "session-token",
          impersonatedBy: impersonating ? "admin-1" : undefined,
        },
      },
      error: null,
      isPending: false,
    }
  },
}

export const mockAdminClient: AdminClientShape = {
  admin: {
    listUsers: async (query) => {
      await delay(500)
      let filtered = [...mockUsers]
      if (query?.searchValue) {
        const search = query.searchValue.toLowerCase()
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(search) || u.name.toLowerCase().includes(search),
        )
      }
      if (query?.filterField === "role" && query.filterValue) {
        filtered = filtered.filter((u) => u.role === query.filterValue)
      }
      if (query?.filterField === "banned") {
        filtered = filtered.filter((u) => !!u.banned === !!query.filterValue)
      }
      if (query?.sortBy) {
        const dir = query.sortDirection === "desc" ? -1 : 1
        filtered.sort((a, b) => {
          const aVal = String((a as Record<string, unknown>)[query.sortBy!] ?? "")
          const bVal = String((b as Record<string, unknown>)[query.sortBy!] ?? "")
          return aVal.localeCompare(bVal) * dir
        })
      }
      const offset = query?.offset ?? 0
      const limit = query?.limit ?? 20
      const page = filtered.slice(offset, offset + limit)
      return ok({ users: page, total: filtered.length })
    },
    createUser: async ({ name, email, role }) => {
      await delay(800)
      const user: UserWithRole = {
        id: String(mockUsers.length + 1),
        name,
        email,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: role ?? "user",
        banned: false,
      }
      mockUsers.push(user)
      return ok({ user })
    },
    updateUser: async ({ userId, data }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      Object.assign(user, data, { updatedAt: new Date() })
      return ok({ user })
    },
    deleteUser: async ({ userId }) => {
      await delay(800)
      const idx = mockUsers.findIndex((u) => u.id === userId)
      if (idx === -1) return err("User not found", 404)
      mockUsers.splice(idx, 1)
      return ok({ success: true })
    },
    banUser: async ({ userId, banReason }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      user.banned = true
      user.banReason = banReason
      return ok({ user })
    },
    unbanUser: async ({ userId }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      user.banned = false
      user.banReason = null
      return ok({ user })
    },
    setUserRole: async ({ userId, role }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      user.role = role
      return ok({ user })
    },
    setUserPassword: async ({ userId }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      return ok({ user })
    },
    impersonateUser: async ({ userId }) => {
      await delay(800)
      const user = mockUsers.find((u) => u.id === userId)
      if (!user) return err("User not found", 404)
      impersonating = true
      currentUser = user
      return ok({
        session: {
          id: "imp-session",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 86400000),
          token: "imp-token",
          impersonatedBy: "admin-1",
        },
        user,
      })
    },
    stopImpersonating: async () => {
      await delay(500)
      impersonating = false
      currentUser = mockUsers[0]!
      return ok({
        session: {
          id: "session-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: currentUser.id,
          expiresAt: new Date(Date.now() + 86400000),
          token: "session-token",
        },
        user: currentUser,
      })
    },
  },
}
