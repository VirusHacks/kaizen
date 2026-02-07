import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            Sorry, we couldn't find the page you're looking for.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              asChild
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
