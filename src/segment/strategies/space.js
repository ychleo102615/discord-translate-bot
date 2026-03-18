// 空格分隔語言的斷詞策略（en, ko, fr, de, es, pt, ru 等）

function segment(text) {
  return text
    .split(/[\s,.!?;:。、！？；：「」『』（）""''…—\-–]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(word => ({ word, lemma: word, pos: null }));
}

module.exports = { segment };
