import "server-only";
import sharp from "sharp";
import { USER_AGENT } from "./sources/http";
import { freshPreviewUrl } from "./sources/deezer";
export { sliceMp3 } from "./media-slice";

/** Small LRU for remote bytes (previews + covers). */
class Lru<V> {
  private map = new Map<string, { v: V; exp: number }>();
  constructor(private max: number, private ttlMs: number) {}
  get(k: string) {
    const e = this.map.get(k);
    if (!e || e.exp < Date.now()) return undefined;
    this.map.delete(k);
    this.map.set(k, e);
    return e.v;
  }
  set(k: string, v: V) {
    this.map.set(k, { v, exp: Date.now() + this.ttlMs });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

const audioCache = new Lru<Buffer>(40, 30 * 60_000);
const imageCache = new Lru<Buffer>(80, 6 * 60 * 60_000);

const ALLOWED_HOSTS = [/\.dzcdn\.net$/, /\.deezer\.com$/, /\.genius\.com$/, /^images\.genius\.com$/, /\.rapgenius\.com$/];

async function download(url: string): Promise<Buffer> {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.some((re) => re.test(host))) throw new Error(`Refusing to fetch from ${host}`);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > 8_000_000) throw new Error("Remote file too large");
  return Buffer.from(await res.arrayBuffer());
}

export async function previewBytes(deezerId: string): Promise<Buffer | null> {
  const hit = audioCache.get(deezerId);
  if (hit) return hit;
  const url = await freshPreviewUrl(deezerId);
  if (!url) return null;
  const buf = await download(url);
  audioCache.set(deezerId, buf);
  return buf;
}

export async function coverImage(url: string, blocks: number | null, grayscale: boolean): Promise<Buffer> {
  const key = `${url}|${blocks}|${grayscale}`;
  const hit = imageCache.get(key);
  if (hit) return hit;
  let src = imageCache.get(url);
  if (!src) {
    src = await download(url);
    imageCache.set(url, src);
  }
  const size = 600;
  let img = sharp(src).resize(size, size, { fit: "cover" });
  if (blocks) {
    const small = await img.resize(blocks, blocks, { fit: "cover", kernel: "lanczos3" }).toBuffer();
    img = sharp(small).resize(size, size, { kernel: "nearest" });
  }
  if (grayscale) img = img.grayscale();
  const out = await img.webp({ quality: 82 }).toBuffer();
  imageCache.set(key, out);
  return out;
}
