#!/usr/bin/env node
/**
 * Willkommensnachricht im Telegram-Kanal posten und anpinnen.
 *   npm run telegram:welcome
 */
import { shareButton, telegramApi } from "./telegram.mjs";
import { CATEGORIES } from "./categories.mjs";

// npm run telegram:welcome -- --edit <message_id>  → bestehende angepinnte Nachricht aktualisieren
const editIdx = process.argv.indexOf("--edit");
const editId = editIdx > 0 ? Number(process.argv[editIdx + 1]) : null;
const tags = CATEGORIES.filter((c) => c.name !== "Tech")
  .map((c) => `${c.emoji} #${c.name.replace(/[^\p{L}\p{N}]/gu, "")}`)
  .join("  ");

const text = [
  "👋 <b>Willkommen bei Berkcan Deals!</b>",
  "",
  "Hier bekommst du jeden Tag die besten <b>Tech-Deals von Amazon</b> – automatisch und sofort aufs Handy:",
  "",
  "🔥 Neue Deals laufend tagsüber – in der Black Friday Woche (19.–30.11.) im Turbo",
  "🏆 Jeden Abend um 19 Uhr die <b>Top 5 des Tages</b>",
  "",
  "🗂 <b>Nach Kategorie stöbern</b> – einfach antippen:",
  tags,
  "",
  "🔔 <b>Tipp:</b> Benachrichtigungen anlassen – gute Deals sind oft nach Minuten ausverkauft.",
  "",
  "📤 Kennst du jemanden, der gern spart? Teile den Kanal mit dem Button unten!",
  "",
  "<i>#Anzeige · Als Amazon-Partner verdiene ich an qualifizierten Verkäufen. Für dich ändert sich am Preis nichts. Preise können sich jederzeit ändern.</i>",
].join("\n");

const share = await shareButton();
if (editId) {
  await telegramApi("editMessageText", {
    message_id: editId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔥 Alle aktuellen Deals", url: "https://gentlelink.berkcanatesoglu.de/deals?utm_source=telegram&utm_medium=pinned" }],
        ...(share ? [[share]] : []),
      ],
    },
  });
  console.log(`✏️  Nachricht #${editId} aktualisiert`);
  setTimeout(() => process.exit(0), 50);
} else {
const msg = await telegramApi("sendMessage", {
  text,
  parse_mode: "HTML",
  link_preview_options: { is_disabled: true },
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔥 Alle aktuellen Deals", url: "https://gentlelink.berkcanatesoglu.de/deals?utm_source=telegram&utm_medium=pinned" }],
      ...(share ? [[share]] : []),
    ],
  },
});
console.log(`✅ Willkommensnachricht gepostet (#${msg.message_id})`);

try {
  await telegramApi("pinChatMessage", { message_id: msg.message_id, disable_notification: true });
  console.log("📌 Angepinnt");
} catch (e) {
  console.warn(`⚠️  Anpinnen nicht möglich (${e.message}) – bitte im Kanal manuell anpinnen.`);
}
setTimeout(() => process.exit(0), 50);
}
