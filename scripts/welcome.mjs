#!/usr/bin/env node
/**
 * Willkommensnachricht im Telegram-Kanal posten und anpinnen.
 *   npm run telegram:welcome
 */
import { shareButton, telegramApi } from "./telegram.mjs";

const text = [
  "👋 <b>Willkommen bei Berkcan Deals!</b>",
  "",
  "Hier bekommst du jeden Tag die besten <b>Tech-Deals von Amazon</b> – automatisch und sofort aufs Handy:",
  "",
  "🎧 Audio · 💻 Computer · 📱 Smartphone · 🎮 Gaming · 🏠 Smart Home · 🔧 Werkzeug",
  "",
  "🔥 Neue Deals laufend tagsüber",
  "🏆 Jeden Abend um 19 Uhr die <b>Top 5 des Tages</b>",
  "⚡ Zum Black Friday im Turbo-Modus",
  "",
  "🔔 <b>Tipp:</b> Benachrichtigungen anlassen – gute Deals sind oft nach Minuten ausverkauft.",
  "",
  "📤 Kennst du jemanden, der gern spart? Teile den Kanal mit dem Button unten!",
  "",
  "<i>#Anzeige · Als Amazon-Partner verdiene ich an qualifizierten Verkäufen. Für dich ändert sich am Preis nichts. Preise können sich jederzeit ändern.</i>",
].join("\n");

const share = await shareButton();
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
