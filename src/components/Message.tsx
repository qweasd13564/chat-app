import { Message as MessageType } from '../types'

interface MessageProps {
  message: MessageType
  isSelf: boolean
}

export function Message({ message, isSelf }: MessageProps) {
  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <p>{message.content}</p>

      case 'image':
        return (
          <img 
            src={message.content} 
            alt={message.fileName || '图片'} 
            className="message-image"
          />
        )

      case 'video':
        return (
          <video 
            src={message.content} 
            controls 
            className="message-video"
          />
        )

      case 'audio':
        return (
          <audio 
            src={message.content} 
            controls 
            className="message-audio"
          />
        )

      case 'file':
        return (
          <a 
            href={message.content} 
            download={message.fileName}
            className="message-file"
          >
            📎 {message.fileName}
            {message.fileSize && 
              <span className="file-size">
                ({formatFileSize(message.fileSize)})
              </span>
            }
          </a>
        )
    }
  }

  return (
    <div className={`message ${isSelf ? 'sent' : 'received'}`}>
      <div className="message-content">
        {renderContent()}
      </div>
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
} 