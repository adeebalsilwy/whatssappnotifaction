# دليل إعداد المشروع للإنتاج (Production Setup Guide)

يوفر هذا الدليل خطوات تفصيلية لتشغيل بوابة إشعارات الواتساب في بيئة الإنتاج بشكل احترافي.

## 1. المتطلبات الأساسية (Prerequisites)
- Node.js v20 أو أحدث.
- حساب مطور في Meta (Meta for Developers).
- تطبيق WhatsApp مفعل على منصة ميتا.
- توكن وصول دائم (Permanent Access Token).

## 2. الإعداد البرمجي (Software Setup)

### أ. تثبيت الاعتمادات
```bash
npm install --production
```

### ب. إعداد متغيرات البيئة
قم بإنشاء ملف `.env.local` وأضف المتغيرات التالية:
```env
# رابط البوابة في الإنتاج
APINOTIFICATION_URL=https://apinotification.firstaden-bank.com/

# إعدادات ميتا (Meta)
META_WHATSAPP_API_URL=https://graph.facebook.com/v24.0
META_WHATSAPP_NUMBER_ID=1398033981696517
META_WHATSAPP_TOKEN=your_permanent_access_token
META_WEBHOOK_VERIFY_TOKEN=774577
WABA_ID=1129388509245250
META_APP_SECRET=your_app_secret

# إعدادات قاعدة البيانات
SQLITE_DB_PATH=./data/gateway.db
```

### ج. ترحيل وتسجيل القوالب
يجب تشغيل السكربتات التالية لتهيئة القوالب في قاعدة البيانات وتسجيلها لدى ميتا:
```bash
# 1. ترحيل القوالب إلى SQLite
node scripts/migrate-templates.js

# 2. تسجيل القوالب لدى ميتا
export META_WHATSAPP_TOKEN=...
export WABA_ID=...
node scripts/register-meta-templates.js
```

## 3. خطوات هامة في منصة ميتا (Meta Portal Steps)

لضمان عمل الإشعارات والويبهوك (Webhook) بشكل صحيح، يجب تنفيذ الخطوات التالية في [Meta Developers Portal](https://developers.facebook.com/):

1. **إعداد الويبهوك (Webhook Configuration)**:
   - اذهب إلى تطبيقك > WhatsApp > Configuration.
   - اضغط على **Edit** في قسم الويبهوك.
   - Callback URL: `https://apinotification.firstaden-bank.com/api/webhooks/meta`
   - Verify Token: استخدم القيمة الموجودة في `META_WEBHOOK_VERIFY_TOKEN` (مثلاً `774577`).
   - بعد الحفظ، اضغط على **Manage** وقم بالاشتراك (Subscribe) في الأحداث التالية: `messages`, `messages_deliveries`, `messages_reads`.

2. **التوكن الدائم (Permanent Access Token)**:
   - لا تستخدم التوكن المؤقت (Temporary Token) الذي تنتهي صلاحيته بعد 24 ساعة.
   - قم بإنشاء **System User** في إعدادات Business Manager.
   - امنحه صلاحيات `whatsapp_business_messaging` و `whatsapp_business_management`.
   - قم بتوليد توكن دائم واستخدمه في `META_WHATSAPP_TOKEN`.

3. **إضافة رقم الهاتف (Phone Number Setup)**:
   - تأكد من إضافة رقم هاتف حقيقي وربطه بـ WhatsApp Business Account (WABA).
   - احصل على `Phone Number ID` واستخدمه في الإعدادات.

## 4. التشغيل (Running the App)

يمكنك استخدام السكربت المخصص للإنتاج:
```bash
chmod +x scripts/prod-start.sh
./scripts/prod-start.sh
```

أو استخدام PM2 لضمان استمرارية العمل:
```bash
pm2 start npm --name "whatsapp-gateway" -- start
```

## 5. التحقق من العمل (Verification)
يمكنك اختبار إرسال رسالة تجريبية عبر API:
```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \
-H "Content-Type: application/json" \
-d '{
  "to": "967774577134",
  "messageType": "TEMPLATE",
  "templateId": "arabic_welcome_message",
  "variables": { "1": "اسم العميل" }
}'
```
