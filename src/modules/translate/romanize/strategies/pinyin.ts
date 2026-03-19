import { pinyin } from 'pinyin-pro';

export function romanize(text: string): string {
  return pinyin(text, { toneType: 'symbol' });
}
