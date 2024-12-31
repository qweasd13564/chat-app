import { useState } from 'react'
import { MediaInput } from './MediaInput'
import { MessageType } from '../types'

interface MessageInputProps {
  onSend: (type: MessageType, content: string, fileName?: string) => void
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showMediaButtons, setShowMediaButtons] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    onSend('text', message)
    setMessage('')
  }

  return (
    <div className="message-input-container">
      <div className="media-buttons">
        <button onClick={() => setShowMediaButtons(!showMediaButtons)}>
          {showMediaButtons ? '收起' : '展开'}
        </button>
        {showMediaButtons && (
          <div className="media-options">
            <MediaInput type="image" onSend={onSend} />
            <MediaInput type="video" onSend={onSend} />
            <MediaInput type="file" onSend={onSend} />
            <MediaInput type="audio" onSend={onSend} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="text-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
        />
        <button type="submit">发送</button>
      </form>
    </div>
  )
} 