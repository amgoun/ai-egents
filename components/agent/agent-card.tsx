'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, MessageSquare, Trash2, Loader2 } from "lucide-react"
import type { Agent } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useState } from "react"

interface AgentCardProps {
  agent: Agent
  isOwner?: boolean
  isDeleting?: boolean
  onEdit?: () => void
  onChat?: () => void
  onDelete?: () => void
}

export default function AgentCard({ agent, isOwner, isDeleting = false, onEdit, onChat, onDelete }: AgentCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  console.log('AgentCard received agent:', agent)
  console.table({
    'Agent ID': agent.id,
    'Agent Name': agent.name,
    'Avatar URL': agent.avatarUrl,
    'Avatar Path': agent.avatarPath,
    'Has Avatar URL': !!agent.avatarUrl,
    'Avatar URL Type': typeof agent.avatarUrl,
    'Avatar URL Length': agent.avatarUrl?.length || 0
  })

  // Helper function to check if URL is valid
  const isValidImageUrl = (url: string | undefined) => {
    if (!url) return false
    try {
      new URL(url)
      return url.startsWith('http') && (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.webp'))
    } catch {
      return false
    }
  }

  const handleImageError = (error: any) => {
    console.error('❌ Next.js Image failed for agent:', agent.id)
    console.error('Avatar URL:', agent.avatarUrl)
    console.error('Error details:', error)
    
    // Extract hostname and path for detailed analysis
    if (agent.avatarUrl) {
      try {
        const url = new URL(agent.avatarUrl)
        console.log('🔍 URL Analysis:', {
          fullUrl: agent.avatarUrl,
          hostname: url.hostname,
          pathname: url.pathname,
          expectedHostname: 'neeyzyrrxexfghagdgra.supabase.co',
          hostnameMatch: url.hostname === 'neeyzyrrxexfghagdgra.supabase.co',
          hasPublicPath: url.pathname.includes('/storage/v1/object/public/'),
          pathSegments: url.pathname.split('/')
        })
      } catch (urlError) {
        console.error('URL parsing error:', urlError)
      }
      
      // Test the URL directly
      fetch(agent.avatarUrl)
        .then(response => {
          console.log('📡 Direct fetch test result:', {
            url: agent.avatarUrl,
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            statusText: response.statusText
          })
        })
        .catch(fetchError => {
          console.error('📡 Direct fetch failed:', fetchError.message)
        })
    }
    
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    console.log('✅ Avatar loaded successfully for agent:', agent.id)
    setImageError(false)
    setImageLoading(false)
  }

  return (
    <Card className={`p-6 hover:shadow-lg transition-all cursor-pointer group relative ${isDeleting ? 'opacity-50' : ''}`}>
      {isOwner && (
        <Badge className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 hover:bg-blue-600/20 hover:text-blue-600 transition-colors">
          Your Agent
        </Badge>
      )}
      
      {/* Loading overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <span className="text-sm font-medium text-red-600">Deleting...</span>
          </div>
        </div>
      )}
      
      {/* Avatar */}
      <div
        className={`w-16 h-16 bg-gradient-to-br ${
          agent.modelProvider === 'OpenAI'
            ? 'from-green-400 to-blue-400'
            : 'from-purple-400 to-pink-400'
        } rounded-full mx-auto mb-4 flex items-center justify-center relative overflow-hidden`}
      >
        {agent.avatarUrl && isValidImageUrl(agent.avatarUrl) && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
            <Image
              src={agent.avatarUrl as string}
              alt={agent.name || 'Agent'}
              width={64}
              height={64}
              className="w-full h-full rounded-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized={true}
              priority={false}
              loading="lazy"
            />
          </>
        ) : agent.avatarUrl && imageError ? (
          // Fallback to regular img tag when Next.js Image fails
          <img
            src={agent.avatarUrl as string}
            alt={agent.name || 'Agent'}
            className="w-full h-full rounded-full object-cover"
            onLoad={() => {
              console.log('✅ Fallback img loaded successfully for agent:', agent.id)
              setImageLoading(false)
            }}
            onError={(e) => {
              console.error('❌ Even fallback img failed for agent:', agent.id)
              console.error('Avatar URL:', agent.avatarUrl)
              
              // Replace with robot emoji on final failure
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              // Show robot emoji instead
            }}
          />
        ) : null}
        
        {/* Show robot emoji if no valid image URL or both image methods failed */}
        {(!isValidImageUrl(agent.avatarUrl || undefined) || (imageError && agent.avatarUrl)) && (
          <span className="text-2xl">🤖</span>
        )}
      </div>

      <h3 className="font-semibold text-center mb-2 text-gray-900 dark:text-white">
        {agent.name || 'Unnamed Agent'}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 line-clamp-2">
        {agent.description || agent.universe || 'No description available'}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onChat}
          disabled={isDeleting}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </Button>
        {isOwner && (
          <>
            <Button
              variant="outline"
              onClick={onEdit}
              className="px-3"
              disabled={isDeleting}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
} 