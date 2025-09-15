// src/lib/kana.ts
/** 반각 카타카나 -> 전각 카타카나 -> 히라가나로 변환 + 공백 정리 */
export function normalizeKana(s: string) {
  const trimmed = s.trim().replace(/\s+/g, '');
  // 반각 카타카나 → 전각 카타카나
  const zenkaku = trimmed.replace(/[\uFF66-\uFF9D]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFF66 + 0x30A6)
  );
  // 카타카나 → 히라가나
  return zenkaku.replace(/[\u30A1-\u30FA]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}