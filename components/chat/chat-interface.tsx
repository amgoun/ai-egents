"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, RefreshCw, Plus, Edit, ArrowLeft } from "lucide-react"
import type { ChatInterfaceProps } from "./types"

export default function ChatInterface({
  agent,
  messages,
  isLoading,
  message,
  session,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onBack,
  onEdit,
  messagesEndRef,
  isAuthError,
  onAuthErrorClose
}: ChatInterfaceProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className={`w-10 h-10 bg-gradient-to-br ${
                agent.modelProvider === 'OpenAI' 
                  ? 'from-green-400 to-blue-400'
                  : 'from-purple-400 to-pink-400'
              } rounded-full flex items-center justify-center`}
            >
              {agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt={agent.name} className="w-8 h-8 rounded-full" />
              ) : (
                <span className="text-xl">🤖</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{agent.name}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{agent.description || agent.universe}</p>
            </div>
          </div>

          {/* Edit button for owned agents */}
          {agent.creatorId === session?.user?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(agent)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Agent
            </Button>
          )}
        </div>
      </div>

      {/* Chat Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center my-8"
            >
              <div
                className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${
                  agent.modelProvider === 'OpenAI' 
                    ? 'from-green-400 to-blue-400'
                    : 'from-purple-400 to-pink-400'
                } flex items-center justify-center`}
              >
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt={agent.name} className="w-24 h-24 rounded-full" />
                ) : (
                  <span className="text-4xl">🤖</span>
                )}
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Chat with {agent.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start a conversation with {agent.name}. Ask anything about {agent.topicExpertise}.
              </p>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                      agent.modelProvider === 'OpenAI' 
                        ? 'from-green-400 to-blue-400'
                        : 'from-purple-400 to-pink-400'
                    } flex items-center justify-center flex-shrink-0`}
                  >
                    {agent.avatarUrl ? (
                      <img src={agent.avatarUrl} alt={agent.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="text-xs">🤖</span>
                    )}
                  </div>
                )}
                <Card 
                  className={`${
                    msg.role === 'user' 
                      ? 'bg-red-100 dark:bg-red-900/20' 
                      : 'bg-yellow-100 dark:bg-yellow-900/20'
                  } p-3 max-w-md`}
                >
                  <p className="text-sm text-gray-900 dark:text-white">{msg.content}</p>
                </Card>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Auth Error Message */}
      {isAuthError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-semibold mb-4">Authentication Required</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please sign in to chat with AI agents.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onAuthErrorClose}>
                Cancel
              </Button>
              <Button onClick={() => window.location.href = '/login'}>
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            size="icon"
            variant="outline"
            className="rounded-full w-10 h-10 flex-shrink-0 bg-black dark:bg-white text-white dark:text-black border-0"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={`Message ${agent.name}...`}
              className="pr-12 py-3 rounded-full bg-gray-100 dark:bg-gray-700 border-0"
              disabled={isLoading}
            />
          </div>

          <Button
            size="icon"
            variant="outline"
            className="rounded-full w-10 h-10 flex-shrink-0 bg-transparent border-gray-200 dark:border-gray-600"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={onSendMessage}
            className="rounded-full bg-yellow-400 hover:bg-yellow-500 text-black flex-shrink-0 font-medium px-4 h-10"
            disabled={isLoading || !message.trim()}
          >
            Send
            <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
} 