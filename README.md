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

### 2. Add the registry

Add this to your project's `components.json`:

```json
{
  "registries": {
    "@better-auth-interface": "https://jrrdavies.github.io/better-auth-interface/r/{name}.json"
  }
}
```

### 3. Add the auth provider

```bash
npx shadcn add @better-auth-interface/auth-provider
```

Wrap your app with the provider:

```tsx
import { AuthProvider } from "@/components/auth-provider"
import { authClient } from "@/lib/auth-client"

function App({ children }: { children: React.ReactNode }) {
  return <AuthProvider authClient={authClient}>{children}</AuthProvider>
}
```

### 4. Install your first component

```bash
npx shadcn add @better-auth-interface/sign-in-form
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
npx shadcn add @better-auth-interface/admin-dashboard
```

```tsx
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  return <AdminDashboard title="User Management" availableRoles={["user", "admin", "moderator"]} />
}
```

## Components

| Component               | Install                                                       | Required Plugin |
| ----------------------- | ------------------------------------------------------------- | --------------- |
| `auth-provider`         | `npx shadcn add @better-auth-interface/auth-provider`         | —               |
| `sign-in-form`          | `npx shadcn add @better-auth-interface/sign-in-form`          | —               |
| `sign-up-form`          | `npx shadcn add @better-auth-interface/sign-up-form`          | —               |
| `forgot-password-form`  | `npx shadcn add @better-auth-interface/forgot-password-form`  | —               |
| `reset-password-form`   | `npx shadcn add @better-auth-interface/reset-password-form`   | —               |
| `verify-email`          | `npx shadcn add @better-auth-interface/verify-email`          | —               |
| `change-password-form`  | `npx shadcn add @better-auth-interface/change-password-form`  | —               |
| `update-profile-form`   | `npx shadcn add @better-auth-interface/update-profile-form`   | —               |
| `delete-account-dialog` | `npx shadcn add @better-auth-interface/delete-account-dialog` | —               |
| `user-table`            | `npx shadcn add @better-auth-interface/user-table`            | Admin           |
| `create-user-dialog`    | `npx shadcn add @better-auth-interface/create-user-dialog`    | Admin           |
| `edit-user-dialog`      | `npx shadcn add @better-auth-interface/edit-user-dialog`      | Admin           |
| `ban-user-dialog`       | `npx shadcn add @better-auth-interface/ban-user-dialog`       | Admin           |
| `set-role-dialog`       | `npx shadcn add @better-auth-interface/set-role-dialog`       | Admin           |
| `delete-user-dialog`    | `npx shadcn add @better-auth-interface/delete-user-dialog`    | Admin           |
| `set-password-dialog`   | `npx shadcn add @better-auth-interface/set-password-dialog`   | Admin           |
| `impersonate-button`    | `npx shadcn add @better-auth-interface/impersonate-button`    | Admin           |
| `admin-dashboard`       | `npx shadcn add @better-auth-interface/admin-dashboard`       | Admin           |

<details>
<summary>Manual installation (without registry config)</summary>

If you prefer not to add the registry to `components.json`, you can install any component using the full URL:

```bash
npx shadcn add https://jrrdavies.github.io/better-auth-interface/r/sign-in-form.json
```

</details>

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
