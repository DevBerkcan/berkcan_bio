#!/usr/bin/env node
/**
 * Claude-Kurator – Hilfsskript für die tägliche Deal-Auswahl durch Claude.
 *
 *   node scripts/curator.mjs candidates [--limit 80]
 *       Liest alle Deal-Feeds (nur Amazon.de, < 24 h), löst ASINs auf, lässt bereits
 *       gepostete/eingereihte Produkte weg und schreibt die Kandidaten nach
 *       .curator/candidates.json (wird nicht committet).
 *
 *   node scripts/curator.mjs enqueue .curator/picks.json
 *       Legt die von Claude ausgewählten Deals als data/queue/curator-<datum>.json ab.
 *       Format je Eintrag: { asin, title, price?, oldPrice?, note?, category? }
 *
 *   node scripts/curator.mjs report "<Text>"
 *       Schickt dir den Tagesbericht privat per Telegram.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FILES, categoryFor, cleanTitle, findReferencePrice, readFeed, readJSON, resolveAsin } from "./autopilot.mjs";
import { sendToOwner } from "./alert.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, ".curator");
const [cmd, ...args] = process.argv.slice(2);

async function knownAsins() {
  const known = new Set();
  const state = await readJSON(FILES.state, { posted: {} });
  Object.keys(state.posted ?? {}).forEach((a) => known.add(a));
  (await readJSON(FILES.queue, [])).forEach((q) => known.add(q.asin));
  try {
    for (const f of await readdir(FILES.queueDir)) {
      if (f.endsWith(".json")) (await readJSON(path.join(FILES.queueDir, f), [])).forEach((q) => known.add(q.asin));
    }
  } catch {
    /* kein Ordner */
  }
  const config = await readJSON(FILES.config, {});
  (config.deals ?? []).forEach((d) => known.add(d.asin));
  return { known, config };
}

async function candidates() {
  const limit = Number(args[args.indexOf("--limit") + 1]) || 80;
  const { known, config } = await knownAsins();
  const cfg = config.autopilot;
  const items = new Map();
  for (const feed of cfg.feeds) {
    try {
      for (const it of await readFeed(feed)) if (it.threadId && !items.has(it.threadId)) items.set(it.threadId, { ...it, feed });
    } catch (e) {
      console.warn("⚠️ ", e.message);
    }
  }
  const now = Date.now();
  const pool = [...items.values()]
    .filter((it) => /^amazon(\.de)?$/i.test(it.merchant.trim()))
    .filter((it) => it.price && it.pubDate && now - Date.parse(it.pubDate) <= 24 * 3600 * 1000)
    .map((it) => ({ ...it, oldPrice: findReferencePrice(`${it.title} ${it.description}`, it.price) }))
    .sort((a, b) => Number(!!b.oldPrice) - Number(!!a.oldPrice) || (b.temperature ?? 0) - (a.temperature ?? 0));

  const out = [];
  for (const it of pool) {
    if (out.length >= limit) break;
    let asin = null;
    try {
      asin = await resolveAsin(it.threadId);
    } catch {
      /* überspringen */
    }
    if (!asin || known.has(asin) || out.some((o) => o.asin === asin)) continue;
    out.push({
      asin,
      title: cleanTitle(it.title),
      rawTitle: it.title.replace(/^\s*-?\d+°\s*-\s*/, ""),
      price: it.price,
      oldPrice: it.oldPrice ?? null,
      savings: it.oldPrice ? Math.round((it.oldPrice - it.price) * 100) / 100 : null,
      discountPct: it.oldPrice ? Math.round((1 - it.price / it.oldPrice) * 100) : null,
      temperature: it.temperature,
      category: categoryFor(it),
      mydealzCategory: it.category,
      description: it.description.replace(/\s+/g, " ").slice(0, 280),
      postedAt: new Date(Date.parse(it.pubDate)).toISOString(),
    });
  }
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "candidates.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`${out.length} Kandidaten → .curator/candidates.json (aus ${items.size} Feed-Einträgen)`);
}

async function enqueue() {
  const file = args[0];
  if (!file) throw new Error("Pfad zur Auswahl-Datei fehlt");
  const picks = JSON.parse(await readFile(path.resolve(file), "utf8"));
  const now = new Date().toISOString();
  const items = picks
    .filter((p) => /^[A-Z0-9]{10}$/.test(p.asin) && p.title)
    .map((p) => ({
      asin: p.asin,
      title: String(p.title).slice(0, 80),
      ...(p.price ? { price: Number(p.price) } : {}),
      ...(p.oldPrice && Number(p.oldPrice) > Number(p.price) ? { oldPrice: Number(p.oldPrice) } : {}),
      ...(p.note ? { note: String(p.note).slice(0, 120) } : {}),
      ...(p.category ? { category: String(p.category) } : {}),
      addedAt: p.postedAt ?? now,
    }));
  await mkdir(FILES.queueDir, { recursive: true });
  const name = `curator-${now.slice(0, 10)}-${Date.now().toString(36)}.json`;
  await writeFile(path.join(FILES.queueDir, name), JSON.stringify(items, null, 2) + "\n");
  console.log(`${items.length} Deals → data/queue/${name}`);
}

if (cmd === "candidates") await candidates();
else if (cmd === "enqueue") await enqueue();
else if (cmd === "report") await sendToOwner(args.join(" "));
else console.log("Nutzung: node scripts/curator.mjs candidates|enqueue <datei>|report <text>");
setTimeout(() => process.exit(0), 50);
