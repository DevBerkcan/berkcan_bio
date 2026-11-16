/**
 * Lädt ein Bild serverseitig und gibt es als data:-URL zurück, damit
 * ImageResponse nicht abbricht, wenn das Bild fehlt. null = nicht ladbar.
 */
export async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      // Amazons Bild-CDN lehnt Anfragen ohne Browser-Kennung aus Rechenzentren teils ab
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        // Nur Formate, die der Grafik-Generator (satori) lesen kann – kein AVIF/WebP
        Accept: "image/jpeg,image/png;q=0.9,image/gif;q=0.5",
      },
    });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !/^image\/(jpeg|jpg|png|gif)$/.test(type)) return null;
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
