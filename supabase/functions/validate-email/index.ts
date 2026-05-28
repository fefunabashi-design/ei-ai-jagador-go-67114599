import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Lista mínima de domínios descartáveis comuns
const DISPOSABLE = new Set([
  'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
  'yopmail.com','sharklasers.com','getnada.com','trashmail.com','throwawaymail.com',
  'fakeinbox.com','maildrop.cc','dispostable.com','mintemail.com','spambog.com',
  'mohmal.com','tempr.email','emailondeck.com','mailnesia.com','tempmailaddress.com',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const e = String(email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(e)) {
      return new Response(JSON.stringify({ valid: false, reason: 'format' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domain = e.split('@')[1];

    if (DISPOSABLE.has(domain)) {
      return new Response(JSON.stringify({ valid: false, reason: 'disposable' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DNS-over-HTTPS: checa MX e, como fallback, A
    const dnsLookup = async (type: 'MX' | 'A') => {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`, {
        headers: { Accept: 'application/dns-json' },
      });
      const data = await r.json();
      return Array.isArray(data?.Answer) && data.Answer.length > 0;
    };

    const hasMx = await dnsLookup('MX');
    const hasA = hasMx ? true : await dnsLookup('A');

    if (!hasMx && !hasA) {
      return new Response(JSON.stringify({ valid: false, reason: 'no_mx' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ valid: true, warning: 'check_failed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
