import { useState, useRef } from 'react'
import { MessageType } from '../types'

interface MediaInputProps {
  type: 'image' | 'video' | 'file' | 'audio'
  onSend: (type: MessageType, content: string, fileName: string) => void
}

export function MediaInput({ type, onSend }: MediaInputProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const { url, fileName } = await response.json()
      onSend(type, url, fileName)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', audioBlob, 'audio.webm')
        formData.append('type', 'audio')

        setIsUploading(true)
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          const { url, fileName } = await response.json()
          onSend('audio', url, fileName)
        } catch (error) {
          console.error('Upload failed:', error)
        } finally {
          setIsUploading(false)
        }
      }

      audioRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    audioRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="media-input">
      {type === 'audio' ? (
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
        >
          {isRecording ? '停止录音' : '开始录音'}
        </button>
      ) : (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={
              type === 'image' ? 'image/*' :
              type === 'video' ? 'video/*' :
              '*'
            }
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? '上传中...' : `发送${
              type === 'image' ? '图片' :
              type === 'video' ? '视频' :
              '文件'
            }`}
          </button>
        </>
      )}
    </div>
  )
} 