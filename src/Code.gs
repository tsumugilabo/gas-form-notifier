/**
 * エントリポイントと Google サービス呼び出し。
 *
 * セットアップ:
 *   1. Google フォームに紐づくスプレッドシートでスクリプトエディタを開く
 *   2. このプロジェクトのファイルを配置する
 *   3. スクリプトプロパティに以下を設定
 *        NOTIFY_EMAIL     … 通知先メール（カンマ区切りで複数可）
 *        SLACK_WEBHOOK_URL … （任意）Slack Incoming Webhook URL
 *        LOG_SHEET_NAME   … 追記先シート名（既定: 受信ログ）
 *   4. トリガー「フォーム送信時 -> onFormSubmit」を設定
 */

var DEFAULT_LOG_SHEET = '受信ログ';
var HEADER = ['受信日時', 'お名前', '会社名', 'メール', '電話', 'お問い合わせ内容', 'ステータス'];

function _props() {
  return PropertiesService.getScriptProperties();
}

function _logSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = _props().getProperty('LOG_SHEET_NAME') || DEFAULT_LOG_SHEET;
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** フォーム送信トリガーから呼ばれる。 */
function onFormSubmit(e) {
  var answers = {};
  if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(function (k) {
      answers[k] = Array.isArray(e.namedValues[k]) ? e.namedValues[k].join(', ') : e.namedValues[k];
    });
  }

  var submittedAt = e && e.values && e.values[0] ? e.values[0] : new Date();
  var result = normalizeResponse(answers, { submittedAt: submittedAt });
  var record = result.record;

  var sheet = _logSheet();
  if (_isDuplicate(sheet, record)) {
    return; // 二重送信は無視
  }

  var status = result.errors.length ? '要確認' : 'OK';
  sheet.appendRow([
    record.submittedAt, record.name, record.company,
    record.email, record.phone, record.message, status,
  ]);
  var rowNumber = sheet.getLastRow();
  var context = { sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(), rowNumber: rowNumber };

  if (result.errors.length) {
    _sendEmail('【要確認】フォーム回答エラー', buildErrorNotice(record, result.errors));
  } else {
    var mail = buildEmailBody(record, context);
    _sendEmail(mail.subject, mail.body);
    _postSlack(buildSlackPayload(record, context));
  }
}

function _isDuplicate(sheet, record) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var lookback = Math.min(20, last - 1);
  var rows = sheet.getRange(last - lookback + 1, 1, lookback, HEADER.length).getValues();
  var key = dedupeKey(record);
  return rows.some(function (r) {
    return dedupeKey({ name: r[1], email: r[3], message: r[5] }) === key;
  });
}

function _sendEmail(subject, body) {
  var to = _props().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  MailApp.sendEmail({ to: to, subject: subject, body: body });
}

function _postSlack(payload) {
  var url = _props().getProperty('SLACK_WEBHOOK_URL');
  if (!url) return;
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

/** 手動テスト用: サンプル回答で1件流す。 */
function runSample() {
  onFormSubmit({
    namedValues: {
      'お名前': ['山田　太郎'],
      'メールアドレス': ['taro@example.com'],
      '電話番号': ['09012345678'],
      '会社名': ['株式会社サンプル'],
      'お問い合わせ内容': ['見積もりを  お願いします。'],
    },
    values: [new Date()],
  });
}
