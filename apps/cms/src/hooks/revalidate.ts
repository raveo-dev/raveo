import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

const revalidate = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Dynamic import wrapped in eval to hide from Webpack
      const getEnv = new Function('return import("cloudflare:workers").then(m => m.env)')
      const env = await getEnv()
      const cfEnv = env as unknown as {
        WEB?: { fetch: typeof fetch }
        REVALIDATE_SECRET?: string
      }

      if (cfEnv.WEB) {
        await cfEnv.WEB.fetch(
          new Request('https://web/api/revalidate', {
            method: 'POST',
            headers: {
              'x-revalidate-secret': cfEnv.REVALIDATE_SECRET ?? '',
            },
          }),
        )
      }
    } else {
      const webUrl = process.env.WEB_URL ?? 'http://localhost:4321'
      const secret = process.env.REVALIDATE_SECRET ?? ''
      await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'x-revalidate-secret': secret,
        },
      })
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
