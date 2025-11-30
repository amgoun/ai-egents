import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating chat session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete messages first (cascade should handle this but being safe)
    const { error: msgError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', params.id)
      
    if (msgError) console.error('Error deleting messages:', msgError)

    // Delete token usage records related to this session
    const { error: tokenError } = await supabase
      .from('token_usage')
      .delete()
      .eq('session_id', params.id)

    if (tokenError) console.error('Error deleting token usage:', tokenError)

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

