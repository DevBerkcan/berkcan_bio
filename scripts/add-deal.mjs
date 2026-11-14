#!/usr/bin/env node
/**
 * Deal hinzufügen oder aktualisieren (halbautomatisch, ohne Amazon-API).
 *
 *   npm run deal -- "<amazon-link oder ASIN>" --title "Sony WH-1000XM5" \
 *       --price 249 --old 379.99 --cat Audio [--image <url>] [--subtitle "..."] [--featured]
 *
 * Existiert die ASIN schon, werden nur die angegebenen Felder überschrieben
 * und der Preis-Zeitstempel (checkedAt) auf jetzt gesetzt.
 *
 *   npm run deal -- --list            alle Deals mit Alter des Preises
 *   npm run deal -- --remove <id>     Deal löschen
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "deals.json");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function toNumber(v, name) {
  if (v === undefined) return undefined;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`--${name} ist keine Zahl: ${v}`);
  return n;
}

const ASIN_RE = /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/product\/)([A-Z0-9]{10})/i;

async function resolveAsin(input) {
  if (/^[A-Z0-9]{10}$/i.test(input)) return input.toUpperCase();
  let url = input;
  // Kurzlinks (amzn.to / amzn.eu) auflösen: nur Redirect-Header lesen, keine Seite laden
  for (let hop = 0; hop < 5 && /amzn\.(to|eu)|a\.co\//.test(url); hop++) {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    const loc = res.headers.get("location");
    if (!loc) break;
    url = new URL(loc, url).toString();
  }
  const m = url.match(ASIN_RE);
  if (!m) throw new Error(`Keine ASIN im Link gefunden: ${input}`);
  return m[1].toUpperCase();
}

function age(iso) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5;
  return h < 24 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} Tage ⚠️ Preis wird ausgeblendet`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = JSON.parse(await readFile(FILE, "utf8"));

  if (args.list) {
    for (const d of data.deals) {
      console.log(`${d.draft ? "[Entwurf] " : ""}${d.id}  (${d.asin})  ${d.price ?? "–"} €  · geprüft vor ${age(d.checkedAt)}`);
    }
    return;
  }

  if (args.remove) {
    const before = data.deals.length;
    data.deals = data.deals.filter((d) => d.id !== args.remove);
    if (data.deals.length === before) throw new Error(`Kein Deal mit id ${args.remove}`);
    await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
    console.log(`🗑  Entfernt: ${args.remove}`);
    return;
  }

  const input = args._[0];
  if (!input) {
    console.log(
      'Nutzung: npm run deal -- "<amazon-link|ASIN>" --title "..." --price 249 --old 379 --cat Audio [--image url] [--featured]'
    );
    process.exit(1);
  }

  const asin = await resolveAsin(input);
  const existing = data.deals.find((d) => d.asin === asin);
  const patch = {
    ...(args.title && { title: args.title }),
    ...(args.subtitle && { subtitle: args.subtitle }),
    ...(args.cat && { category: args.cat }),
    ...(args.image && { image: args.image }),
    ...(args.price !== undefined && { price: toNumber(args.price, "price") }),
    ...(args.old !== undefined && { oldPrice: toNumber(args.old, "old") }),
    ...(args.featured && { featured: true }),
    checkedAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, patch);
    delete existing.draft;
    console.log(`✏️  Aktualisiert: ${existing.id}`);
  } else {
    if (!args.title) throw new Error("--title ist für neue Deals Pflicht");
    let id = slugify(args.title) || asin.toLowerCase();
    if (data.deals.some((d) => d.id === id)) id = `${id}-${asin.toLowerCase()}`;
    data.deals.unshift({ id, asin, category: "Tech", ...patch });
    console.log(`✅ Neu: ${id}`);
  }

  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`   https://www.amazon.de/dp/${asin}?tag=berkcanat-21`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
