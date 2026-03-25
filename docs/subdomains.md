# Setting Up Subdomains (Vercel + Cloudflare)

Guide for pointing a subdomain (e.g. `status.haqex.com`) to a Vercel project using Cloudflare DNS.

## Prerequisites

- Vercel CLI installed and authenticated (`npm i -g vercel`)
- Cloudflare API token with **Edit zone DNS** permission scoped to `haqex.com`
- Project already deployed to Vercel

## Steps

### 1. Get your Cloudflare Zone ID

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=haqex.com" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" | jq '.result[0].id'
```

Save this as `$ZONE_ID`.

### 2. Add an A record in Cloudflare

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "<subdomain>",
    "content": "76.76.21.21",
    "ttl": 1,
    "proxied": false
  }'
```

> **Important:** Set `proxied: false` (grey cloud in Cloudflare dashboard). If Cloudflare proxy is enabled, Vercel will see Cloudflare's IPs instead of its own and mark the domain as misconfigured.

### 3. Add the domain to the Vercel project

Run this from the project directory (where `.vercel/project.json` exists):

```bash
vercel domains add <subdomain>.haqex.com
```

This adds the subdomain to the project and auto-assigns it to the latest production deployment.

### 4. Verify

Check DNS propagation:

```bash
nslookup <subdomain>.haqex.com 1.1.1.1
```

Should return `76.76.21.21`.

Check Vercel is serving it:

```bash
curl -sI --resolve <subdomain>.haqex.com:443:76.76.21.21 https://<subdomain>.haqex.com
```

Should return `HTTP/2 200` with a Let's Encrypt SSL cert. Vercel provisions the cert automatically once DNS is verified.

## Gotchas

- **Don't enable Cloudflare proxy (orange cloud).** Vercel needs to see its own IP (`76.76.21.21`) in DNS resolution. Cloudflare proxy rewrites this to Cloudflare IPs and Vercel will flag the domain as misconfigured.
- **Vercel registers the root domain automatically.** When you add `sub.haqex.com`, Vercel also registers `haqex.com` on your account. It will warn about nameservers not matching — this is fine and can be ignored since we're using Cloudflare DNS, not Vercel DNS.
- **SSL provisioning takes ~1 minute.** Vercel auto-provisions a Let's Encrypt cert after DNS verification passes.
- **Local DNS cache.** If the domain doesn't resolve on your machine after setup, flush DNS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`

## Quick Reference

| What | Value |
|------|-------|
| Vercel A record IP | `76.76.21.21` |
| Vercel CNAME target | `cname.vercel-dns.com` |
| Cloudflare proxy | **Off** (DNS only / grey cloud) |
| TTL | Auto (`1`) |

## Example: Full setup for `app.haqex.com`

```bash
export CF_API_TOKEN="your-token"
export ZONE_ID="your-zone-id"

# Add DNS record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"app","content":"76.76.21.21","ttl":1,"proxied":false}'

# Add to Vercel project (run from project dir)
vercel domains add app.haqex.com
```
