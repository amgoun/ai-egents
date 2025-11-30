"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, RefreshCw, Plus, Edit, ArrowLeft, ChevronRight, ChevronLeft, MessageSquare, MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ChatInterfaceProps } from "./types"

export default function ChatInterface({
  agent,
  messages,
  chats,
  currentSessionId,
  isLoading,
  message,
  session,
  onMessageChange,
  onSendMessage,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onKeyPress,
  onBack,
  onEdit,
  messagesEndRef,
  isAuthError,
  onAuthErrorClose
}: ChatInterfaceProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [editingChatId, setEditingChatId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [chatToDelete, setChatToDelete] = useState<number | null>(null)

  const startEditing = (chatId: number, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditTitle(currentTitle || "")
  }

  const cancelEditing = () => {
    setEditingChatId(null)
    setEditTitle("")
  }

  const saveTitle = async (chatId: number) => {
    if (editTitle.trim()) {
      await onRenameChat?.(chatId, editTitle.trim())
    }
    setEditingChatId(null)
  }

  const confirmDelete = (chatId: number) => {
    setChatToDelete(chatId)
  }

  const handleDelete = async () => {
    if (chatToDelete) {
      await onDeleteChat?.(chatToDelete)
      setChatToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Just now'
      
      // If today, show time
      const today = new Date()
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      // If this year, show Month Day
      if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
      
      // Otherwise show full date
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
      return 'Just now'
    }
  }

  return (
    <>
      <div className="h-full flex overflow-hidden bg-white dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
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

            <div className="flex items-center gap-2">
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
              
              {/* History Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isHistoryOpen ? "Close History" : "Open History"}
              >
                {isHistoryOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col p-4 sm:p-6 space-y-4 min-h-full">
            {messages.length === 0 ? (
              isLoading ? (
                <div className="flex flex-col items-center justify-center h-full m-auto mt-20">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading conversation...</p>
                </div>
              ) : (
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
              )
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
                        : 'bg-blue-100 dark:bg-blue-900/20'
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
              className="rounded-full bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 font-medium px-4 h-10"
              disabled={isLoading || !message.trim()}
            >
              Send
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat History Sidebar */}
      <motion.div 
        initial={{ width: 300, opacity: 1 }}
        animate={{ 
          width: isHistoryOpen ? 300 : 0,
          opacity: isHistoryOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 min-w-[300px]">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat History
          </h3>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onNewChat}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-w-[300px]">
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => onSelectChat(chat.id)}
              className={`group p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                currentSessionId === chat.id 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' 
                  : 'border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                {editingChatId === chat.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle(chat.id)
                        if (e.key === 'Escape') cancelEditing()
                      }}
                      className="h-7 py-1 px-2 text-sm bg-white dark:bg-gray-800"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      onClick={() => saveTitle(chat.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={cancelEditing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h4 className={`text-sm font-medium truncate flex-1 ${
                      currentSessionId === chat.id 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {chat.title || 'New Chat'}
                    </h4>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditing(chat.id, chat.title || 'New Chat')}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => confirmDelete(chat.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {formatDate(chat.created_at)}
              </p>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No previous chats</p>
            </div>
          )}
        </div>
        </motion.div>
      </div>

      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
              All messages and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}