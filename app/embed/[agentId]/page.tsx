"use client"

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, RefreshCw } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'

export default function EmbedChatPage() {
  const params = useParams()
  const agentId = Number(params.agentId)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [visitorId, setVisitorId] = useState("")
  const [sessionId, setSessionId] = useState<number | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vid = localStorage.getItem('visitor_id')
    if (!vid) {
        vid = uuidv4()
        localStorage.setItem('visitor_id', vid)
    }
    setVisitorId(vid)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
        const res = await fetch('/api/chat/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMsg,
                agentId,
                visitorId,
                sessionId
            })
        })
        
        if (!res.ok) throw new Error('Failed to send message')

        const data = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)
        
        if (data.messages) {
            setMessages(prev => [...prev, ...data.messages])
        }
    } catch (e) {
        console.error(e)
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }])
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                        🤖
                    </div>
                    <p>How can I help you today?</p>
                </div>
            )}
            {messages.map((m, i) => (
                <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        m.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start mb-3">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm">
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>
        <div className="p-3 border-t bg-white flex gap-2">
            <Input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isLoading}
            />
            <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
            >
                <Send className="w-4 h-4" />
            </Button>
        </div>
    </div>
  )
}

