# better-auth-interface

> Drop-in Better Auth UI components for your React app

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](pnpm-workspace.yaml)

A [shadcn/ui](https://ui.shadcn.com)-compatible component registry that provides authentication
and admin panel components for [Better Auth](https://better-auth.com). Install components as
source code — you own and customize them directly.

## Quick start

### 1. Initialize shadcn in your project (if you haven't already)

```bash
npx shadcn init
```

### 2. Add the auth provider

```bash
npx shadcn add https://jrrdavies.github.io/better-auth-interface/r/auth-provider.json
```

Wrap your app with the provider:

```tsx
import { AuthProvider } from "@/components/auth-provider"
import { authClient } from "@/lib/auth-client"

function App({ children }: { children: React.ReactNode }) {
  return <AuthProvider authClient={authClient}>{children}</AuthProvider>
}
```

### 3. Install your first component

```bash
npx shadcn add https://jrrdavies.github.io/better-auth-interface/r/sign-in-form.json
```

```tsx
import { SignInForm } from "@/components/sign-in-form"

export default function SignInPage() {
  return (
    <SignInForm onSuccess={() => router.push("/dashboard")} showSignUpLink signUpHref="/sign-up" />
  )
}
```

## Admin dashboard

```bash
npx shadcn add https://jrrdavies.github.io/better-auth-interface/r/admin-dashboard.json
```

```tsx
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  return <AdminDashboard title="User Management" availableRoles={["user", "admin", "moderator"]} />
}
```

## Components

| Component               | Description                                   | Required Plugin |
| ----------------------- | --------------------------------------------- | --------------- |
| `auth-provider`         | React context wrapping the Better Auth client | —               |
| `sign-in-form`          | Email & password sign-in with remember me     | —               |
| `sign-up-form`          | Registration with email verification support  | —               |
| `forgot-password-form`  | Request password reset email                  | —               |
| `reset-password-form`   | Set new password from reset token             | —               |
| `verify-email`          | Email verification status display             | —               |
| `change-password-form`  | Change password for authenticated users       | —               |
| `update-profile-form`   | Update display name and avatar                | —               |
| `delete-account-dialog` | Account deletion with confirmation            | —               |
| `user-table`            | Full-featured admin user data table           | Admin           |
| `create-user-dialog`    | Admin create user form                        | Admin           |
| `edit-user-dialog`      | Admin edit user form                          | Admin           |
| `ban-user-dialog`       | Ban/unban user with reason and expiry         | Admin           |
| `set-role-dialog`       | Change user role                              | Admin           |
| `delete-user-dialog`    | Admin delete user with confirmation           | Admin           |
| `set-password-dialog`   | Admin set user password                       | Admin           |
| `impersonate-button`    | Start/stop user impersonation                 | Admin           |
| `admin-dashboard`       | Composite admin panel with all components     | Admin           |

## How it works

This project uses the [shadcn registry](https://ui.shadcn.com/docs/registry) distribution
model. Components are not installed as a package — they are copied into your project as source
code when you run `npx shadcn add`. This means you can freely customize any component to fit
your needs.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup
and code conventions.

## License

[MIT](LICENSE)
