'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGs } = require('../tools/load-gs');

const { buildEmailBody, buildSlackPayload, buildErrorNotice } = loadGs('notify.gs');

const record = {
  submittedAt: '2026-04-05 12:00:00',
  name: '山田 太郎',
  email: 'taro@example.com',
  phone: '090-1234-5678',
  company: '株式会社サンプル',
  message: '見積もりをお願いします。',
};

test('buildEmailBody: 件名に名前と会社', () => {
  const { subject, body } = buildEmailBody(record, { sheetUrl: 'https://sheet', rowNumber: 7 });
  assert.equal(subject, '【フォーム受信】山田 太郎（株式会社サンプル）');
  assert.ok(body.includes('taro@example.com'));
  assert.ok(body.includes('見積もりをお願いします。'));
  assert.ok(body.includes('7 行目に追記'));
  assert.ok(body.includes('https://sheet'));
});

test('buildEmailBody: 会社・電話が未入力でも壊れない', () => {
  const { subject, body } = buildEmailBody({ ...record, company: '', phone: '' });
  assert.equal(subject, '【フォーム受信】山田 太郎');
  assert.ok(body.includes('電話     : (未入力)'));
});

test('buildSlackPayload: 構造とボタン', () => {
  const p = buildSlackPayload(record, { sheetUrl: 'https://sheet' });
  assert.equal(p.attachments.length, 1);
  assert.equal(p.attachments[0].text, '見積もりをお願いします。');
  assert.equal(p.attachments[0].actions[0].url, 'https://sheet');
  const titles = p.attachments[0].fields.map(f => f.title);
  assert.deepEqual(titles, ['メール', '電話', '受信日時']);
});

test('buildSlackPayload: sheetUrl なしならボタンなし', () => {
  const p = buildSlackPayload(record, {});
  assert.equal(p.attachments[0].actions, undefined);
});

test('buildErrorNotice: エラー一覧を含む', () => {
  const text = buildErrorNotice(record, ['お名前が空です', 'メールアドレスが空です']);
  assert.ok(text.includes(' - お名前が空です'));
  assert.ok(text.includes(' - メールアドレスが空です'));
});

test('JSON.stringify(payload) が有効', () => {
  const p = buildSlackPayload(record, { sheetUrl: 'https://sheet' });
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(p)));
});
