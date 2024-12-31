import { User, UserRole } from '../../src/types'
import { AdminAction, AdminResponse, AdminStats } from '../../src/types/admin'

interface Env {
  CHAT_KV: KVNamespace
  JWT_SECRET: string
}

async function verifyAdminToken(context: any): Promise<User | null> {
  const token = context.request.headers.get('Authorization')?.split('Bearer ')[1]
  if (!token) return null

  try {
    const user = await verifyToken(token, context.env.JWT_SECRET)
    if (!user || !['admin', 'super_admin'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const admin = await verifyAdminToken(context)
  
  if (!admin) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  
  // 获取统计数据
  if (url.pathname === '/api/admin/stats') {
    return handleGetStats(env)
  }

  const { action, userId, data } = await request.json() as AdminAction

  try {
    switch (action) {
      case 'ban_user':
        if (await isTargetSuperAdmin(env, userId)) {
          return errorResponse('Cannot ban super admin')
        }
        return await banUser(env, userId)
        
      case 'unban_user':
        return await unbanUser(env, userId)
        
      case 'change_password':
        if (admin.role !== 'super_admin' && await isTargetAdmin(env, userId)) {
          return errorResponse('Only super admin can change admin password')
        }
        return await changeUserPassword(env, userId, data.newPassword)
        
      case 'change_username':
        if (admin.role !== 'super_admin') {
          return errorResponse('Only super admin can change username')
        }
        return await changeUsername(env, userId, data.newUsername)
        
      case 'set_role':
        if (admin.role !== 'super_admin') {
          return errorResponse('Only super admin can set roles')
        }
        if (await isTargetSuperAdmin(env, userId)) {
          return errorResponse('Cannot modify super admin role')
        }
        return await setUserRole(env, userId, data.role)
        
      default:
        return errorResponse('Invalid action')
    }
  } catch (error) {
    return errorResponse('Operation failed')
  }
}

async function handleGetStats(env: Env): Promise<Response> {
  const users = await getAllUsers(env)
  const groups = await getAllGroups(env)
  const messages = await getAllMessages(env)
  
  const stats: AdminStats = {
    totalUsers: users.length,
    totalGroups: groups.length,
    totalMessages: messages.length,
    activeUsers: getActiveUsers(users).length
  }

  return new Response(JSON.stringify({ success: true, data: stats }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function banUser(env: Env, userId: string): Promise<Response> {
  const user = await getUserById(env, userId)
  if (!user) return errorResponse('User not found')
  
  user.isBanned = true
  await env.CHAT_KV.put(`user:${userId}`, JSON.stringify(user))
  return successResponse('User banned')
}

async function unbanUser(env: Env, userId: string): Promise<Response> {
  const user = await getUserById(env, userId)
  if (!user) return errorResponse('User not found')
  
  user.isBanned = false
  await env.CHAT_KV.put(`user:${userId}`, JSON.stringify(user))
  return successResponse('User unbanned')
}

async function changeUserPassword(env: Env, userId: string, newPassword: string): Promise<Response> {
  const user = await getUserById(env, userId)
  if (!user) return errorResponse('User not found')
  
  user.password = hashPassword(newPassword)
  await env.CHAT_KV.put(`user:${userId}`, JSON.stringify(user))
  return successResponse('Password changed')
}

async function changeUsername(env: Env, userId: string, newUsername: string): Promise<Response> {
  const user = await getUserById(env, userId)
  if (!user) return errorResponse('User not found')
  
  user.username = newUsername
  await env.CHAT_KV.put(`user:${userId}`, JSON.stringify(user))
  return successResponse('Username changed')
}

async function setUserRole(env: Env, userId: string, newRole: UserRole): Promise<Response> {
  const user = await getUserById(env, userId)
  if (!user) return errorResponse('User not found')
  
  if (newRole === 'super_admin') {
    return errorResponse('Cannot set super admin role')
  }
  
  user.role = newRole
  await env.CHAT_KV.put(`user:${userId}`, JSON.stringify(user))
  return successResponse('Role updated')
}

// 辅助函数
async function isTargetSuperAdmin(env: Env, userId: string): Promise<boolean> {
  const user = await getUserById(env, userId)
  return user?.role === 'super_admin'
}

async function isTargetAdmin(env: Env, userId: string): Promise<boolean> {
  const user = await getUserById(env, userId)
  return user?.role === 'admin'
}

function successResponse(message: string): Response {
  return new Response(JSON.stringify({ success: true, message }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

function errorResponse(message: string): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// ... 其他辅助函数