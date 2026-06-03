import { useState } from "react"
import { AuthProvider } from "@/registry/lib/auth-provider"
import { mockAuthClient, mockAdminClient } from "./lib/mock-auth-client"
import type { UserWithRole } from "@/registry/lib/auth-types"

import { SignInForm } from "@/registry/auth/sign-in-form"
import { SignUpForm } from "@/registry/auth/sign-up-form"
import { ForgotPasswordForm } from "@/registry/auth/forgot-password-form"
import { ResetPasswordForm } from "@/registry/auth/reset-password-form"
import { VerifyEmail } from "@/registry/auth/verify-email"
import { ChangePasswordForm } from "@/registry/auth/change-password-form"
import { UpdateProfileForm } from "@/registry/auth/update-profile-form"
import { DeleteAccountDialog } from "@/registry/auth/delete-account-dialog"
import { AdminDashboard } from "@/registry/admin/admin-dashboard"
import type { AdminDashboardLabels, AdminDialogLabels } from "@/registry/admin/admin-dashboard"
import type { UserAction, UserTableLabels } from "@/registry/admin/user-table"

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
type Lang = "en" | "nl"

const NL_ADMIN_LABELS: AdminDashboardLabels = {
  totalUsers: "Totaal gebruikers",
  totalUsersDescription: "Geregistreerde accounts",
  bannedUsers: "Geblokkeerde gebruikers",
  bannedUsersDescription: "Momenteel geblokkeerd",
  admins: "Beheerders",
  adminsDescription: "Gebruikers met de admin-rol",
  notSignedIn: "Je moet als beheerder ingelogd zijn.",
  statsErrorTitle: "Statistieken laden mislukt",
}

const NL_TABLE_LABELS: UserTableLabels = {
  searchPlaceholder: "Zoeken op e-mail...",
  allRoles: "Alle rollen",
  allStatuses: "Alle statussen",
  active: "Actief",
  banned: "Geblokkeerd",
  columnUser: "Gebruiker",
  columnRole: "Rol",
  columnStatus: "Status",
  columnCreated: "Aangemaakt",
  edit: "Bewerken",
  setRole: "Rol instellen",
  ban: "Blokkeren",
  unban: "Deblokkeren",
  setPassword: "Wachtwoord instellen",
  impersonate: "Imiteren",
  delete: "Verwijderen",
  loading: "Gebruikers laden...",
  empty: "Geen gebruikers gevonden.",
  notSignedIn: "Je moet ingelogd zijn.",
  loadErrorTitle: "Gebruikers laden mislukt",
  retry: "Opnieuw proberen",
  previous: "Vorige",
  next: "Volgende",
  totalUsers: (total) => `${total} gebruiker${total !== 1 ? "s" : ""} totaal`,
  pageOf: (page, totalPages) => `Pagina ${page} van ${totalPages}`,
}

const NL_DIALOG_LABELS: AdminDialogLabels = {
  createUser: {
    triggerText: "Gebruiker aanmaken",
    title: "Gebruiker aanmaken",
    description: "Voeg een nieuwe gebruiker toe.",
    nameLabel: "Naam",
    emailLabel: "E-mail",
    passwordLabel: "Wachtwoord",
    roleLabel: "Rol",
    cancel: "Annuleren",
    submit: "Aanmaken",
    submitting: "Aanmaken...",
    nameRequired: "Naam is verplicht",
    emailRequired: "E-mail is verplicht",
    emailInvalid: "Voer een geldig e-mailadres in",
    passwordMin: "Wachtwoord moet minstens 8 tekens zijn",
    roleRequired: "Rol is verplicht",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  editUser: {
    triggerText: "Bewerken",
    title: "Gebruiker bewerken",
    description: (user) => `Werk de gegevens van ${user.name} bij.`,
    nameLabel: "Naam",
    emailLabel: "E-mail",
    roleLabel: "Rol",
    cancel: "Annuleren",
    submit: "Opslaan",
    submitting: "Opslaan...",
    nameRequired: "Naam is verplicht",
    emailRequired: "E-mail is verplicht",
    emailInvalid: "Voer een geldig e-mailadres in",
    roleRequired: "Rol is verplicht",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  setRole: {
    triggerText: "Rol instellen",
    title: "Rol instellen",
    description: (user) => `Wijzig de rol voor ${user.name} (${user.email}).`,
    roleLabel: "Rol",
    cancel: "Annuleren",
    submit: "Rol opslaan",
    submitting: "Opslaan...",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  banUser: {
    banTrigger: "Blokkeren",
    unbanTrigger: "Deblokkeren",
    banTitle: "Gebruiker blokkeren",
    unbanTitle: "Gebruiker deblokkeren",
    banDescription: (u) => `Blokkeer ${u.name} (${u.email}) van het platform.`,
    unbanDescription: (u) => `Hef de blokkade op voor ${u.name} (${u.email}).`,
    banReasonLabel: "Reden",
    banReasonPlaceholder: "Reden voor blokkade (optioneel)",
    permanentLabel: "Permanente blokkade",
    durationLabel: "Duur (dagen)",
    cancel: "Annuleren",
    banSubmit: "Blokkeren",
    banSubmitting: "Blokkeren...",
    unbanSubmit: "Deblokkeren",
    unbanSubmitting: "Deblokkeren...",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  deleteUser: {
    triggerText: "Verwijderen",
    title: "Gebruiker verwijderen",
    description: (u) =>
      `Weet je zeker dat je ${u.name} (${u.email}) wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
    cancel: "Annuleren",
    submit: "Verwijderen",
    submitting: "Verwijderen...",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  setPassword: {
    triggerText: "Wachtwoord instellen",
    title: "Wachtwoord instellen",
    description: (u) => `Stel een nieuw wachtwoord in voor ${u.name} (${u.email}).`,
    passwordLabel: "Nieuw wachtwoord",
    confirmPasswordLabel: "Bevestig wachtwoord",
    cancel: "Annuleren",
    submit: "Instellen",
    submitting: "Instellen...",
    passwordMin: "Wachtwoord moet minstens 8 tekens zijn",
    confirmRequired: "Bevestig het wachtwoord",
    passwordsNoMatch: "Wachtwoorden komen niet overeen",
    networkError: "Kan geen verbinding maken. Probeer opnieuw.",
  },
  impersonate: {
    impersonatingBanner: (name) => (
      <>
        Imiteren van <strong>{name}</strong>
      </>
    ),
    stop: "Stoppen",
    stopping: "Stoppen...",
    impersonate: (userName) => `Imiteer ${userName}`,
    starting: "Starten...",
  },
}

function App() {
  const [tab, setTab] = useState<Tab>("auth")
  const [authView, setAuthView] = useState<AuthView>("sign-in")
  const [lang, setLang] = useState<Lang>("en")
  const [protectAdmins, setProtectAdmins] = useState(false)

  const canPerformAction = protectAdmins
    ? (_action: UserAction, user: UserWithRole) => user.role !== "admin"
    : undefined

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
            {/* Config controls — demonstrate the new configurable props live */}
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">labels / tableLabels:</span>
                {(["en", "nl"] as const).map((code) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`rounded-md border px-2.5 py-1 uppercase transition-colors ${
                      lang === code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={protectAdmins}
                  onChange={(e) => setProtectAdmins(e.target.checked)}
                />
                <span className="text-muted-foreground font-medium">
                  canPerformAction: protect admin accounts (no row actions on admins)
                </span>
              </label>
            </div>

            <AdminDashboard
              title={lang === "nl" ? "Gebruikersbeheer" : "User Management"}
              description={
                lang === "nl" ? "Beheer gebruikers en rollen" : "Manage users and permissions"
              }
              assignableRoles={["user", "admin", "moderator"]}
              searchField="email"
              canPerformAction={canPerformAction}
              labels={lang === "nl" ? NL_ADMIN_LABELS : undefined}
              tableLabels={lang === "nl" ? NL_TABLE_LABELS : undefined}
              dialogLabels={lang === "nl" ? NL_DIALOG_LABELS : undefined}
            />
          </div>
        )}
      </div>
    </AuthProvider>
  )
}

export default App
