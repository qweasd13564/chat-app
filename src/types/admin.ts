export interface AdminStats {
  totalUsers: number
  totalGroups: number
  totalMessages: number
  activeUsers: number // 24小时内活跃用户
}

export interface AdminAction {
  type: 'ban_user' | 'unban_user' | 'change_password' | 'change_username' | 'set_role'
  userId: string
  data?: any
}

export interface AdminResponse {
  success: boolean
  message?: string
  data?: any
}

export interface UserManagement {
  id: string
  username: string
  role: UserRole
  createdAt: number
  isBanned: boolean
  lastActive?: number
}

export interface GroupManagement {
  id: string
  name: string
  memberCount: number
  createdAt: number
  ownerId: string
}