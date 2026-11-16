/**
 * Einheitliche Deal-Kategorien für Bot, Kurator und Webseite.
 * Reihenfolge = Reihenfolge der Filter auf /deals.
 * Zuordnung: zuerst Stichwörter im Titel, dann der Themen-Feed, sonst "Tech".
 */
export const CATEGORIES = [
  { name: "Amazon-Geräte", emoji: "📦", slug: "amazon-geraete" },
  { name: "Audio", emoji: "🎧", slug: "audio" },
  { name: "Computer", emoji: "💻", slug: "computer" },
  { name: "Smartphone & Tablet", emoji: "📱", slug: "smartphone" },
  { name: "TV & Heimkino", emoji: "📺", slug: "tv" },
  { name: "Gaming", emoji: "🎮", slug: "gaming" },
  { name: "Smart Home", emoji: "🏠", slug: "smart-home" },
  { name: "Haushalt", emoji: "🧹", slug: "haushalt" },
  { name: "Küche", emoji: "🍳", slug: "kueche" },
  { name: "Werkzeug", emoji: "🔧", slug: "werkzeug" },
  { name: "Foto & Video", emoji: "📷", slug: "foto" },
  { name: "Zubehör & Laden", emoji: "🔌", slug: "zubehoer" },
  { name: "Tech", emoji: "⚡", slug: "tech" },
];

// Erste passende Regel gewinnt – spezifische Begriffe zuerst.
const RULES = [
  // Deutsche Wörter ohne \b, damit auch Komposita passen (Bratpfanne, Heißluftfritteuse …)
  ["Amazon-Geräte", /\b(echo (dot|show|pop|spot|studio)|fire ?tv|fire hd|kindle|ring (intercom|video|outdoor|indoor|stick|spotlight|floodlight|doorbell|alarm|türklingel|kamera)|blink (outdoor|mini|video)|eero)\b/i],
  ["Computer", /(mainboard|motherboard|grafikkarte|geforce|\brtx ?\d|radeon|\bssd\b|nvme|\bm\.2\b|festplatte|\bhdd\b|\bnas\b|nasync|monitor|bildschirm|\brouter\b|mesh-?wlan|prozessor|ryzen|intel core|arbeitsspeicher|\bddr[45]\b|notebook|laptop|macbook|chromebook|usb-?c?[- ]?stick|speicherkarte|microsd|drucker|webcam|tastatur|keyboard|\bmaus\b|-maus\b|mouse|dockingstation|usb-c[- ]hub|schreibtisch|desk\b)/i],
  ["Gaming", /(\bps5\b|\bps4\b|playstation|\bxbox\b|nintendo|switch 2|switch oled|steam deck|gaming|controller|dualsense|joy-?con|\(ps5\)|\(switch\))/i],
  ["TV & Heimkino", /(fernseher|smart[- ]tv|\btv\b(?![- ]?stick)|qled|mini-?led|soundbar|beamer|projektor|heimkino|av-receiver)/i],
  ["Audio", /(kopfh[öo]rer|headphone|earbuds|in-?ear|over-?ear|lautsprecher|speaker|bluetooth[- ]box|sonos|soundcore|plattenspieler|mikrofon)/i],
  ["Smartphone & Tablet", /(smartphone|\bhandy\b|iphone|galaxy (s|a|z)\d*|\bpixel \d|redmi|\bxiaomi \d|\bpoco\b|oneplus|tablet|\bipad\b|galaxy tab|smartwatch|apple watch|galaxy watch|fitness-?tracker|smart ring|\boura\b)/i],
  ["Smart Home", /(smart home|\bhue\b|\btado\b|thermostat|steckdose|smart plug|[üu]berwachungskamera|reolink|\btapo\b|alarmanlage|t[üu]rklingel|t[üu]rsprechanlage|sicherheitskamera)/i],
  ["Küche", /(fritteuse|heißluft|airfryer|kaffeevollautomat|kaffeemaschine|espresso|siebtr[äa]ger|mixer|blender|k[üu]chenmaschine|thermomix|pfanne|kochtopf|topfset|messer|geschirr|toaster|wasserkocher|sandwichmaker|waffeleisen)/i],
  ["Haushalt", /(staubsauger|saugroboter|wischroboter|sauger\b|trockner|waschmaschine|geschirrsp[üu]ler|luftreiniger|luftentfeuchter|heizl[üu]fter|ventilator|b[üu]geleisen|dampfreiniger|trinkflasche)/i],
  ["Werkzeug", /(akku-?(schrauber|bohr|s[äa]ge|winkel)|bohrer|bohrmaschine|schrauber|bit-?set|werkzeug|zange|\bs[äa]ge\b|l[öo]tkolben|multimeter|kompressor|bosch professional|makita|metabo|einhell|dewalt|ryobi|\bwera\b|knipex)/i],
  ["Foto & Video", /(kamera|objektiv|gopro|action ?cam|drohne|\bdji\b|gimbal|insta360)/i],
  ["Zubehör & Laden", /(ladeger[äa]t|charger|netzteil|powerbank|ladekabel|ladestation|magsafe|\bgan\b|nexode)/i],
];

const FEED_CATEGORY = {
  "gruppe/kopfhoerer": "Audio",
  "gruppe/lautsprecher": "Audio",
  "gruppe/computer": "Computer",
  "gruppe/monitor": "Computer",
  "gruppe/ssd": "Computer",
  "gruppe/drucker": "Computer",
  "gruppe/smartphone": "Smartphone & Tablet",
  "gruppe/tablet": "Smartphone & Tablet",
  "gruppe/smartwatch": "Smartphone & Tablet",
  "gruppe/apple": "Smartphone & Tablet",
  "gruppe/kamera": "Foto & Video",
  "gruppe/fernseher": "TV & Heimkino",
  "gruppe/smart-home": "Smart Home",
  "gruppe/staubsauger": "Haushalt",
  "gruppe/haushaltsgeraete": "Haushalt",
  "gruppe/kueche": "Küche",
  "gruppe/werkzeug": "Werkzeug",
  "gruppe/gaming": "Gaming",
  "gruppe/playstation": "Gaming",
  "gruppe/nintendo": "Gaming",
  "gruppe/xbox": "Gaming",
};

const KNOWN = new Set(CATEGORIES.map((c) => c.name));
// Ältere / kurze Namen (z. B. vom Kurator) auf die neuen Kategorien abbilden
const ALIASES = {
  Smartphone: "Smartphone & Tablet",
  Tablet: "Smartphone & Tablet",
  Apple: "Smartphone & Tablet",
  TV: "TV & Heimkino",
  Foto: "Foto & Video",
  Zubehör: "Zubehör & Laden",
  "Amazon Geräte": "Amazon-Geräte",
};

/** Kategorie aus Titel (+ optional Feed bzw. bisheriger Kategorie) bestimmen. */
export function categorize(title = "", feed = "", previous = "") {
  for (const [name, re] of RULES) if (re.test(title)) return name;
  if (FEED_CATEGORY[feed]) return FEED_CATEGORY[feed];
  const prev = ALIASES[previous] ?? previous;
  if (KNOWN.has(prev) && prev !== "Tech") return prev;
  return "Tech";
}

export function categoryMeta(name) {
  return CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[CATEGORIES.length - 1];
}
