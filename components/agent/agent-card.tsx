'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, MessageSquare } from "lucide-react"
import type { Agent } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useState } from "react"

interface AgentCardProps {
  agent: Agent
  isOwner?: boolean
  onEdit?: () => void
  onChat?: () => void
}

export default function AgentCard({ agent, isOwner, onEdit, onChat }: AgentCardProps) {
  const [imageError, setImageError] = useState(false)
  
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

  return (
    <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group relative">
      {isOwner && (
        <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1">
          Your Agent
        </Badge>
      )}
      
      {/* Avatar */}
      <div
        className={`w-16 h-16 bg-gradient-to-br ${
          agent.modelProvider === 'OpenAI'
            ? 'from-green-400 to-blue-400'
            : 'from-purple-400 to-pink-400'
        } rounded-full mx-auto mb-4 flex items-center justify-center relative overflow-hidden`}
      >
        {agent.avatarUrl && agent.avatarUrl.length > 0 && !imageError ? (
          <>
            <Image
              src={agent.avatarUrl}
              alt={agent.name || 'Agent'}
              width={48}
              height={48}
              className="rounded-full object-cover"
              onLoad={() => {
                console.log('✅ Avatar loaded successfully for agent:', agent.id);
                setImageError(false);
              }}
              onError={(e) => {
                console.error('❌ Next.js Image failed for agent:', agent.id);
                console.error('Avatar URL:', agent.avatarUrl);
                setImageError(true); // This will trigger fallback to regular img
              }}
              unoptimized={true}
            />
          </>
        ) : agent.avatarUrl && agent.avatarUrl.length > 0 && imageError ? (
          // Fallback to regular img tag when Next.js Image fails
          <>
            <img
              src={agent.avatarUrl}
              alt={agent.name || 'Agent'}
              className="w-12 h-12 rounded-full object-cover"
              onLoad={() => {
                console.log('✅ Fallback img loaded successfully for agent:', agent.id);
              }}
              onError={(e) => {
                console.error('❌ Even fallback img failed for agent:', agent.id);
                console.error('Avatar URL:', agent.avatarUrl);
                
                // Test if the URL is accessible
                if (agent.avatarUrl) {
                  fetch(agent.avatarUrl)
                    .then(response => {
                      console.log('📡 Direct fetch test:', {
                        url: agent.avatarUrl,
                        status: response.status,
                        ok: response.ok,
                        contentType: response.headers.get('content-type')
                      });
                    })
                    .catch(fetchError => {
                      console.error('📡 Direct fetch failed:', fetchError.message);
                    });
                }
                
                // Replace with robot emoji on error
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16">🤖</text></svg>';
              }}
            />
          </>
        ) : (
          <>
            <span className="text-2xl">🤖</span>
          </>
        )}
        
        {/* Debug info - show part of URL */}
        <div className="absolute bottom-0 left-0 right-0 text-xs text-gray-500 bg-black bg-opacity-50  p-1 text-center">
          {agent.avatarUrl ? `URL: ${agent.avatarUrl.slice(-20)}` : 'No avatar URL'}
        </div>
      </div>

      <h3 className="font-semibold text-center mb-2 text-gray-900 dark:text-white">
        {agent.name || 'Unnamed Agent'}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3 line-clamp-2">
        {agent.description || agent.universe || 'No description available'}
      </p>

      {/* Expertise tags */}
      <div className="flex flex-wrap gap-1 justify-center mb-4">
        {agent.topicExpertise ? (
          <>
            {agent.topicExpertise.split(',').slice(0, 2).map((skill, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
              >
                {skill.trim()}
              </span>
            ))}
            {agent.topicExpertise.split(',').length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{agent.topicExpertise.split(',').length - 2} more
              </span>
            )}
          </>
        ) : (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
            General
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onChat}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  )
} 