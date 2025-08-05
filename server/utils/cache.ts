import { useStorage } from 'nitropack'

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const storage = useStorage()
  const cachedValue = await storage.getItem<T>(key)
  if (cachedValue) return cachedValue
  const data = await fetcher()
  await storage.setItem(key, data, { ttl: ttlSeconds })
  return data
}
