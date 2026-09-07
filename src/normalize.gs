/**
 * フォーム回答の正規化（純粋関数）。
 *
 * Google Apps Script と Node.js の両方で動くように書いてある
 * （末尾で module があれば export する。GAS では module が無いので無視される）。
 */

/** 全角スペース・前後の空白を除去し、連続空白を1つにまとめる。 */
function tidyText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 電話番号を数字だけにして 0X0-XXXX-XXXX / 0X-XXXX-XXXX 形式へ。整形できなければ元の値を返す。 */
function normalizePhone(value) {
  var digits = tidyText(value).replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.charAt(0) === '0') {
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
  }
  if (digits.length === 10 && digits.charAt(0) === '0') {
    return digits.slice(0, 2) + '-' + digits.slice(2, 6) + '-' + digits.slice(6);
  }
  return tidyText(value);
}

/** メールアドレスの体裁チェック（厳密なRFCではなく実用レベル）。 */
function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tidyText(value));
}

/** Date | 文字列 | number を "YYYY-MM-DD HH:mm:ss"（JST前提）に整形。 */
function formatTimestamp(value) {
  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  );
}

/**
 * フォーム回答（項目名 -> 値 のオブジェクト）を正規化レコードに変換する。
 *
 * @param {Object} answers  例: { "お名前": "山田 太郎", "メールアドレス": "a@example.com", ... }
 * @param {Object} [opts]   { fieldMap, submittedAt }
 * @returns {{ record: Object, errors: string[] }}
 */
function normalizeResponse(answers, opts) {
  opts = opts || {};
  var map = opts.fieldMap || {
    name: ['お名前', '氏名', 'name'],
    email: ['メールアドレス', 'メール', 'email'],
    phone: ['電話番号', '電話', 'tel', 'phone'],
    company: ['会社名', '御社名', 'company'],
    message: ['お問い合わせ内容', 'ご要望', '内容', 'message'],
  };

  var lower = {};
  Object.keys(answers || {}).forEach(function (k) {
    lower[tidyText(k).toLowerCase()] = answers[k];
  });

  function pick(keys) {
    for (var i = 0; i < keys.length; i++) {
      var hit = lower[keys[i].toLowerCase()];
      if (hit !== undefined && tidyText(hit) !== '') return hit;
    }
    return '';
  }

  var record = {
    submittedAt: formatTimestamp(opts.submittedAt || new Date()),
    name: tidyText(pick(map.name)),
    email: tidyText(pick(map.email)),
    phone: normalizePhone(pick(map.phone)),
    company: tidyText(pick(map.company)),
    message: tidyText(pick(map.message)),
  };

  var errors = [];
  if (!record.name) errors.push('お名前が空です');
  if (!record.email) {
    errors.push('メールアドレスが空です');
  } else if (!isEmailLike(record.email)) {
    errors.push('メールアドレスの形式が不正です: ' + record.email);
  }
  if (!record.message) errors.push('お問い合わせ内容が空です');

  return { record: record, errors: errors };
}

/** 重複判定用のキー（氏名＋メール＋本文の先頭60字）。 */
function dedupeKey(record) {
  return [
    tidyText(record.name).toLowerCase(),
    tidyText(record.email).toLowerCase(),
    tidyText(record.message).slice(0, 60),
  ].join('|');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tidyText: tidyText,
    normalizePhone: normalizePhone,
    isEmailLike: isEmailLike,
    formatTimestamp: formatTimestamp,
    normalizeResponse: normalizeResponse,
    dedupeKey: dedupeKey,
  };
}
