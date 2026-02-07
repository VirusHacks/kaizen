'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { getGoogleListener } from '../../../_actions/workflow-connections'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardContent } from '@/components/ui/card'
import { CardContainer } from '@/components/global/3d-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Folder, File, RefreshCw, Check } from 'lucide-react'

type DriveFile = {
  id: string
  name: string
  mimeType: string
}

type Props = {}

const GoogleDriveFiles = (props: Props) => {
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)

  const fetchFiles = async () => {
    setLoadingFiles(true)
    try {
      const response = await axios.get('/api/drive')
      if (response.data?.message?.files) {
        setFiles(response.data.message.files)
      }
    } catch (error) {
      toast.error('Failed to fetch files')
    }
    setLoadingFiles(false)
  }

  const reqGoogle = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/drive-activity', {
        params: selectedFile ? { fileId: selectedFile.id } : {}
      })
      if (response) {
        toast.success(selectedFile 
          ? `Listening to: ${selectedFile.name}` 
          : 'Listening to all Drive changes')
        setIsListening(true)
      }
    } catch (error) {
      toast.error('Failed to create listener')
    }
    setLoading(false)
  }

  const onListener = async () => {
    const listener = await getGoogleListener()
    if (listener && 'googleResourceId' in listener && listener.googleResourceId !== null) {
      setIsListening(true)
    }
  }

  useEffect(() => {
    onListener()
    fetchFiles()
  }, [])

  const isFolder = (mimeType: string) => mimeType === 'application/vnd.google-apps.folder'

  return (
    <div className="flex flex-col gap-3 pb-6">
      {isListening ? (
        <Card className="py-3">
          <CardContainer>
            <CardDescription className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Listening{selectedFile ? ` to: ${selectedFile.name}` : ' to all changes'}...
            </CardDescription>
          </CardContainer>
        </Card>
      ) : (
        <>
          {/* File/Folder Selection */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Select File/Folder (optional)</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchFiles}
                  disabled={loadingFiles}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {selectedFile && (
                <div className="mb-2 p-2 bg-primary/10 rounded-md flex items-center justify-between">
                  <span className="text-sm truncate flex items-center gap-2">
                    {isFolder(selectedFile.mimeType) 
                      ? <Folder className="h-4 w-4" /> 
                      : <File className="h-4 w-4" />}
                    {selectedFile.name}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)}
                  >
                    Clear
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {files.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {loadingFiles ? 'Loading...' : 'No files found'}
                    </p>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                          selectedFile?.id === file.id ? 'bg-accent' : ''
                        }`}
                      >
                        {isFolder(file.mimeType) 
                          ? <Folder className="h-4 w-4 text-yellow-500" /> 
                          : <File className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">
                Leave empty to watch all Drive changes
              </p>
            </CardContent>
          </Card>

          {/* Create Listener Button */}
          <Button
            variant="outline"
            onClick={reqGoogle}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {loading ? 'Creating...' : `Create Listener${selectedFile ? ` for "${selectedFile.name}"` : ''}`}
          </Button>
        </>
      )}
    </div>
  )
}

export default GoogleDriveFiles
