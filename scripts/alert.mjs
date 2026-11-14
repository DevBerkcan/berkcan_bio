#!/usr/bin/env node
/**
 * Fehler-Alarm: schickt dir (telegram.ownerIds) eine private Telegram-Nachricht.
 *   node scripts/alert.mjs "Text"            (z. B. aus GitHub Actions bei Fehlern)
 *   import { sendAlert } from "./alert.mjs"   (aus dem Autopiloten)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { telegramApi, telegramConfigured } from "./telegram.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function sendAlert(text) {
  if (!telegramConfigured()) return console.warn("Alarm nicht gesendet (Telegram nicht konfiguriert):", text);
  let owners = [];
  try {
    owners = JSON.parse(await readFile(path.join(ROOT, "data", "deals.json"), "utf8")).telegram?.ownerIds ?? [];
  } catch {
    /* ohne Konfiguration kein Empfänger */
  }
  for (const id of owners) {
    try {
      await telegramApi("sendMessage", {
        chat_id: id,
        text: `🚨 <b>Deal-Bot</b>\n${text}`,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch (e) {
      console.warn(`Alarm an ${id} fehlgeschlagen: ${e.message}`);
    }
  }
  console.log("🚨 Alarm gesendet:", text.replace(/<[^>]+>/g, ""));
}

/** Höchstens ein Alarm pro Typ alle `hours` Stunden (Zustand in state.alerts). */
export async function sendAlertOnce(state, type, text, hours = 6) {
  state.alerts ??= {};
  const last = state.alerts[type] ? Date.parse(state.alerts[type]) : 0;
  if (Date.now() - last < hours * 3600 * 1000) return;
  state.alerts[type] = new Date().toISOString();
  await sendAlert(text);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await sendAlert(process.argv.slice(2).join(" ") || "Unbekannter Fehler");
  setTimeout(() => process.exit(0), 50);
}
