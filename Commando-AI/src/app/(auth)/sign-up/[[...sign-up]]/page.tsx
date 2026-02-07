"use client"; // Ensure it's a Client Component

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      afterSignUpUrl="/dashboard"
    />
  )
}
