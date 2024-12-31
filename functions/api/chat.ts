import { User, ChatRoom, Message, MessageType } from '../../src/types'

interface Env {
  CHAT_KV: KVNamespace
  JWT_SECRET: string
}

// 存储所有活跃的WebSocket连接
const CLIENTS = new Map<string, WebSocket>() // userId -> WebSocket

export const onRequest: PagesFunction<Env> = async (context) => {
  const upgradeHeader = context.request.headers.get('Upgrade')
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 })
  }

  // 验证token
  const url = new URL(context.request.url)
  const token = url.searchParams.get('token')
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await verifyToken(token, context.env.JWT_SECRET)
  if (!user) {
    return new Response('Invalid token', { status: 401 })
  }

  // 检查是否被封禁
  const userInfo = await context.env.CHAT_KV.get(`user:${user.id}`, 'json')
  if (userInfo?.isBanned) {
    return new Response('Account banned', { status: 403 })
  }

  const webSocketPair = new WebSocketPair()
  const [client, server] = Object.values(webSocketPair)

  server.accept()
  CLIENTS.set(user.id, server)

  // 处理消息
  server.addEventListener('message', async (event) => {
    try {
      const message = JSON.parse(event.data as string)
      const { type, data } = message

      switch (type) {
        case 'chat_message':
          await handleChatMessage(context.env, user.id, data)
          break
        case 'add_friend':
          await handleAddFriend(context.env, user.id, data)
          break
        case 'create_group':
          await handleCreateGroup(context.env, user.id, data)
          break
        case 'group_action':
          await handleGroupAction(context.env, user.id, data)
          break
      }
    } catch (error) {
      console.error('Error processing message:', error)
      server.send(JSON.stringify({
        type: 'error',
        data: { message: 'Message processing failed' }
      }))
    }
  })

  // 处理连接关闭
  server.addEventListener('close', () => {
    CLIENTS.delete(user.id)
  })

  return new Response(null, {
    status: 101,
    webSocket: client,
  })
}

// 处理聊天消息
async function handleChatMessage(env: Env, senderId: string, data: any) {
  const { roomId, type, content, fileName, fileSize } = data
  const room = await getRoomFromKV(env, roomId)
  
  if (!room || !room.members.includes(senderId)) {
    return
  }

  // 检查是否被禁言
  if (room.type === 'group' && room.settings?.mutedMembers?.[senderId] > Date.now()) {
    return sendError(senderId, '你已被禁言')
  }

  const message: Message = {
    id: crypto.randomUUID(),
    roomId,
    type: type as MessageType,
    content,
    sender: senderId,
    timestamp: Date.now(),
    fileName,
    fileSize
  }

  // 存储消息
  await storeMessage(env, message)

  // 更新最后一条消息
  room.lastMessage = message
  await env.CHAT_KV.put(`room:${roomId}`, JSON.stringify(room))

  // 发送给房间所有在线成员
  room.members.forEach(memberId => {
    const client = CLIENTS.get(memberId)
    if (client) {
      client.send(JSON.stringify({
        type: 'new_message',
        data: message
      }))
    }
  })
}

// 处理添加好友请求
async function handleAddFriend(env: Env, userId: string, data: any) {
  const { friendId } = data
  
  // 通过ID查找用户
  const friendData = await env.CHAT_KV.get(`user:${friendId}`, 'json')
  if (!friendData) {
    return sendError(userId, '用户不存在')
  }

  if (friendData.isBanned) {
    return sendError(userId, '该用户已被封禁')
  }

  // 创建私聊房间
  const room: ChatRoom = {
    id: crypto.randomUUID(),
    type: 'private',
    name: '',
    members: [userId, friendId],
    createdAt: Date.now()
  }

  // 更新两个用户的好友列表
  await updateUserFriends(env, userId, friendId)
  await updateUserFriends(env, friendId, userId)
  
  // 存储房间信息
  await env.CHAT_KV.put(`room:${room.id}`, JSON.stringify(room))

  // 通知双方
  notifyUsers([userId, friendId], {
    type: 'friend_added',
    data: { room, friend: friendData }
  })
}

// 处理群组操作
async function handleGroupAction(env: Env, userId: string, data: any) {
  const { roomId, action, targetId, value } = data
  const room = await getRoomFromKV(env, roomId)
  
  if (!room || room.type !== 'group') {
    return sendError(userId, '群组不存在')
  }

  const userRole = getUserRoleInGroup(room, userId)
  if (!canPerformAction(userRole, action)) {
    return sendError(userId, '权限不足')
  }

  switch (action) {
    case 'set_nickname':
      room.memberNicknames = room.memberNicknames || {}
      room.memberNicknames[targetId] = value
      break
    case 'set_announcement':
      room.settings = room.settings || {}
      room.settings.announcement = value
      break
    case 'set_role':
      if (userRole !== 'owner') return sendError(userId, '只有群主可以设置角色')
      if (value === 'admin') {
        room.adminIds = room.adminIds || []
        room.adminIds.push(targetId)
      }
      break
    case 'mute':
      room.settings = room.settings || {}
      room.settings.mutedMembers = room.settings.mutedMembers || {}
      room.settings.mutedMembers[targetId] = Date.now() + value
      break
  }

  await env.CHAT_KV.put(`room:${roomId}`, JSON.stringify(room))
  notifyRoomMembers(room, {
    type: 'group_updated',
    data: { room }
  })
}

// 辅助函数
function getUserRoleInGroup(room: ChatRoom, userId: string): string {
  if (room.ownerId === userId) return 'owner'
  if (room.subOwnerIds?.includes(userId)) return 'subowner'
  if (room.adminIds?.includes(userId)) return 'admin'
  return 'member'
}

function canPerformAction(role: string, action: string): boolean {
  const permissions = {
    owner: ['set_nickname', 'set_announcement', 'set_role', 'mute', 'kick'],
    subowner: ['set_nickname', 'set_announcement', 'mute', 'kick'],
    admin: ['set_nickname', 'mute', 'kick'],
    member: []
  }
  return permissions[role]?.includes(action) || false
}

function notifyUsers(userIds: string[], message: any) {
  userIds.forEach(userId => {
    const client = CLIENTS.get(userId)
    if (client) {
      client.send(JSON.stringify(message))
    }
  })
}

function notifyRoomMembers(room: ChatRoom, message: any) {
  notifyUsers(room.members, message)
}

function sendError(userId: string, message: string) {
  const client = CLIENTS.get(userId)
  if (client) {
    client.send(JSON.stringify({
      type: 'error',
      data: { message }
    }))
  }
}

// ... 其他辅助函数