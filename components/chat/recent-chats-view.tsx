"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, RefreshCw } from "lucide-react"
import Image from "next/image"
import type { ChatSession } from "./types"

interface RecentChatsViewProps {
  chats: ChatSession[]
  isLoading: boolean
  onChatSelect: (chat: ChatSession) => void
  onBrowse?: () => void
}

export default function RecentChatsView({
  chats,
  isLoading,
  onChatSelect,
  onBrowse
}: RecentChatsViewProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Chats</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">View your recent conversations with AI agents</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="animate-spin">
              <RefreshCw className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">Loading your chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No chats yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Start a conversation with an AI agent by browsing our collection and selecting one to chat with.
            </p>
            <Button onClick={onBrowse} className="bg-yellow-400 hover:bg-yellow-500 text-black">
              Browse Agents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`p-4 hover:shadow-lg transition-all cursor-pointer ${isLoading ? 'opacity-50' : ''}`}
                onClick={() => !isLoading && onChatSelect(chat)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                      chat.agent.modelProvider === 'OpenAI'
                        ? 'from-green-400 to-blue-400'
                        : 'from-purple-400 to-pink-400'
                    } flex items-center justify-center`}
                  >
                    {chat.agent.avatarUrl ? (
                      <Image
                        src={chat.agent.avatarUrl}
                        alt={chat.agent.name}
                        className="w-8 h-8 rounded-full"
                        width={32}
                        height={32}
                        unoptimized
                      />
                    ) : (
                      <span className="text-lg">🤖</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{chat.agent.name}</h3>
                    <p className="text-sm text-gray-500">{new Date(chat.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{chat.title}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 