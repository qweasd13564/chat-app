interface Env {
  CHAT_KV: KVNamespace
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const fileId = context.params.fileId as string
  const { env } = context

  try {
    const file = await env.CHAT_KV.get(`file:${fileId}`, {
      type: "text",
      metadata: true
    })

    if (!file) {
      return new Response('File not found or expired', { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { value: base64, metadata } = file

    // 将base64转换回二进制
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Response(bytes, {
      headers: {
        'Content-Type': metadata.type,
        'Content-Disposition': `inline; filename="${metadata.fileName}"`,
        'Content-Length': metadata.size.toString()
      }
    })
  } catch (error) {
    return new Response('Error retrieving file', { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}