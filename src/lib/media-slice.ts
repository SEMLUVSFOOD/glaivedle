/**
 * Returns roughly the first `seconds` of a 30s CBR MP3 preview.
 * Browsers happily decode a truncated MP3, so the client can't peek past what's unlocked.
 */
export function sliceMp3(buf: Buffer, seconds: number, total = 30): Buffer {
  if (seconds >= total) return buf;
  let start = 0;
  if (buf.subarray(0, 3).toString("latin1") === "ID3") {
    start = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  }
  const audioBytes = buf.length - start;
  const end = start + Math.ceil((audioBytes * seconds) / total) + 1024;
  return buf.subarray(0, Math.min(end, buf.length));
}
