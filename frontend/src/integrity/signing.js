/**
 * Batch signing, byte-for-byte compatible with backend
 * modules/integrity/heartbeat.js:
 *   HMAC-SHA256(key, `${seq}.${sentAt}.${sha256hex(JSON.stringify(events))}`)
 * The key is the ingest key string, UTF-8 encoded (as Node's createHmac).
 */
const encoder = new TextEncoder();

const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const sha256Hex = async (text) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));

export const importIngestKey = (ingestKey) =>
  crypto.subtle.importKey("raw", encoder.encode(ingestKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

export const signBatch = async (cryptoKey, { seq, sentAt, events }) => {
  const input = `${seq}.${sentAt}.${await sha256Hex(JSON.stringify(events ?? []))}`;
  return hex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(input)));
};
