import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { $fetch, useRuntimeConfig } from '#imports'

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

function toCountryName(code?: string): string | undefined {
  return code ? regionNames.of(code.toUpperCase()) : undefined
}

export async function getUserCountry(event: H3Event): Promise<string | undefined> {
  for (const name of ['cf-ipcountry', 'x-vercel-ip-country', 'x-country-code', 'x-country']) {
    const value = getRequestHeader(event, name)
    const country = toCountryName(value)
    if (country) {
      return country
    }
  }

  const geo = (event.context as { geo?: { country?: string } }).geo
  const geoCountry = toCountryName(geo?.country)
  if (geoCountry) {
    return geoCountry
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? event.node.req.socket.remoteAddress
  if (ip) {
    try {
      const { ipinfoToken } = useRuntimeConfig()
      const { country }: { country?: string } = await $fetch(`https://ipinfo.io/${ip}?token=${ipinfoToken ?? ''}`)
      const name = toCountryName(country)
      if (name) {
        return name
      }
    }
    catch {
      // ignore lookup errors
    }
  }

  const acceptLanguage = getRequestHeader(event, 'accept-language')
  if (acceptLanguage) {
    const locale = acceptLanguage.split(',')[0]?.trim()
    const region = locale?.split('-')[1]
    const name = toCountryName(region)
    if (name) {
      return name
    }
  }

  return undefined
}
