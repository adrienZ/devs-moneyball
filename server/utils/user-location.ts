import type { H3Event } from "h3";
import { getRequestIP } from "h3";
import { ofetch } from "ofetch";

interface IPInfo {
  ip: string;
  ip_decimal: number;
  country: string;
  country_iso: string;
  country_eu: boolean;
  region_name: string;
  region_code: string;
  zip_code: string;
  city: string;
  latitude: number;
  longitude: number;
  time_zone: string;
  asn: string;
  asn_org: string;
  hostname: string;
  user_agent: {
    product: string;
    version: string;
    comment: string;
    raw_value: string;
  };
}

export async function getUserConfig(event: H3Event): Promise<IPInfo | undefined> {
  const naturalIp = getRequestIP(event, { xForwardedFor: true }) ?? getRequestIP(event);
  const queryParams = new URLSearchParams();

  if (naturalIp && !isLocalIP(naturalIp)) {
    queryParams.append("ip", naturalIp);
  }

  try {
    const remoteIP = await ofetch<IPInfo>("https://ifconfig.co/json", {
      query: queryParams,
    });
    return remoteIP;
  }

  catch (error) {
    console.error("Error fetching public config:", error);
    return undefined;
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
