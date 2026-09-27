import { productionRelease, siteUrl } from '../site';
export function GET() {
 return new Response(productionRelease ? `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
