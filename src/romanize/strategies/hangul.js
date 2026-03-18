const hangul = require('hangul-romanization');

function romanize(text) {
  return hangul.convert(text);
}

module.exports = { romanize };
