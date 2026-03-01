import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

const revalidate = async () => {
  try {
    let response: Response

    if (process.env.NODE_ENV === 'production') {
      // Production: use service binding (Worker-to-Worker)
      const { env } = await import('cloudflare:workers')
      const cfEnv = env as unknown as { WEB?: { fetch: typeof fetch } }
      if (cfEnv.WEB) {
        response = await cfEnv.WEB.fetch(
          new Request('https://web/api/revalidate', {
            method: 'POST',
            headers: {
              'x-revalidate-secret': process.env.REVALIDATE_SECRET ?? '',
            },
          }),
        )
      } else {
        console.error('WEB service binding not available')
        return
      }
    } else {
      // Dev: HTTP fallback
      const webUrl = process.env.WEB_URL ?? 'http://localhost:4321'
      const secret = process.env.REVALIDATE_SECRET ?? ''
      response = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'x-revalidate-secret': secret,
        },
      })
    }

    if (!response.ok) {
      console.error('Revalidate failed:', response.status)
    }
  } catch (e) {
    console.error('Revalidate error:', e)
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  await revalidate()
  return doc
}

export const revalidateGlobalAfterChange: GlobalAfterChangeHook = async ({ doc }) => {
  await revalidate()
  return doc
}
