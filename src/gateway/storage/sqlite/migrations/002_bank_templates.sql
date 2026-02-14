-- إضافة جدول أولويات المزودات (Provider Priority)
CREATE TABLE IF NOT EXISTS provider_priority (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL,
  priority INTEGER NOT NULL, -- 1 = highest priority
  enabled INTEGER DEFAULT 1,
  channel TEXT DEFAULT 'WHATSAPP', -- WHATSAPP, SMS
  fallback_provider_id TEXT,
  retry_count INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 5000,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, channel)
);

-- إضافة جدول قوالب الرسائل البنكية
CREATE TABLE IF NOT EXISTS message_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_code TEXT UNIQUE NOT NULL,
  template_name_ar TEXT NOT NULL,
  template_name_en TEXT NOT NULL,
  template_body_ar TEXT NOT NULL,
  template_body_en TEXT NOT NULL,
  category TEXT, -- TRANSACTION, ALERT, OTP, NOTIFICATION
  variables TEXT, -- JSON array of variable names
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- إدراج أولويات افتراضية
INSERT OR REPLACE INTO provider_priority (provider_id, priority, channel, fallback_provider_id) VALUES
  ('vonage', 1, 'WHATSAPP', 'meta'),
  ('meta', 2, 'WHATSAPP', 'twilio'),
  ('twilio', 3, 'WHATSAPP', 'legacy'),
  ('legacy', 4, 'SMS', NULL);

-- إدراج قوالب رسائل بنك عدن الأول الإسلامي
INSERT OR REPLACE INTO message_templates (template_code, template_name_ar, template_name_en, template_body_ar, template_body_en, category, variables) VALUES
  ('DEBIT_ALERT', 'تنبيه خصم', 'Debit Alert', 
   'بنك عدن الأول الإسلامي
عزيزي العميل، تم خصم مبلغ {amount} {currency} من حسابك {account_no}
الرصيد المتاح: {balance} {currency}
التاريخ: {date}
المرجع: {txn_id}',
   'First Aden Islamic Bank
Dear Customer, Amount {amount} {currency} has been debited from your account {account_no}
Available Balance: {balance} {currency}
Date: {date}
Ref: {txn_id}',
   'TRANSACTION', '["amount","currency","account_no","balance","date","txn_id"]'),

  ('CREDIT_ALERT', 'تنبيه إيداع', 'Credit Alert',
   'بنك عدن الأول الإسلامي
عزيزي العميل، تم إيداع مبلغ {amount} {currency} في حسابك {account_no}
الرصيد المتاح: {balance} {currency}
التاريخ: {date}
المرجع: {txn_id}',
   'First Aden Islamic Bank
Dear Customer, Amount {amount} {currency} has been credited to your account {account_no}
Available Balance: {balance} {currency}
Date: {date}
Ref: {txn_id}',
   'TRANSACTION', '["amount","currency","account_no","balance","date","txn_id"]'),

  ('TRANSFER_ALERT', 'تنبيه تحويل', 'Transfer Alert',
   'بنك عدن الأول الإسلامي
عزيزي العميل، تم تحويل مبلغ {amount} {currency} من حسابك {from_account} إلى الحساب {to_account}
الرصيد المتاح: {balance} {currency}
المرجع: {txn_id}',
   'First Aden Islamic Bank
Dear Customer, Amount {amount} {currency} has been transferred from account {from_account} to {to_account}
Available Balance: {balance} {currency}
Ref: {txn_id}',
   'TRANSACTION', '["amount","currency","from_account","to_account","balance","txn_id"]'),

  ('OTP_MESSAGE', 'رمز التحقق', 'OTP Verification',
   'بنك عدن الأول الإسلامي
رمز التحقق الخاص بك: {otp}
صالح لمدة {validity} دقائق
لا تشارك هذا الرمز مع أي شخص
المرجع: {txn_id}',
   'First Aden Islamic Bank
Your verification code: {otp}
Valid for {validity} minutes
Do not share this code
Ref: {txn_id}',
   'OTP', '["otp","validity","txn_id"]'),

  ('LOW_BALANCE_ALERT', 'تنبيه رصيد منخفض', 'Low Balance Alert',
   'بنك عدن الأول الإسلامي
عزيزي العميل، رصيدك الحالي في الحساب {account_no} هو {balance} {currency}
يرجى الإيداع لتجنب أي رسوم إضافية',
   'First Aden Islamic Bank
Dear Customer, your current balance in account {account_no} is {balance} {currency}
Please deposit to avoid additional charges',
   'ALERT', '["account_no","balance","currency"]'),

  ('CARD_TRANSACTION', 'عملية بطاقة', 'Card Transaction',
   'بنك عدن الأول الإسلامي
تمت عملية شراء بمبلغ {amount} {currency} باستخدام بطاقتك المنتهية بـ {card_last4}
التاجر: {merchant}
التاريخ: {date}
المرجع: {txn_id}',
   'First Aden Islamic Bank
Purchase of {amount} {currency} made using card ending {card_last4}
Merchant: {merchant}
Date: {date}
Ref: {txn_id}',
   'TRANSACTION', '["amount","currency","card_last4","merchant","date","txn_id"]');
