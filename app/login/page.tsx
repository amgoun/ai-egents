import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/auth/login-form"

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect to home if already logged in
  if (session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  )
}