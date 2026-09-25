import { supabase } from './supabase'

const cache = new Map<string, Promise<Uint8Array | null>>()

/** Evaluator signature PNG from the private "signatures" bucket (cached per path). */
export function signatureBytes(path?: string | null) {
  if (!path) return Promise.resolve(null)
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      const { data } = await supabase.storage.from('signatures').download(path)
      return data ? new Uint8Array(await data.arrayBuffer()) : null
    })())
  }
  return cache.get(path)!
}
