import { useState } from "react"
import { AuthProvider } from "@/registry/lib/auth-provider"
import { mockAuthClient, mockAdminClient } from "./lib/mock-auth-client"

import { SignInForm } from "@/registry/auth/sign-in-form"
import { SignUpForm } from "@/registry/auth/sign-up-form"
import { ForgotPasswordForm } from "@/registry/auth/forgot-password-form"
import { ResetPasswordForm } from "@/registry/auth/reset-password-form"
import { VerifyEmail } from "@/registry/auth/verify-email"
import { ChangePasswordForm } from "@/registry/auth/change-password-form"
import { UpdateProfileForm } from "@/registry/auth/update-profile-form"
import { DeleteAccountDialog } from "@/registry/auth/delete-account-dialog"
import { AdminDashboard } from "@/registry/admin/admin-dashboard"

type Tab = "auth" | "admin"
type AuthView =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "change-password"
  | "update-profile"
  | "delete-account"

function App() {
  const [tab, setTab] = useState<Tab>("auth")
  const [authView, setAuthView] = useState<AuthView>("sign-in")

  return (
    <AuthProvider authClient={mockAuthClient} adminClient={mockAdminClient}>
      <div className="min-h-screen bg-background">
        {/* Top nav */}
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold">better-auth-interface playground</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setTab("auth")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "auth"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Auth Components
              </button>
              <button
                onClick={() => setTab("admin")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        </header>

        {tab === "auth" && (
          <div className="mx-auto max-w-6xl px-6 py-8">
            {/* Auth component selector */}
            <div className="mb-8 flex flex-wrap gap-2">
              {(
                [
                  ["sign-in", "Sign In"],
                  ["sign-up", "Sign Up"],
                  ["forgot-password", "Forgot Password"],
                  ["reset-password", "Reset Password"],
                  ["verify-email", "Verify Email"],
                  ["change-password", "Change Password"],
                  ["update-profile", "Update Profile"],
                  ["delete-account", "Delete Account"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAuthView(key)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    authView === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Auth component display */}
            <div className="flex justify-center">
              {authView === "sign-in" && (
                <SignInForm
                  onSuccess={(user) => alert(`Signed in as ${user.name}`)}
                  onError={(err) => console.log("Sign in error:", err)}
                  showSignUpLink
                  signUpHref="#"
                />
              )}
              {authView === "sign-up" && (
                <SignUpForm
                  onSuccess={(user) => alert(`Account created for ${user.name}`)}
                  showSignInLink
                  signInHref="#"
                />
              )}
              {authView === "forgot-password" && (
                <ForgotPasswordForm onSuccess={() => console.log("Reset email sent")} />
              )}
              {authView === "reset-password" && (
                <ResetPasswordForm
                  token="mock-reset-token"
                  onSuccess={() => alert("Password reset successfully")}
                />
              )}
              {authView === "verify-email" && (
                <VerifyEmail
                  token="mock-verify-token"
                  onSuccess={() => console.log("Email verified")}
                />
              )}
              {authView === "change-password" && (
                <ChangePasswordForm onSuccess={() => alert("Password changed")} />
              )}
              {authView === "update-profile" && (
                <UpdateProfileForm onSuccess={(user) => alert(`Profile updated: ${user.name}`)} />
              )}
              {authView === "delete-account" && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-muted-foreground text-sm">
                    Click the button below to open the delete account dialog.
                  </p>
                  <DeleteAccountDialog onSuccess={() => alert("Account deleted")} />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="mx-auto max-w-6xl px-6 py-8">
            <AdminDashboard availableRoles={["user", "admin", "moderator"]} />
          </div>
        )}
      </div>
    </AuthProvider>
  )
}

export default App
