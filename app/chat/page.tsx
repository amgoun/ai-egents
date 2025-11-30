import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChatAgent from "@/components/chat-agent"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // We need to pass a session object to ChatAgent. 
  // We can reconstruct a minimal session object or fetch it if needed.
  // Since ChatAgent primarily uses it for user ID, we can pass a mock session with the user.
  // Or we can fetch the session *after* verifying the user.
  const { data: { session } } = await supabase.auth.getSession()
  
  return <ChatAgent initialSession={session!} />
} 