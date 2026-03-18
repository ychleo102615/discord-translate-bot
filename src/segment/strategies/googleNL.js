// CJK 等語言的斷詞策略，使用 Google Cloud Natural Language API

const language = require('@google-cloud/language');

const client = new language.LanguageServiceClient();

// Google NL API POS tag 對照表（簡化版）
const POS_MAP = {
  ADJ: '形容詞',
  ADP: '介詞',
  ADV: '副詞',
  CONJ: '連接詞',
  DET: '限定詞',
  NOUN: '名詞',
  NUM: '數詞',
  PRON: '代名詞',
  PRT: '助詞',
  PUNCT: '標點',
  VERB: '動詞',
  X: '其他',
  AFFIX: '詞綴',
};

async function segment(text, lang) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
    language: lang,
  };

  const [result] = await client.analyzeSyntax({ document, encodingType: 'UTF8' });
  const tokens = result.tokens || [];

  return tokens
    .filter(t => t.partOfSpeech?.tag !== 'PUNCT')
    .map(t => ({
      word: t.text?.content || '',
      lemma: t.lemma || t.text?.content || '',
      pos: POS_MAP[t.partOfSpeech?.tag] || null,
    }))
    .filter(t => t.word.length > 0);
}

module.exports = { segment };
