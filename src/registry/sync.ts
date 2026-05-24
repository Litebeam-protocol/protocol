/**
 * litebeam service registry crawler
 *
 * Syncs services from two public directories:
 *   - agentic.market  — x402-enabled services (6,000+)
 *   - mpp.dev         — MPP-enabled services
 *
 * This file is published so the community can see exactly how services
 * are discovered, categorised, and ranked. No proprietary logic here —
 * if you spot a service that's being miscategorised, open a PR.
 */

const X402_API = 'https://api.agentic.market/v1/services';
const MPP_API  = 'https://mpp.dev/api/services';

// Per-domain cap prevents catch-all gateways from flooding results
const MAX_ENDPOINTS_PER_DOMAIN = 300;

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (/search|exa|perplexity|brave|serp/.test(t))                                   return 'search';
  if (/image|photo|vision|stable|flux|dall|midjourney|img|recraft|sdxl/.test(t))   return 'image';
  if (/audio|speech|voice|music|tts|whisper|transcri/.test(t))                      return 'audio';
  if (/financ|trading|crypto|coin|stock|market|price|wallet|defi|nft/.test(t))     return 'finance';
  if (/travel|hotel|flight|map|geo|location|weather/.test(t))                       return 'travel';
  if (/compute|gpu|cpu|run|sandbox|browser|scrape|puppeteer|playwright/.test(t))    return 'compute';
  if (/code|github|repo|git|developer|deploy|ci/.test(t))                           return 'code';
  if (/data|database|sql|blockchain|chain|eth|btc|solana|token|onchain/.test(t))   return 'data';
  return 'text';
}

function mapX402Category(cat: string, name: string, description: string): string {
  switch (cat.toLowerCase()) {
    case 'inference': return 'text';
    case 'data':      return 'data';
    case 'infra':     return 'compute';
    case 'search':    return 'search';
    case 'social':    return 'text';
    case 'media':     return inferCategory(name + ' ' + description) === 'audio' ? 'audio' : 'image';
    case 'travel':    return 'travel';
    case 'storage':   return 'compute';
    case 'trading':   return 'finance';
  }
  return inferCategory(name + ' ' + description);
}

function mapMppCategory(cats: string[]): string {
  const priority: [string, string][] = [
    ['search', 'search'], ['image', 'image'], ['audio', 'audio'],
    ['financ', 'finance'], ['payment', 'finance'], ['travel', 'travel'],
    ['blockchain', 'data'], ['data', 'data'], ['compute', 'compute'],
    ['web', 'compute'], ['code', 'code'],
  ];
  for (const cat of cats) {
    for (const [kw, mapped] of priority) {
      if (cat.toLowerCase().includes(kw)) return mapped;
    }
  }
  return 'text';
}

function providerDomain(provider: string, endpoint: string): string {
  try { return new URL(endpoint).hostname; } catch { return provider; }
}

// Enrich names for paysponge-style wrappers:
// "tripadvisor.x402.paysponge.com" → "Tripadvisor (via Sponge)"
function enrichName(name: string, endpoint: string): string {
  try {
    const parts = new URL(endpoint).hostname.split('.');
    if (parts.length >= 3 && parts[1] === 'x402') {
      const extracted = parts[0].replace(/-/g, ' ');
      const cap = extracted.charAt(0).toUpperCase() + extracted.slice(1);
      if (cap.toLowerCase() !== name.toLowerCase()) return `${cap} (via ${name})`;
    }
  } catch { /* ignore */ }
  return name;
}

export interface RawService {
  externalId: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  priceUsdc: number;
  protocol: 'x402' | 'mpp';
  endpoint: string;
  endpointMethod: string;
}

export async function fetchX402Services(): Promise<RawService[]> {
  const results: RawService[] = [];
  const domainCounts = new Map<string, number>();
  let offset = 0;

  while (true) {
    const res = await fetch(`${X402_API}?limit=200&offset=${offset}`);
    if (!res.ok) throw new Error(`agentic.market API returned ${res.status}`);
    const data = await res.json() as { services?: any[] };
    const services = data.services ?? [];

    for (const svc of services) {
      const providerRaw = svc.provider ?? svc.domain ?? svc.name;
      for (const ep of (svc.endpoints ?? [])) {
        const price = parseFloat(ep.pricing?.amount ?? '0');
        if (!price || price <= 0) continue;

        const domain = providerDomain(providerRaw, ep.url ?? '');
        const count  = domainCounts.get(domain) ?? 0;
        if (count >= MAX_ENDPOINTS_PER_DOMAIN) continue;
        domainCounts.set(domain, count + 1);

        results.push({
          externalId:     `x402:${domain}:${ep.url}`,
          name:           enrichName(svc.name, ep.url ?? ''),
          provider:       providerRaw,
          category:       mapX402Category(svc.category ?? '', svc.name ?? '', svc.description ?? ''),
          description:    ep.description || svc.description || '',
          priceUsdc:      price,
          protocol:       'x402',
          endpoint:       ep.url,
          endpointMethod: ep.method ?? 'POST',
        });
      }
    }

    if (services.length < 200) break;
    offset += 200;
  }

  return results;
}

export async function fetchMppServices(): Promise<RawService[]> {
  const res = await fetch(MPP_API);
  if (!res.ok) throw new Error(`mpp.dev API returned ${res.status}`);
  const data = await res.json() as { services?: any[] };
  const results: RawService[] = [];

  for (const svc of (data.services ?? [])) {
    const baseUrl = svc.serviceUrl ?? svc.url ?? '';
    for (const ep of (svc.endpoints ?? [])) {
      if (!ep.payment) continue;
      const decimals = ep.payment.decimals ?? 6;
      const price = parseInt(ep.payment.amount, 10) / Math.pow(10, decimals);
      if (!price || price <= 0) continue;
      results.push({
        externalId:     `mpp:${svc.realm}:${ep.method}:${ep.path}`,
        name:           svc.name,
        provider:       svc.provider?.name ?? svc.name,
        category:       mapMppCategory(svc.categories ?? []),
        description:    ep.payment.description || ep.description || svc.description || '',
        priceUsdc:      price,
        protocol:       'mpp',
        endpoint:       baseUrl + ep.path,
        endpointMethod: ep.method ?? 'POST',
      });
    }
  }

  return results;
}
