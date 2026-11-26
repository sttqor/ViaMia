// md5 в hex — Freedom Pay подписывает запросы md5 (WebCrypto его не умеет, берём std Deno)
import { crypto as stdCrypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";

export async function md5(text) {
  return encodeHex(await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(text)));
}
