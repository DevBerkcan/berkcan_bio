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
  { name: "Spielzeug & LEGO", emoji: "🧸", slug: "spielzeug" },
  { name: "Beauty & Pflege", emoji: "💄", slug: "beauty" },
  { name: "Sport & Outdoor", emoji: "⚽", slug: "sport" },
  { name: "Licht & Garten", emoji: "💡", slug: "garten" },
  { name: "Bücher & Filme", emoji: "📚", slug: "medien" },
  { name: "Lebensmittel & Drinks", emoji: "🛒", slug: "lebensmittel" },
  { name: "Mode & Reise", emoji: "👟", slug: "mode" },
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
  ["Spielzeug & LEGO", /(\blego\b|playmobil|spielzeug|puppe|barbie|hot wheels|brettspiel|gesellschaftsspiel|puzzle|kinderspiel|tonie|ravensburger|hasbro|monopoly)/i],
  ["Beauty & Pflege", /(rasierer|zahnb[üu]rste|oral-?b|philips sonicare|epilierer|haartrockner|f[öo]hn\b|gl[äa]tteisen|dyson airwrap|parf[üu]m|eau de|duschgel|shampoo|creme|bartschneider|haarschneider|braun series)/i],
  ["Sport & Outdoor", /(fitness|hantel|laufband|yoga|sportuhr|fahrrad|e-?bike|zelt|schlafsack|rucksack|wanderschuh|camping|thermosflasche|isomatte)/i],
  ["Licht & Garten", /(rasenm[äa]her|m[äa]hroboter|hochdruckreiniger|k[äa]rcher|gartenschlauch|heckenschere|grill\b|led-?(streifen|strip|lampe|leuchte)|lichterkette|stehlampe|deckenleuchte|solarleuchte)/i],
  ["Bücher & Filme", /(blu-?ray|\bdvd\b|4k uhd|steelbook|taschenbuch|gebundene ausgabe|\bbuch\b|roman|h[öo]rbuch|kindle edition|manga|comic)/i],
  ["Lebensmittel & Drinks", /(kaffeebohnen|\bkaffee\b|\btee\b|schokolade|haribo|snack|m[üu]sli|whisky|\bgin\b|\bwein\b|\bbier\b|energy ?drink|mineralwasser|protein)/i],
  ["Mode & Reise", /(sneaker|schuhe|jacke|hoodie|t-?shirt|jeans|koffer|trolley|reisetasche|sonnenbrille|armbanduhr|portemonnaie|geldb[öo]rse)/i],
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
  "gruppe/router": "Computer",
  "gruppe/usb-stick": "Computer",
  "gruppe/kindle": "Amazon-Geräte",
  "gruppe/spielzeug": "Spielzeug & LEGO",
  "gruppe/lego": "Spielzeug & LEGO",
  "gruppe/beauty": "Beauty & Pflege",
  "gruppe/rasierer": "Beauty & Pflege",
  "gruppe/parfum": "Beauty & Pflege",
  "gruppe/sport": "Sport & Outdoor",
  "gruppe/fitness": "Sport & Outdoor",
  "gruppe/outdoor": "Sport & Outdoor",
  "gruppe/garten": "Licht & Garten",
  "gruppe/beleuchtung": "Licht & Garten",
  "gruppe/buecher": "Bücher & Filme",
  "gruppe/blu-ray": "Bücher & Filme",
  "gruppe/lebensmittel": "Lebensmittel & Drinks",
  "gruppe/getraenke": "Lebensmittel & Drinks",
  "gruppe/schuhe": "Mode & Reise",
  "gruppe/koffer": "Mode & Reise",
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
