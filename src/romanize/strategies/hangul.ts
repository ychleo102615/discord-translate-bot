import hangul from 'hangul-romanization';

export function romanize(text: string): string {
  return hangul.convert(text);
}
