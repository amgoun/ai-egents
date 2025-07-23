"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { UseFormReturn } from "react-hook-form"
import { z } from "zod"

// Avatar form schema
export const avatarFormSchema = z.object({
  useAiAvatar: z.boolean().default(true),
  imageDescription: z.string().optional(),
  avatarImage: z.any().optional(),
  avatarUrl: z.string().optional(),
  avatarPath: z.string().optional(),
})

export type AvatarFormValues = z.infer<typeof avatarFormSchema>

interface AgentAvatarProps {
  form: UseFormReturn<any>
}

export default function AgentAvatar({ form }: AgentAvatarProps) {
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Add useEffect to handle initial avatar
  useEffect(() => {
    const avatarUrl = form.getValues('avatarUrl')
    const avatarPath = form.getValues('avatarPath')
    
    console.log('Initial avatar values:', { avatarUrl, avatarPath })
    
    if (avatarUrl) {
      setAvatarPreview(avatarUrl)
    }
  }, [form])

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Preview the image
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Update form
      form.setValue('avatarImage', file)
      form.setValue('useAiAvatar', false)
      // Clear any existing AI avatar path and description
      form.setValue('avatarPath', undefined)
      form.setValue('avatarUrl', undefined)
      form.setValue('imageDescription', '')
      
      // Show success message
      toast.success('Avatar uploaded successfully!')
    }
  }

  const handleGenerateAvatar = async () => {
    const description = form.getValues('imageDescription')
    if (!description) {
      toast.error('Please provide an image description')
      return
    }

    try {
      setIsGeneratingAvatar(true)
      const response = await fetch('/api/agents/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: description,
          oldAvatarPath: form.getValues('avatarPath')
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate avatar')
      }

      const data = await response.json()
      console.log('Avatar generation response:', data)
      
      if (!data.imageUrl || !data.imagePath) {
        throw new Error('Invalid response from avatar generation')
      }

      // Update preview and form values
      setAvatarPreview(data.imageUrl)
      form.setValue('avatarUrl', data.imageUrl)
      form.setValue('avatarPath', data.imagePath)
      form.setValue('useAiAvatar', true)
      form.setValue('avatarImage', undefined)
      
      // Reset the description field
      form.setValue('imageDescription', '')
      
      // Show success message
      toast.success('Avatar generated successfully!')
      
      console.log('Updated form values:', {
        preview: data.imageUrl,
        formUrl: form.getValues('avatarUrl'),
        formPath: form.getValues('avatarPath'),
        useAiAvatar: form.getValues('useAiAvatar')
      })
    } catch (error) {
      console.error('Avatar generation error:', error)
      toast.error('Failed to generate avatar', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setIsGeneratingAvatar(false)
    }
  }

  return (
    <Card className="h-full relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 border-0">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative h-full flex flex-col min-h-[350px]">
        {/* Title and Generate Button */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-white">Agent Avatar</h2>
          {form.watch('useAiAvatar') && (
            <Button 
              size="sm" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium text-xs sm:text-sm"
              onClick={handleGenerateAvatar}
              disabled={isGeneratingAvatar || !form.watch('imageDescription')}
            >
              {isGeneratingAvatar ? (
                <>
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">Gen...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Generate Avatar</span>
                  <span className="sm:hidden">Generate</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Avatar Preview */}
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 mx-auto mb-4 rounded-lg overflow-hidden">
              {avatarPreview ? (
                <>
                  <img 
                    src={avatarPreview} 
                    alt="Agent Avatar Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', {
                        src: avatarPreview,
                        formUrl: form.getValues('avatarUrl'),
                        formPath: form.getValues('avatarPath'),
                        error: e
                      });
                      toast.error('Failed to load avatar image. Check console for details.');
                    }}
                    onLoad={() => {
                      console.log('Avatar image loaded successfully:', {
                        src: avatarPreview,
                        formUrl: form.getValues('avatarUrl'),
                        formPath: form.getValues('avatarPath')
                      });
                    }}
                  />
                  <div className="text-center mt-2 text-sm text-white">Agent Avatar Preview</div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center flex-col">
                  <span className="text-3xl sm:text-4xl lg:text-6xl mb-2">🤖</span>
                  <div className="text-white text-sm">Agent Avatar Preview</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <div className="p-3 sm:p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="avatar-type">Use AI Generated Avatar</Label>
              <FormField
                control={form.control}
                name="useAiAvatar"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked)
                          if (!checked) {
                            form.setValue('imageDescription', '')
                            form.setValue('avatarUrl', undefined)
                            form.setValue('avatarPath', undefined)
                            setAvatarPreview(null)
                          } else {
                            form.setValue('avatarImage', undefined)
                            setAvatarPreview(null)
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

              {form.watch('useAiAvatar') ? (
                <FormField
                  control={form.control}
                  name="imageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Generation Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe how you want your agent to look"
                          className="w-full h-16 sm:h-20 resize-none border-0 bg-transparent text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Be specific about the style, colors, and characteristics you want
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <Label>Upload Avatar Image</Label>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                  <FormDescription>
                    Upload a square image (recommended size: 512x512px)
                  </FormDescription>
                </div>
              )}
            </div>
          </Card>
        </div>
    </Card>
  )
} 