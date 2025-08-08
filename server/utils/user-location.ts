import type { H3Event } from "h3";
import { getRequestIP } from "h3";
import { ofetch } from "ofetch";
import { IPinfoWrapper, ApiLimitError, type IPinfo } from "node-ipinfo";
import { useRuntimeConfig } from "#imports";

export async function getUserIp(event: H3Event) {
  const naturalIp = getRequestIP(event, { xForwardedFor: true }) ?? getRequestIP(event);

  if (naturalIp && !isLocalIP(naturalIp)) {
    return naturalIp;
  }

  try {
    const remoteIP = await ofetch<{ ip: string }>("https://ifconfig.co/json");
    return remoteIP.ip;
  }
  catch (error) {
    console.error("Error fetching public IP:", error);
    return undefined;
  }
}

export async function getUserLocation(event: H3Event): Promise<IPinfo | null> {
  const config = useRuntimeConfig();

  const ip = await getUserIp(event);

  if (!ip) {
    return null;
  }

  try {
    const ipinfoWrapper = new IPinfoWrapper(config.ipinfoToken);
    return await ipinfoWrapper.lookupIp(ip);
  }

  catch (error) {
    if (error instanceof ApiLimitError) {
      console.warn("IPinfo API limit reached, returning undefined for country.");
      return null;
    }
    console.error("Error fetching user country:", error);
    return null;
  }
}

function isLocalIP(ip: string): boolean {
  return (
    ip === "127.0.0.1"
    || ip === "::1"
    || ip.startsWith("192.168.")
    || ip.startsWith("10.")
    || ip.startsWith("172.16.")
    || ip.startsWith("172.17.")
    || ip.startsWith("172.18.")
    || ip.startsWith("172.19.")
    || ip.startsWith("172.2")
  );
}
