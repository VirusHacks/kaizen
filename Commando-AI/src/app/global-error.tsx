"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertOctagon, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[GLOBAL_ERROR]", error)
  }, [error])

  return (
    <html>
      <body className="dark bg-black">
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertOctagon className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Application Error</CardTitle>
              <CardDescription>
                A critical error has occurred. Please refresh the page to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error.digest && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-mono text-xs text-muted-foreground">
                    Error ID: {error.digest}
                  </p>
                </div>
              )}
              <Button
                onClick={reset}
                variant="default"
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
