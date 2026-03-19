// CJK 等語言的斷詞策略，使用 Google Cloud Natural Language API

import language from '@google-cloud/language';

const client = new language.LanguageServiceClient();

interface Token {
  word: string;
  lemma: string;
  pos: string | null;
}

export async function segment(text: string, lang: string): Promise<Token[]> {
  const document = {
    content: text,
    type: 'PLAIN_TEXT' as const,
    language: lang,
  };

  const [result] = await client.analyzeSyntax({ document, encodingType: 'UTF8' });
  const tokens = result.tokens || [];

  return tokens
    .filter((t: any) => t.partOfSpeech?.tag !== 'PUNCT')
    .map((t: any) => ({
      word: t.text?.content || '',
      lemma: t.lemma || t.text?.content || '',
      pos: t.partOfSpeech?.tag || null,
    }))
    .filter((t: Token) => t.word.length > 0);
}
