/**
 * 通知本文の組み立て（純粋関数）。
 * メール用のプレーンテキストと、Slack Incoming Webhook 用のペイロードを作る。
 */

/** 正規化レコードから通知メールの件名・本文を作る。 */
function buildEmailBody(record, context) {
  context = context || {};
  var subject = '【フォーム受信】' + (record.name || '名前未入力') +
    (record.company ? '（' + record.company + '）' : '');

  var lines = [
    'フォームに新しい回答がありました。',
    '',
    '受信日時 : ' + record.submittedAt,
    'お名前   : ' + record.name,
    '会社名   : ' + (record.company || '(未入力)'),
    'メール   : ' + record.email,
    '電話     : ' + (record.phone || '(未入力)'),
    '',
    '── お問い合わせ内容 ──',
    record.message,
  ];

  if (context.sheetUrl) {
    lines.push('', '一覧シート: ' + context.sheetUrl);
  }
  if (context.rowNumber) {
    lines.push('（' + context.rowNumber + ' 行目に追記）');
  }

  return { subject: subject, body: lines.join('\n') };
}

/** Slack Incoming Webhook 用のペイロード。 */
function buildSlackPayload(record, context) {
  context = context || {};
  var header = ':inbox_tray: フォーム受信 — ' + (record.name || '名前未入力') +
    (record.company ? ' / ' + record.company : '');

  var fields = [
    { title: 'メール', value: record.email || '(未入力)', short: true },
    { title: '電話', value: record.phone || '(未入力)', short: true },
    { title: '受信日時', value: record.submittedAt, short: true },
  ];

  var attachment = {
    color: '#2f6f4f',
    title: header,
    text: record.message,
    fields: fields,
  };
  if (context.sheetUrl) {
    attachment.actions = [{ type: 'button', text: '一覧を開く', url: context.sheetUrl }];
  }

  return { text: header, attachments: [attachment] };
}

/** バリデーションエラーがあるときの警告本文。 */
function buildErrorNotice(record, errors) {
  return [
    '⚠️ フォーム回答にエラーがあります（記録はしましたが要確認）:',
    '',
    errors.map(function (e) { return ' - ' + e; }).join('\n'),
    '',
    '受信日時 : ' + record.submittedAt,
    'お名前   : ' + (record.name || '(未入力)'),
    'メール   : ' + (record.email || '(未入力)'),
  ].join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildEmailBody: buildEmailBody,
    buildSlackPayload: buildSlackPayload,
    buildErrorNotice: buildErrorNotice,
  };
}
