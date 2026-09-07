'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGs } = require('../tools/load-gs');

const N = loadGs('normalize.gs');

test('tidyText: 全角スペースと連続空白を1つに', () => {
  assert.equal(N.tidyText('山田　　太郎  '), '山田 太郎');
  assert.equal(N.tidyText(null), '');
});

test('normalizePhone: 11桁携帯', () => {
  assert.equal(N.normalizePhone('09012345678'), '090-1234-5678');
  assert.equal(N.normalizePhone('０９０-１２３４-５６７８'.replace(/[０-９]/g, s => '0123456789'['０１２３４５６７８９'.indexOf(s)])), '090-1234-5678');
});

test('normalizePhone: 10桁固定', () => {
  assert.equal(N.normalizePhone('0312345678'), '03-1234-5678');
});

test('normalizePhone: 整形不能ならそのまま', () => {
  assert.equal(N.normalizePhone('内線123'), '内線123');
});

test('isEmailLike', () => {
  assert.equal(N.isEmailLike('a@example.com'), true);
  assert.equal(N.isEmailLike('a@example'), false);
  assert.equal(N.isEmailLike('  spaced @x.com'), false);
});

test('formatTimestamp: Date -> JST文字列', () => {
  const d = new Date(2026, 3, 5, 9, 7, 3); // ローカル時刻で構築
  assert.equal(N.formatTimestamp(d), '2026-04-05 09:07:03');
  assert.equal(N.formatTimestamp('not a date'), '');
});

test('normalizeResponse: 正常系', () => {
  const { record, errors } = N.normalizeResponse(
    {
      'お名前': '山田　太郎',
      'メールアドレス': 'taro@example.com',
      '電話番号': '09012345678',
      '会社名': '株式会社サンプル',
      'お問い合わせ内容': '見積もりを  お願いします。',
    },
    { submittedAt: new Date(2026, 3, 5, 12, 0, 0) },
  );
  assert.deepEqual(errors, []);
  assert.equal(record.name, '山田 太郎');
  assert.equal(record.phone, '090-1234-5678');
  assert.equal(record.message, '見積もりを お願いします。');
  assert.equal(record.submittedAt, '2026-04-05 12:00:00');
});

test('normalizeResponse: 別名の項目名を吸収', () => {
  const { record } = N.normalizeResponse({
    '氏名': '佐藤花子',
    'メール': 'hanako@example.com',
    '内容': 'テスト',
  });
  assert.equal(record.name, '佐藤花子');
  assert.equal(record.email, 'hanako@example.com');
  assert.equal(record.message, 'テスト');
});

test('normalizeResponse: 必須欠けとメール不正でエラー', () => {
  const { errors } = N.normalizeResponse({
    'お名前': '',
    'メールアドレス': 'bad-addr',
    'お問い合わせ内容': '',
  });
  assert.ok(errors.some(e => e.includes('お名前')));
  assert.ok(errors.some(e => e.includes('形式が不正')));
  assert.ok(errors.some(e => e.includes('お問い合わせ内容')));
});

test('dedupeKey: 同一内容は同じキー / 本文61字目以降の差は無視', () => {
  const a = { name: '山田 太郎', email: 'T@example.com', message: 'x'.repeat(60) + 'AAA' };
  const b = { name: '山田　太郎', email: 't@example.com', message: 'x'.repeat(60) + 'BBB' };
  assert.equal(N.dedupeKey(a), N.dedupeKey(b));
});
