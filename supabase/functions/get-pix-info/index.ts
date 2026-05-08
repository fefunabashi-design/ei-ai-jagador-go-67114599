// Returns the Pix BR Code (copia-e-cola) payload for the monthly subscription.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AMOUNT = "29.90";

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tlv = (id: string, val: string) => `${id}${val.length.toString().padStart(2, "0")}${val}`;

function buildBRCode(key: string, name: string, city: string, amount: string, txid = "***") {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
  const gui = tlv("00", "br.gov.bcb.pix");
  const k = tlv("01", key);
  const mai = tlv("26", gui + k);
  const payload =
    tlv("00", "01") +
    tlv("01", "12") + // dynamic-ish (allows reuse with amount)
    mai +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount) +
    tlv("58", "BR") +
    tlv("59", norm(name)) +
    tlv("60", norm(city)) +
    tlv("62", tlv("05", txid));
  const toCrc = payload + "6304";
  return toCrc + crc16(toCrc);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("PIX_KEY");
  const name = Deno.env.get("PIX_RECIPIENT_NAME");
  const city = Deno.env.get("PIX_CITY");

  if (!key || !name || !city) {
    return new Response(JSON.stringify({ error: "Pix não configurado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const brcode = buildBRCode(key, name, city, AMOUNT);

  return new Response(JSON.stringify({
    amount: Number(AMOUNT),
    recipient_name: name,
    pix_key: key,
    brcode,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
