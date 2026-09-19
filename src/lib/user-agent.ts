// Best-effort, dependency-free label for a User-Agent string — good enough
// for "which device did they visit from" in the admin dashboard. Not meant
// to be exhaustive; unrecognized strings just fall back to the OS or "Unknown".

function detectOS(ua: string): string | null {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

function detectBrowser(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Browser";
  if (/crios/i.test(ua) || /chrome\//i.test(ua)) return "Chrome";
  if (/fxios/i.test(ua) || /firefox\//i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return null;
}

export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";

  const os = detectOS(userAgent);
  const browser = detectBrowser(userAgent);

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Unknown device";
}
