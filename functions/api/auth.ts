import { User, LoginResponse } from '../../src/types'
import { createHash } from 'crypto'

interface Env {
  CHAT_KV: KVNamespace
  JWT_SECRET: string
}

// 验证ID格式
function validateId(id: string): boolean {
  return id.length >= 5 && /^[a-zA-Z0-9_]+$/.test(id)
}

// 验证密码
function validatePassword(password: string): boolean {
  return password.length >= 5
}

// 密码加密
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// 生成 JWT token
function generateToken(user: Omit<User, 'password'>, secret: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    user,
    exp: Date.now() + 24 * 60 * 60 * 1000
  }))
  const signature = btoa(
    createHash('sha256')
      .update(`${header}.${payload}.${secret}`)
      .digest('hex')
  )
  return `${header}.${payload}.${signature}`
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  // 初始化超级管理员账号
  const superAdmin = await env.CHAT_KV.get('user:zdx')
  if (!superAdmin) {
    await createSuperAdmin(env)
  }

  // 注册
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    try {
      const { id, username, password } = await request.json()

      if (!validateId(id)) {
        return new Response(JSON.stringify({
          success: false,
          message: 'ID必须至少5位且只能包含字母、数字和下划线'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (!validatePassword(password)) {
        return new Response(JSON.stringify({
          success: false,
          message: '密码必须至少5位'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 检查ID是否已存在
      const existingUser = await env.CHAT_KV.get(`user:${id}`)
      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          message: 'ID已被使用'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 创建用户
      const user: User = {
        id,
        username: username || id,
        password: hashPassword(password),
        role: 'user',
        createdAt: Date.now(),
        friends: [],
        groups: []
      }

      await env.CHAT_KV.put(`user:${id}`, JSON.stringify(user))

      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        friends: user.friends,
        groups: user.groups
      }, env.JWT_SECRET)

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          friends: user.friends,
          groups: user.groups
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '注册失败'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // 登录
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      const { id, password } = await request.json()
      
      const userJson = await env.CHAT_KV.get(`user:${id}`)
      if (!userJson) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户不存在'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const user: User = JSON.parse(userJson)
      
      if (user.isBanned) {
        return new Response(JSON.stringify({
          success: false,
          message: '账号已被封禁'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (hashPassword(password) !== user.password) {
        return new Response(JSON.stringify({
          success: false,
          message: '密码错误'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        friends: user.friends,
        groups: user.groups
      }, env.JWT_SECRET)

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          friends: user.friends,
          groups: user.groups
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '登录失败'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // 修改密码
  if (url.pathname === '/api/auth/change-password' && request.method === 'POST') {
    try {
      const { id, oldPassword, newPassword } = await request.json()
      
      const user = await getUserById(env, id)
      if (!user || hashPassword(oldPassword) !== user.password) {
        return new Response(JSON.stringify({
          success: false,
          message: '原密码错误'
        }))
      }

      if (!validatePassword(newPassword)) {
        return new Response(JSON.stringify({
          success: false,
          message: '新密码必须至少5位'
        }))
      }

      user.password = hashPassword(newPassword)
      await env.CHAT_KV.put(`user:${id}`, JSON.stringify(user))

      return new Response(JSON.stringify({
        success: true,
        message: '密码修改成功'
      }))
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '密码修改失败'
      }))
    }
  }

  return new Response('Not Found', { status: 404 })
}

// 创建默认超级管理员
async function createSuperAdmin(env: Env) {
  const superAdmin: User = {
    id: 'zdx',
    username: 'zdx',
    password: hashPassword('a1312745423'),
    role: 'super_admin',
    createdAt: Date.now(),
    friends: [],
    groups: []
  }
  
  await env.CHAT_KV.put('user:zdx', JSON.stringify(superAdmin))
}

// 辅助函数
async function getUserById(env: Env, id: string): Promise<User | null> {
  const userJson = await env.CHAT_KV.get(`user:${id}`)
  return userJson ? JSON.parse(userJson) : null
}