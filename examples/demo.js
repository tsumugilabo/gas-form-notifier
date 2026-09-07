'use strict';

// GAS を使わずに、正規化と通知本文の組み立てだけを手元で確認するデモ。
//   node examples/demo.js

const { loadGs } = require('../test/load');
const { normalizeResponse } = loadGs('normalize.gs');
const { buildEmailBody, buildSlackPayload, buildErrorNotice } = loadGs('notify.gs');

const samples = [
  {
    label: '正常な回答',
    answers: {
      'お名前': '山田　太郎',
      'メールアドレス': 'taro@example.com',
      '電話番号': '09012345678',
      '会社名': '株式会社サンプル',
      'お問い合わせ内容': '見積もりを  お願いします。',
    },
  },
  {
    label: '項目名がゆれている回答',
    answers: { '氏名': '佐藤 花子', 'メール': 'hanako@example.com', '内容': '資料送付希望' },
  },
  {
    label: '必須が欠けた回答',
    answers: { 'お名前': '', 'メールアドレス': 'bad-address', 'お問い合わせ内容': '' },
  },
];

for (const s of samples) {
  console.log('\n============================================================');
  console.log('■', s.label);
  console.log('============================================================');

  const { record, errors } = normalizeResponse(s.answers, {
    submittedAt: new Date(2026, 3, 5, 12, 0, 0),
  });

  console.log('\n[正規化レコード]');
  console.log(record);

  if (errors.length) {
    console.log('\n[エラーあり → 警告通知]');
    console.log(buildErrorNotice(record, errors));
    continue;
  }

  const mail = buildEmailBody(record, { sheetUrl: 'https://docs.google.com/spreadsheets/d/xxxx', rowNumber: 7 });
  console.log('\n[通知メール]');
  console.log('件名:', mail.subject);
  console.log(mail.body);

  console.log('\n[Slack ペイロード]');
  console.log(JSON.stringify(buildSlackPayload(record, { sheetUrl: 'https://docs.google.com/spreadsheets/d/xxxx' }), null, 2));
}
