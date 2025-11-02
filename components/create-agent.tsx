"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Save, Upload, X, FileText, ImageIcon, FileSpreadsheet, FileIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { avatarFormSchema, type AvatarFormValues } from "@/components/agent-avatar"
import AgentAvatar from "@/components/agent-avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

// Update the form schema to include avatar fields
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Agent name must be at least 2 characters.",
  }),
  modelProvider: z.enum(["OpenAI", "Anthropic"], {
    required_error: "Please select an AI model provider.",
  }),
  modelVersion: z.enum(["gpt-4o-mini", "gpt-4o", "claude-3.5-sonnet", "claude-3.7-sonnet"], {
    required_error: "Please select a model version.",
  }),
  visibility: z.enum(["public", "private"], {
    required_error: "Please select visibility.",
  }),
  universe: z.string().min(10, {
    message: "Universe description must be at least 10 characters.",
  }),
  topicExpertise: z.string().min(2, {
    message: "Please provide at least one area of expertise.",
  }),
  systemPrompt: z.string().min(10, {
    message: "System prompt must be at least 10 characters.",
  }).default("You are a helpful AI assistant."),
  ...avatarFormSchema.shape
})

type FormValues = z.infer<typeof formSchema>

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: "uploading" | "completed" | "error"
  file: File
}

interface CreateAgentProps {
  onAgentCreated?: (agent: any) => void
  onAgentUpdated?: (agent: any) => void
  onCancel?: () => void
  editingAgent?: Agent | null
}

export default function CreateAgent({ onAgentCreated, onAgentUpdated, onCancel, editingAgent }: CreateAgentProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState("basic")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isAuthError, setIsAuthError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingAgent?.name || "",
      modelProvider: editingAgent?.modelProvider || "OpenAI",
      modelVersion: editingAgent?.modelVersion || "gpt-4o-mini",
      visibility: editingAgent?.visibility || "public",
      universe: editingAgent?.universe || "",
      topicExpertise: editingAgent?.topicExpertise || "",
      systemPrompt: editingAgent?.systemPrompt || "You are a helpful AI assistant.",
      useAiAvatar: false, // Default to upload image instead of AI generation
      imageDescription: "",
      avatarUrl: editingAgent?.avatarUrl || "",
      avatarPath: editingAgent?.avatarPath || "",
    },
  })

  const steps = [
    { id: "basic", label: "Basic Info", icon: "📝" },
    { id: "personality", label: "Personality", icon: "🎭" },
    { id: "style", label: "Style", icon: "🎨" },
  ]

  const models = ["OpenAI", "Anthropic"] as const

  // File handling functions
  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024 // 50MB
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ]

    if (file.size > maxSize) {
      return "File size must be less than 50MB"
    }

    if (!allowedTypes.includes(file.type)) {
      return "File type not supported. Please upload PDF, Word, Excel, or image files."
    }

    return null
  }

  const simulateUpload = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "completed" } : f))
        )
      } else {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: Math.round(progress) } : f))
        )
      }
    }, 200)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (uploadedFiles.length + files.length > 5) {
      alert("You can only upload up to 5 files at once")
      return
    }

    files.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        alert(`${file.name}: ${error}`)
        return
      }

      const fileId = Math.random().toString(36).substr(2, 9)
      const uploadFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "uploading",
        file,
      }

      setUploadedFiles((prev) => [...prev, uploadFile])
      simulateUpload(fileId)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Update the getFileIcon function to use FileIcon instead of File
  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="w-4 h-4" />
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />
    if (type.includes("word") || type.includes("document")) return <FileText className="w-4 h-4" />
    if (type.includes("sheet") || type.includes("excel")) return <FileSpreadsheet className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Preview the image
      const reader = new FileReader()
      reader.onloadend = () => {
        // setAvatarPreview(reader.result as string) // This state is no longer needed
      }
      reader.readAsDataURL(file)
      
      // Update form
      form.setValue('avatarImage', file)
      form.setValue('useAiAvatar', false)
    }
  }

  const handleGenerateAvatar = async () => {
    const description = form.getValues('imageDescription')
    if (!description) {
      toast({
        title: "Error",
        description: "Please provide an image description",
        variant: "destructive",
      })
      return
    }

    try {
      // setIsGeneratingAvatar(true) // This state is no longer needed
      const response = await fetch('/api/agents/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: description }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate avatar')
      }

      const data = await response.json()
      // setAvatarPreview(data.imageUrl) // This state is no longer needed
      form.setValue('useAiAvatar', true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate avatar",
        variant: "destructive",
      })
    } finally {
      // setIsGeneratingAvatar(false) // This state is no longer needed
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)
      console.log('Submitting form with data:', {
        ...data,
        avatarImage: data.avatarImage ? 'File present' : 'No file',
        useAiAvatar: data.useAiAvatar,
        avatarUrl: data.avatarUrl,
        avatarPath: data.avatarPath
      })

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setIsAuthError(true)
        return
      }

      let response: Response

      if (editingAgent) {
        // Update existing agent
        response = await fetch(`/api/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            description: data.universe, // Using universe as description for now
            modelProvider: data.modelProvider,
            modelVersion: data.modelVersion,
            visibility: data.visibility,
            universe: data.universe,
            topicExpertise: data.topicExpertise,
            systemPrompt: data.systemPrompt,
          }),
        })
      } else {
        // Create new agent
        const formData = new FormData()
        
        // Add avatar image if it exists and not using AI avatar
        if (!data.useAiAvatar && data.avatarImage instanceof File) {
          formData.append('avatarImage', data.avatarImage)
        }
        
        // Attach resource files for ingestion
        uploadedFiles.forEach((f, index) => {
          if (f.file) {
            formData.append('resourceFiles', f.file, f.name)
          }
        })

        // Add the rest of the form data as JSON (metadata still useful)
        formData.append('data', JSON.stringify({
          name: data.name,
          modelProvider: data.modelProvider,
          modelVersion: data.modelVersion,
          visibility: data.visibility,
          universe: data.universe,
          topicExpertise: data.topicExpertise,
          systemPrompt: data.systemPrompt,
          useAiAvatar: data.useAiAvatar,
          // Include AI-generated avatar data if present
          avatarUrl: data.useAiAvatar ? data.avatarUrl : undefined,
          avatarPath: data.useAiAvatar ? data.avatarPath : undefined,
          imageDescription: data.useAiAvatar ? data.imageDescription : undefined,
          files: uploadedFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type
          }))
        }))
        
        response = await fetch('/api/agents/create', {
          method: 'POST',
          body: formData,
        })
      }

      const result = await response.json()
      console.log('Server response:', result)

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthError(true)
          return
        }
        throw new Error(result.error || `Failed to ${editingAgent ? 'update' : 'create'} agent`)
      }

      toast({
        title: "Success!",
        description: `Agent ${editingAgent ? 'updated' : 'created'} successfully`,
        variant: "default",
      })

      // Pass the agent data to the appropriate callback
      if (editingAgent && onAgentUpdated) {
        onAgentUpdated(result.agent)
      } else if (onAgentCreated) {
        onAgentCreated(result.agent)
      }
    } catch (error) {
      console.error(`Error ${editingAgent ? 'updating' : 'creating'} agent:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingAgent ? 'update' : 'create'} agent`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get available model versions based on selected provider
  const getModelVersions = (provider: "OpenAI" | "Anthropic") => {
    switch (provider) {
      case "OpenAI":
        return [
          { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Best value - 1x tokens" },
          { value: "gpt-4o", label: "GPT-4o", description: "Premium quality - 3x tokens" }
        ]
      case "Anthropic":
        return [
          { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", description: "Balanced - 2x tokens" },
          { value: "claude-3.7-sonnet", label: "Claude 3.7 Sonnet", description: "Latest - 2.5x tokens" }
        ]
      default:
        return []
    }
  }

  // Watch modelProvider to update modelVersion options
  const modelProvider = form.watch("modelProvider")
  const modelVersions = getModelVersions(modelProvider)

  // Update modelVersion when provider changes
  useEffect(() => {
    // Set first available version for the selected provider
    if (modelVersions.length > 0) {
      form.setValue("modelVersion", modelVersions[0].value as any)
    }
  }, [modelProvider])

  return (
    <Form {...form}>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Auth Error Message */}
        {isAuthError && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-semibold mb-4">Authentication Required</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please sign in to create AI agents.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsAuthError(false)
                  onCancel?.()
                }}>
                  Cancel
                </Button>
                <Button onClick={() => window.location.href = '/login'}>
                  Sign In
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Left Panel - Form Content */}
        <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-md mx-auto lg:mx-0">
            <div className="mb-6 lg:mb-8">
              <Badge variant="secondary" className="mb-4 bg-yellow-100 text-yellow-800">
                {editingAgent ? 'AGENT EDITOR' : 'AGENT CREATOR'}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {editingAgent ? 'Edit your AI Agent' : 'Create your own AI Agent in a'}
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 lg:mb-8">
                {editingAgent ? 'Update agent details' : 'Few easy steps!'}
              </h2>
            </div>

            {/* Steps */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 lg:mb-8">
              {steps.map((step) => (
                <motion.button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors text-sm ${
                    activeStep === step.id
                      ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{step.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{step.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Agent Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose AI Model Provider</FormLabel>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {models.map((model) => (
                        <Button
                          key={model}
                          type="button"
                          variant={field.value === model ? "default" : "outline"}
                          onClick={() => field.onChange(model)}
                          className="flex-1"
                        >
                          {model}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelVersion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Version</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-950">
                          <SelectValue placeholder="Select a model version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modelVersions.map(version => (
                          <SelectItem key={version.value} value={version.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{version.label}</span>
                              <span className="text-xs text-muted-foreground">{version.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Different models cost different amounts of tokens. GPT-4o Mini is the most efficient.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Agent Visibility</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="public" id="public" />
                          <Label htmlFor="public">
                            <div className="flex flex-col">
                              <span className="font-medium">Public</span>
                              <span className="text-sm text-gray-500">Other users can chat with this agent</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="private" id="private" />
                          <Label htmlFor="private">
                            <div className="flex flex-col">
                              <span className="font-medium">Private</span>
                              <span className="text-sm text-gray-500">Only you can chat with this agent</span>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="universe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Universe</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter Universe"
                        className="h-24 sm:h-32 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the universe or context your agent operates in
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topicExpertise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic Expertise</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Comma-separated (e.g. AI, Robotics, Music)"
                        className="h-24 sm:h-32 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List the areas of expertise for your agent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the system prompt that defines your agent's behavior"
                        className="h-24 sm:h-32 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Define how your agent should behave and what role it should play
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Upload Resources <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Upload documents, images, or spreadsheets to enhance your agent's knowledge. Max 50MB per file, up to 5
                  files.
                </p>

                {/* Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={uploadedFiles.length >= 5}
                  className="w-full mb-4 border-dashed border-2 h-20 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {uploadedFiles.length >= 5 ? "Maximum files reached" : "Click to upload files"}
                      </p>
                      <p className="text-xs text-gray-500">PDF, Word, Excel, Images</p>
                    </div>
                  </div>
                </Button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Uploaded Files ({uploadedFiles.length}/5)
                    </h4>
                    {uploadedFiles.map((file) => (
                      <Card key={file.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-500 dark:text-gray-400">{getFileIcon(file.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                            {file.status === "uploading" && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    Uploading... {file.progress}%
                                  </span>
                                </div>
                                <Progress value={file.progress} className="h-1" />
                              </div>
                            )}
                            {file.status === "completed" && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Upload completed</p>
                            )}
                            {file.status === "error" && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">✗ Upload failed</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(file.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {editingAgent ? 'Updating Agent...' : 'Creating Agent...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingAgent ? 'Update Agent' : 'Save Agent'}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Panel - Image Generator */}
        <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 min-h-[400px] lg:min-h-full">
          <AgentAvatar form={form} />
        </div>
      </div>
    </Form>
  )
}
