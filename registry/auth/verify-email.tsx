"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"

/** Overridable UI strings for i18n / custom copy. */
export interface VerifyEmailLabels {
  loadingTitle?: string
  loadingDescription?: string
  successTitle?: string
  successDescription?: string
  errorTitle?: string
  invalidTitle?: string
  invalidDescription?: string
  networkError?: string
}

const DEFAULT_LABELS: Required<VerifyEmailLabels> = {
  loadingTitle: "Verifying your email...",
  loadingDescription: "Please wait while we verify your email address.",
  successTitle: "Email verified",
  successDescription: "Your email address has been verified successfully. You can now sign in.",
  errorTitle: "Verification failed",
  invalidTitle: "Invalid verification link",
  invalidDescription:
    "This verification link is invalid or has expired. Please request a new verification email.",
  networkError: "Unable to connect. Please check your internet connection and try again.",
}

/** Props for the VerifyEmail component */
export interface VerifyEmailProps {
  /** Override the token from URL search params */
  token?: string | undefined
  /** Callback fired after successful email verification */
  onSuccess?: (() => void) | undefined
  /** Callback fired when verification fails */
  onError?: ((error: Error) => void) | undefined
  /** Overridable UI strings for i18n / custom copy */
  labels?: VerifyEmailLabels | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

type VerifyState = "loading" | "success" | "error" | "invalid-token"

/**
 * Email verification status display component.
 * Reads the verification token from URL search params on mount and verifies the email.
 * Not a form — displays loading, success, or error states.
 */
export function VerifyEmail({
  token: tokenProp,
  onSuccess,
  onError,
  labels,
  className,
}: VerifyEmailProps) {
  const authClient = useAuthClient()
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const [state, setState] = useState<VerifyState>("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const networkErrorRef = useRef(l.networkError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError
  networkErrorRef.current = l.networkError

  const token =
    tokenProp ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null)

  useEffect(() => {
    if (!token) {
      setState("invalid-token")
      return
    }

    let cancelled = false

    async function verify() {
      const result = await authClient.verifyEmail({ token: token as string })

      if (cancelled) return

      if (result.error) {
        const message = isNetworkError(result.error)
          ? networkErrorRef.current
          : getErrorMessage(result.error)
        setErrorMessage(message)
        setState("error")
        onErrorRef.current?.(new Error(message))
        return
      }

      setState("success")
      onSuccessRef.current?.()
    }

    void verify()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authClient])

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        {state === "loading" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <CardTitle aria-busy="true">{l.loadingTitle}</CardTitle>
            <CardDescription>{l.loadingDescription}</CardDescription>
          </>
        )}

        {state === "success" && (
          <>
            <CardTitle>{l.successTitle}</CardTitle>
            <CardDescription>{l.successDescription}</CardDescription>
          </>
        )}

        {state === "error" && (
          <>
            <CardTitle>{l.errorTitle}</CardTitle>
            <CardDescription role="alert">{errorMessage}</CardDescription>
          </>
        )}

        {state === "invalid-token" && (
          <>
            <CardTitle>{l.invalidTitle}</CardTitle>
            <CardDescription>{l.invalidDescription}</CardDescription>
          </>
        )}
      </CardHeader>
    </Card>
  )
}
