export type UserRole = 'user' | 'admin' | 'super_admin'
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio'

export interface User {
  id: string           // 登录ID（至少5位）
  username: string     // 显示名称（可随意更改）
  password: string     // 至少5位
  role: UserRole
  createdAt: number
  isBanned?: boolean
  friends: string[]    // 好友ID列表
  groups: string[]     // 群组ID列表
}

export interface ChatRoom {
  id: string
  type: 'private' | 'group'
  name: string
  members: string[]
  createdAt: number
  lastMessage?: Message
  ownerId?: string     // 群主ID
  subOwnerIds?: string[] // 副群主ID列表
  adminIds?: string[]  // 管理员ID列表
  memberNicknames?: { [userId: string]: string }  // 群昵称
  settings?: GroupSettings
}

export interface Message {
  id: string
  roomId: string
  type: MessageType
  content: string
  sender: string
  timestamp: number
  fileName?: string
  fileSize?: number
}

export interface LoginResponse {
  success: boolean
  token?: string
  message?: string
  user?: Omit<User, 'password'>
}

export interface GroupSettings {
  announcement?: string
  avatar?: string
  mutedMembers?: { [userId: string]: number } // userId -> 禁言结束时间
}