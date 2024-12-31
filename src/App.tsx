import { useState, useEffect, useRef } from 'react'
import { Login } from './components/Login'
import { Register } from './components/Register'
import './App.css'
import { ChatRoom, User, Message } from './types'
import { MessageInput } from './components/MessageInput'
import { AddFriendModal } from './components/AddFriendModal'
import { CreateGroupModal } from './components/CreateGroupModal'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('chat-token')
    const storedUsername = localStorage.getItem('chat-username')
    if (token && storedUsername) {
      setIsAuthenticated(true)
      setUsername(storedUsername)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    // 建立 WebSocket 连接
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const token = localStorage.getItem('chat-token')
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/chat?token=${token}`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data)
        
        switch (type) {
          case 'new_message':
            handleNewMessage(data)
            break
          case 'friend_added':
            handleFriendAdded(data)
            break
          case 'group_created':
            handleGroupCreated(data)
            break
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // 尝试重新连接
        setTimeout(connectWebSocket, 3000)
      }

      wsRef.current = ws
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [isAuthenticated])

  // 发送消息
  const sendMessage = async (type: string, content: string, fileName?: string) => {
    if (!wsRef.current || !activeRoom) return

    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      data: {
        roomId: activeRoom.id,
        type,
        content,
        fileName
      }
    }))
  }

  // 添加好友
  const addFriend = async (friendId: string) => {
    if (!wsRef.current) return

    wsRef.current.send(JSON.stringify({
      type: 'add_friend',
      data: { friendId }
    }))
  }

  // 创建群组
  const createGroup = async (name: string, memberIds: string[]) => {
    if (!wsRef.current) return

    wsRef.current.send(JSON.stringify({
      type: 'create_group',
      data: { name, memberIds }
    }))
  }

  const handleLogin = (username: string, token: string) => {
    setIsAuthenticated(true)
    setUsername(username)
    localStorage.setItem('chat-token', token)
    localStorage.setItem('chat-username', username)
  }

  const handleLogout = () => {
    localStorage.removeItem('chat-token')
    localStorage.removeItem('chat-username')
    setIsAuthenticated(false)
    setUsername('')
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const handleNewMessage = (data: Message) => {
    setMessages(prev => [...prev, data])
  }

  const handleFriendAdded = (data: any) => {
    setFriends(prev => [...prev, data.friend])
    setRooms(prev => [...prev, data.room])
  }

  const handleGroupCreated = (data: any) => {
    setRooms(prev => [...prev, data.room])
  }

  const getFriendName = (room: ChatRoom) => {
    const friendId = room.members.find(id => id !== username)
    const friend = friends.find(f => f.id === friendId)
    return friend?.username || '未知用户'
  }

  if (!isAuthenticated) {
    return showLogin ? (
      <Login 
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowLogin(false)}
      />
    ) : (
      <Register
        onRegister={handleLogin}
        onSwitchToLogin={() => setShowLogin(true)}
      />
    )
  }

  return (
    <div className="chat-app">
      <aside className="sidebar">
        <div className="user-info">
          <h3>{username}</h3>
          <button onClick={() => setShowAddFriend(true)}>添加好友</button>
          <button onClick={() => setShowCreateGroup(true)}>创建群组</button>
          <button onClick={handleLogout} className="logout-button">退出登录</button>
        </div>
        
        <div className="rooms-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`room ${activeRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setActiveRoom(room)}
            >
              <h4>{room.type === 'group' ? room.name : getFriendName(room)}</h4>
              <p>{room.lastMessage?.content}</p>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-main">
        {activeRoom ? (
          <>
            <header>
              <h2>{activeRoom.type === 'group' ? activeRoom.name : getFriendName(activeRoom)}</h2>
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '已连接' : '连接中...'}
              </div>
            </header>
            <div className="messages-container">
              {messages
                .filter(msg => msg.roomId === activeRoom.id)
                .map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === username ? 'sent' : 'received'}`}
                  >
                    {message.content}
                  </div>
                ))}
            </div>
            <MessageInput onSend={sendMessage} />
          </>
        ) : (
          <div className="no-chat-selected">
            选择一个聊天开始交谈
          </div>
        )}
      </main>

      {showAddFriend && (
        <AddFriendModal
          onAdd={addFriend}
          onClose={() => setShowAddFriend(false)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          friends={friends}
          onCreate={createGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  )
}

export default App