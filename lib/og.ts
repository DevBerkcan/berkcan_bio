/**
 * Lädt ein Bild serverseitig und gibt es als data:-URL zurück, damit
 * ImageResponse nicht abbricht, wenn das Bild fehlt. null = nicht ladbar.
 */
export async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // Amazon liefert für unbekannte ASINs ein 1×1-GIF – das ignorieren
    if (buf.byteLength < 1000) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}
