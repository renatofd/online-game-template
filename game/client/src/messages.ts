import type { MessageCatalog } from "@core/client";

/**
 * This game's strings. English is required; missing keys in other locales fall back to English.
 * Core strings (menu, errors...) are already translated by the template.
 */
export const messages: MessageCatalog = {
  en: { "controls.hint": "Move: WASD / arrows / left stick" },
  pt: { "controls.hint": "Mover: WASD / setas / analógico esquerdo" },
  es: { "controls.hint": "Moverse: WASD / flechas / stick izquierdo" },
  fr: { "controls.hint": "Se déplacer : ZQSD / flèches / stick gauche" },
  de: { "controls.hint": "Bewegen: WASD / Pfeiltasten / linker Stick" },
  it: { "controls.hint": "Muoviti: WASD / frecce / levetta sinistra" },
  tr: { "controls.hint": "Hareket: WASD / ok tuşları / sol analog" },
  ru: { "controls.hint": "Движение: WASD / стрелки / левый стик" },
  ar: { "controls.hint": "الحركة: WASD / الأسهم / العصا اليسرى" },
  hi: { "controls.hint": "चलें: WASD / तीर कुंजियाँ / बायाँ स्टिक" },
  id: { "controls.hint": "Gerak: WASD / panah / stik kiri" },
  ja: { "controls.hint": "移動: WASD / 矢印キー / 左スティック" },
  zh: { "controls.hint": "移动：WASD / 方向键 / 左摇杆" },
  ko: { "controls.hint": "이동: WASD / 방향키 / 왼쪽 스틱" },
};
