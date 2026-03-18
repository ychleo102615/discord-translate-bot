const { pinyin } = require('pinyin-pro');

function romanize(text) {
  return pinyin(text, { toneType: 'symbol' });
}

module.exports = { romanize };
