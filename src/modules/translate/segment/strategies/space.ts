// 空格分隔語言的斷詞策略（en, ko, fr, de, es, pt, ru 等）

interface Token {
  word: string;
  lemma: string;
  pos: null;
}

export function segment(text: string): Token[] {
  return text
    .split(/[\s,.!?;:。、！？；：「」『』（）""''…—\-–]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(word => ({ word, lemma: word, pos: null }));
}
