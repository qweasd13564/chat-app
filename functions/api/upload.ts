interface Env {
  CHAT_KV: KVNamespace
  JWT_SECRET: string
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MIN_FREE_SPACE = 100 * 1024 * 1024; // 100MB

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    
    if (!file) {
      return new Response('No file provided', { status: 400 })
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        message: '文件大小不能超过25MB'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 检查可用空间
    const files = await listAllFiles(env)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    
    if (totalSize + file.size > env.CHAT_KV.quota - MIN_FREE_SPACE) {
      // 需要清理空间
      await cleanupOldFiles(env, files, file.size + MIN_FREE_SPACE)
    }

    // 将文件转换为 base64
    const buffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const fileId = crypto.randomUUID()
    
    // 存储到 KV，设置24小时过期
    await env.CHAT_KV.put(`file:${fileId}`, base64, {
      expirationTtl: 86400, // 24小时的秒数
      metadata: {
        fileName: file.name,
        type: file.type,
        size: file.size,
        uploadTime: Date.now()
      }
    })

    return new Response(JSON.stringify({
      success: true,
      url: `/api/file/${fileId}`,
      fileName: file.name,
      fileSize: file.size,
      expiresAt: Date.now() + 86400000 // 24小时的毫秒数
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Upload failed'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function listAllFiles(env: Env) {
  const list = await env.CHAT_KV.list({ prefix: 'file:' })
  return Promise.all(list.keys.map(async key => {
    const { metadata } = await env.CHAT_KV.getWithMetadata(key.name)
    return {
      key: key.name,
      size: metadata.size,
      uploadTime: metadata.uploadTime
    }
  }))
}

async function cleanupOldFiles(env: Env, files: any[], neededSpace: number) {
  // 按上传时间排序
  files.sort((a, b) => a.uploadTime - b.uploadTime)
  
  let freedSpace = 0
  for (const file of files) {
    await env.CHAT_KV.delete(file.key)
    freedSpace += file.size
    if (freedSpace >= neededSpace) break
  }
}