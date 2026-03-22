"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthClient } from "@/registry/lib/auth-provider"
import { getErrorMessage, isNetworkError } from "@/registry/lib/utils"

/** Props for the VerifyEmail component */
export interface VerifyEmailProps {
  /** Override the token from URL search params */
  token?: string | undefined
  /** Callback fired after successful email verification */
  onSuccess?: (() => void) | undefined
  /** Callback fired when verification fails */
  onError?: ((error: Error) => void) | undefined
  /** Additional CSS classes for the root element */
  className?: string | undefined
}

type VerifyState = "loading" | "success" | "error" | "invalid-token"

/**
 * Email verification status display component.
 * Reads the verification token from URL search params on mount and verifies the email.
 * Not a form — displays loading, success, or error states.
 */
export function VerifyEmail({ token: tokenProp, onSuccess, onError, className }: VerifyEmailProps) {
  const authClient = useAuthClient()
  const [state, setState] = useState<VerifyState>("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

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
          ? "Unable to connect. Please check your internet connection and try again."
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
            <CardTitle aria-busy="true">Verifying your email...</CardTitle>
            <CardDescription>Please wait while we verify your email address.</CardDescription>
          </>
        )}

        {state === "success" && (
          <>
            <CardTitle>Email verified</CardTitle>
            <CardDescription>
              Your email address has been verified successfully. You can now sign in.
            </CardDescription>
          </>
        )}

        {state === "error" && (
          <>
            <CardTitle>Verification failed</CardTitle>
            <CardDescription role="alert">{errorMessage}</CardDescription>
          </>
        )}

        {state === "invalid-token" && (
          <>
            <CardTitle>Invalid verification link</CardTitle>
            <CardDescription>
              This verification link is invalid or has expired. Please request a new verification
              email.
            </CardDescription>
          </>
        )}
      </CardHeader>
    </Card>
  )
}
