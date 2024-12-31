import { useState } from 'react'

interface AddFriendModalProps {
  onAdd: (username: string) => void
  onClose: () => void
}

export function AddFriendModal({ onAdd, onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    onAdd(username)
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <h3>添加好友</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="输入用户名"
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit">添加</button>
          </div>
        </form>
      </div>
    </>
  )
} 