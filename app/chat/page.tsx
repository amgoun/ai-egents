import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChatAgent from "@/components/chat-agent"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return <ChatAgent initialSession={session} />
} 