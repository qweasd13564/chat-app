import { useState } from 'react'
import { User } from '../types'

interface CreateGroupModalProps {
  friends: User[]
  onCreate: (name: string, memberIds: string[]) => void
  onClose: () => void
}

export function CreateGroupModal({ friends, onCreate, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('请输入群组名称')
      return
    }
    if (selectedMembers.length === 0) {
      setError('请选择至少一个群成员')
      return
    }

    onCreate(groupName, selectedMembers)
    onClose()
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <h3>创建群组</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="群组名称"
            autoFocus
          />
          <div className="members-list">
            <h4>选择群成员</h4>
            {friends.map(friend => (
              <label key={friend.id} className="member-item">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(friend.id)}
                  onChange={() => toggleMember(friend.id)}
                />
                <span>{friend.username}</span>
              </label>
            ))}
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit">创建</button>
          </div>
        </form>
      </div>
    </>
  )
} 