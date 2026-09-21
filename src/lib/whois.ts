import net from 'net'

// Common TLD -> authoritative WHOIS server. Anything not listed here is
// resolved on the fly via the IANA root WHOIS referral (whois.iana.org),
// exactly like the standard `whois` CLI does. No API key, no cost.
const TLD_WHOIS_SERVERS: Record<string, string> = {
  com: 'whois.verisign-grs.com',
  net: 'whois.verisign-grs.com',
  org: 'whois.pir.org',
  info: 'whois.afilias.net',
  biz: 'whois.biz',
  io: 'whois.nic.io',
  co: 'whois.nic.co',
  it: 'whois.nic.it',
  eu: 'whois.eu',
  de: 'whois.denic.de',
  fr: 'whois.nic.fr',
  es: 'whois.nic.es',
  nl: 'whois.domain-registry.nl',
  be: 'whois.dns.be',
  ch: 'whois.nic.ch',
  at: 'whois.nic.at',
  pl: 'whois.dns.pl',
  se: 'whois.iis.se',
  no: 'whois.norid.no',
  dk: 'whois.dk-hostmaster.dk',
  fi: 'whois.fi',
  pt: 'whois.dns.pt',
  us: 'whois.nic.us',
  uk: 'whois.nic.uk',
  cc: 'whois.nic.cc',
  tv: 'whois.nic.tv',
  me: 'whois.nic.me',
  xyz: 'whois.nic.xyz',
  online: 'whois.nic.online',
  shop: 'whois.nic.shop',
  ru: 'whois.tcinet.ru',
  ca: 'whois.cira.ca',
  au: 'whois.auda.org.au',
}

function whoisQuery(server: string, query: string, timeoutMs = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: server, port: 43 })
    let data = ''
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('WHOIS timeout'))
    }, timeoutMs)

    socket.on('connect', () => socket.write(query + '\r\n'))
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8')
    })
    socket.on('end', () => {
      clearTimeout(timer)
      resolve(data)
    })
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function findWhoisServer(tld: string): Promise<string | null> {
  if (TLD_WHOIS_SERVERS[tld]) return TLD_WHOIS_SERVERS[tld]
  try {
    const iana = await whoisQuery('whois.iana.org', tld, 5000)
    const match = iana.match(/^refer:\s*(.+)$/im) || iana.match(/^whois:\s*(.+)$/im)
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

/**
 * Fetches raw WHOIS text for a domain by querying the registry's
 * authoritative WHOIS server directly (port 43), following a registrar
 * referral for a fuller record on thin gTLD registries (e.g. .com/.net).
 * Returns null if no server could be reached — callers should treat that
 * as "unknown", not as a negative signal.
 */
export async function fetchWhoisText(domain: string): Promise<string | null> {
  try {
    const tld = domain.split('.').pop()?.toLowerCase()
    if (!tld) return null

    const server = await findWhoisServer(tld)
    if (!server) return null

    let text = await whoisQuery(server, domain, 6000)

    const referralMatch = text.match(/Registrar WHOIS Server:\s*(\S+)/i)
    if (referralMatch?.[1] && referralMatch[1].toLowerCase() !== server.toLowerCase()) {
      try {
        const deeper = await whoisQuery(referralMatch[1], domain, 5000)
        if (deeper && deeper.length > 50) text = deeper
      } catch {
        // Keep the thin registry response if the registrar's own server fails.
      }
    }

    return text
  } catch {
    return null
  }
}

export interface ParsedWhois {
  creationDate: string | null
  expiryDate: string | null
  registrantOrg: string | null
  registrar: string | null
  hasPrivacy: boolean
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

/**
 * Best-effort field extraction across the handful of WHOIS text dialects
 * used by major registries (Verisign-style gTLDs, nic.it-style ccTLDs, etc).
 */
export function parseWhois(text: string): ParsedWhois {
  const hasPrivacy =
    /privacy/i.test(text) ||
    /redact/i.test(text) ||
    /domains by proxy/i.test(text) ||
    /whois privacy/i.test(text) ||
    /on dot/i.test(text) ||
    /data protected/i.test(text)

  const creationDate = firstMatch(text, [
    /^\s*Creation Date:\s*(.+)$/im,
    /^Created:\s*(.+)$/im,
    /^Created On:\s*(.+)$/im,
    /^Registered\s+on:\s*(.+)$/im,
    /^Domain Name Commencement Date:\s*(.+)$/im,
  ])

  const expiryDate = firstMatch(text, [
    /^\s*Registry Expiry Date:\s*(.+)$/im,
    /^Expire Date:\s*(.+)$/im,
    /^Expiration Date:\s*(.+)$/im,
    /^Registrar Registration Expiration Date:\s*(.+)$/im,
    /^Renewal date:\s*(.+)$/im,
    /^paid-till:\s*(.+)$/im,
  ])

  const registrantOrg = firstMatch(text, [
    /^\s*Registrant Organization:\s*(.+)$/im,
    /Registrant\s*\r?\n(?:.*\r?\n){0,6}?\s*Organi[sz]ation:\s*(.+)/i,
  ])

  const registrar = firstMatch(text, [
    /^\s*Registrar:\s*(.+)$/im,
    /^\s*Sponsoring Registrar:\s*(.+)$/im,
    /Registrar\s*\r?\n(?:.*\r?\n){0,6}?\s*(?:Organi[sz]ation|Name):\s*(.+)/i,
  ])

  return { creationDate, expiryDate, registrantOrg, registrar, hasPrivacy }
}
