# دليل النشر إلى الإنتاج — WhatsApp Gateway

دليل كامل لرفع التطبيق إلى بيئة الإنتاج، يشمل: المتطلبات، المتغيرات السرية، الإعدادات، الخطوات التشغيلية، التحقق بعد النشر، مراقبة، وخطة استرجاع.

---

## لمحة عامة 🎯
- المشروع: WhatsApp Gateway (Node.js + Next.js)
- هدف الوثيقة: تجهيز ونشر الخادم في بيئة Production بطريقة آمنة وقابلة للمراقبة والعودة عن الأخطاء.
- ملفات مرجعية داخل المشروع: `package.json`, `next.config.ts`, `migrations/`, `scripts/register-whatsapp-templates.ts`, `docs/PRODUCTION_WEBHOOK_SETUP.md`.

---

## المتطلبات الأساسية قبل النشر ✅
1. حسابات ومفاتيح المزودين:
   - Meta (WhatsApp Cloud API): `META_ACCESS_TOKEN`, `META_WHATSAPP_NUMBER_ID`, `META_APP_SECRET`.
   - Vonage (Messages API): `VONAGE_APPLICATION_ID` + `VONAGE_PRIVATE_KEY` (أو `VONAGE_API_KEY` + `VONAGE_API_SECRET`).
   - (اختياري) أي مزودات بديلة: عنوان URL و tokens للمزود `generic` أو `direct`.
2. بنية تحتية:
   - خادم Node.js (Linux) أو مجموعة حاويات (Docker / Kubernetes).
   - قاعدة بيانات SQLite (ملف) أو قاعدة بديلة إذا تم تكوينها.
   - TLS/SSL واسم نطاق موجه إلى الـ load‑balancer.
3. CI/CD: بيئة آمنة لحفظ المتغيرات السرية (GitHub Secrets, GitLab CI variables, أو Azure Key Vault).
4. TLS & Webhook public URL مُعد ومتحقق (SSL certificate).

---

## متغيرات البيئة (Env vars) — مثال وشرح 🔐
ضع هذه المتغيرات في بيئة الإنتاج (أسماؤها كما في الكود):

- `NODE_ENV=production`
- `PORT=3000` (أو منفذ الـ reverse-proxy)
- `SQLITE_DB_PATH=/var/lib/whatsapp/gateway.db` (إن استخدمت SQLite)
- Meta / WhatsApp Cloud API:
  - `META_ACCESS_TOKEN` — توكن الوصول
  - `META_WHATSAPP_NUMBER_ID` — رقم الحساب (number id)
  - `META_APP_SECRET` — app secret (للتحقق من webhooks)
- Vonage:
  - `VONAGE_APPLICATION_ID`
  - `VONAGE_PRIVATE_KEY` (مسار أو محتوى ملف)
  - أو `VONAGE_API_KEY` و`VONAGE_API_SECRET`
  - `VONAGE_WA_TEMPLATE_LOCALE` (مثال: `en_US`)
- إعدادات عامة:
  - `DEFAULT_PROVIDER=meta|vonage|generic`
  - `RATE_LIMIT_PER_MINUTE` (مثال: `60`)
  - `SENTRY_DSN` (إن وُجد)
  - `LOG_LEVEL=info|warn|error|debug`

> ملاحظة: لا تحفظ أسرار في مستودع الكود — استخدم secret manager في CI/CD.

---

## تحضير البنية وقواعد البيانات 🛠️
1. إعداد مجلد البيانات ومصادقة الأذونات:
   - تأكد من أن المسار في `SQLITE_DB_PATH` قابل للكتابة للمستخدم الذي يشغّل الخدمة.
2. تشغيل المهاجرات/schema:
   - محليًا أو في الخادم: `node migrations/run-migration.js` أو استخدام أي سكربت نشر تقوم بإعداده.
   - تحقق من وجود الجداول الأساسية (`users`, `user_sessions`, `message_templates`, إلخ).
3. نسخ احتياطية (قبل التهيئة):
   - خذ backup من ملف `gateway.db` قبل تنفيذ أي تغييرات في البنية.

---

## تسجيل قوالب WhatsApp (Templates) — خطوات الإنتاج 📦
1. سجل القوالب لدى Meta/Vonage حسب المزود (الموافقة قد تستغرق وقتاً).
2. داخليًا، لوظيفة التسجيل الآلي استخدم: `scripts/register-whatsapp-templates.ts`
   - أو مع واجهة المزود: `scripts/send-whatsapp-templates.ts` للاختبار.
3. تأكد من تطابق `template name`, `language code`, و`components` بين مزود الرسائل وإعدادات التطبيق.

---

## إعداد الـ Webhook (استقبال الأحداث) 🔔
- تأكد من:
  - URL عام ممتد عبر HTTPS (مثال: `https://your.domain.com/api/webhook/meta`).
  - في `docs/PRODUCTION_WEBHOOK_SETUP.md` اتبع إجراءات: تحقق التوقيع، تأكيد الـ callback URL، وتفعيل الـ webhook عبر واجهة Meta.
- تحقق من أمن الويب هوك: تحقق HMAC باستخدام `META_APP_SECRET` داخل `src/app/api/...`.

---

## نشر (مثال سير عمل يدوي) — Quick deploy 🚀
1. استنساخ/سحب آخر نسخة من الفرع الرئيسي.
2. تثبيت الاعتماديات:
   - `npm ci`
3. تشغيل المهاجرات:
   - `node migrations/run-migration.js`
4. بناء التطبيق:
   - `npm run build`
5. تشغيل كخدمة (مثال باستخدام PM2):
   - `pm2 start npm --name whatsapp-gateway -- start`
6. تنفيذ تسجيل القوالب (اختياري):
   - `ts-node scripts/register-whatsapp-templates.ts`

---

## CI/CD — نموذج GitHub Actions (موجز) 📦
- خطوات موصى بها:
  1. Checkout
  2. Install (`npm ci`) + Run tests (`npm test`)
  3. Build (`npm run build`)
  4. Run DB migrations (إن أمكن)
  5. نشر إلى بيئة (SSH / Docker image → registry → deploy)
  6. بعد النشر: تشغيل smoke tests و health-checks

(أنصح بإنشاء workflow منفصل للـ `production` مع secrets محمية.)

---

## فحوصات ما بعد النشر — Smoke tests ✅
- التحقق من أن التطبيق يرد على المنفذ:
  - `curl -I https://your.domain.com/health` (أو endpoint الصحة)
- تحقق من تسجيل دخول الـ Admin:
  - اتبع `POST /api/auth/login` مع بيانات Admin المخزنة في ENV.
- إرسال رسالة اختبار عبر مزود الاختبار (Meta sandbox أو Vonage sandbox).
- تأكد من تسجيل الرسائل في قاعدة البيانات (`messages` table).

---

## مراقبة، لوجز، وتنبيهات 📊
- سجلات: احتفظ بـ logs مركزية (ELK / Datadog / Papertrail).
- أخطاء: أرسل إلى Sentry أو خدمة مشابهة (`SENTRY_DSN`).
- Metric health: rate limits, failed sends, delivery errors.
- إعداد تنبيهات على ارتفاع معدل الأخطاء أو فشل تسليم الرسائل.

---

## خطة استرجاع (Rollback) ⛑️
1. إن فشل النشر: إعادة تشغيل النسخة السابقة من الخدمة (container image أو نسخة الكود).
2. استرجاع DB من آخر نسخة احتياطية إن قام التغيير بتعديل schema غير متوافق.
3. خطوات سريعة:
   - `pm2 restart whatsapp-gateway@previous` أو استبدال الـ Docker image بالـ tag السابق.

---

## مشاكل شائعة وطرق حل سريعة 🔍
- مشكلة: Webhook يرد 500 بسبب التحقق من التوقيع.
  - تحقّق من `META_APP_SECRET` في بيئة الإنتاج وأن توقيع HMAC يتم حسابه بنفس الخوارزمية.
- مشكلة: Vonage 401 / خطأ مصادقة.
  - تأكد من مفتاح التطبيق (`VONAGE_PRIVATE_KEY`) أو مفاتيح `API_KEY/API_SECRET` وأنها في secrets.
- مشكلة: مزود يرفض إرسال template.
  - تأكد من أن القالب مُعتمد ومطابق من حيث الاسم، اللغة، والمتغيرات.

---

## Check‑list نهائي قبل فتح النظام للعمل (Go‑Live) ☑️
1. [ ] كل الاختبارات المحلية وCI تمر بنجاح (`npm test`).
2. [ ] مفاتيح المزودين في secret manager.
3. [ ] TLS/SSL صالح على النطاق.
4. [ ] Webhooks مُسجّلة ومحققة.
5. [ ] نسخ احتياطية للـ DB متاحة.
6. [ ] مراقبة/تنبيهات مفعّلة.
7. [ ] خطة استرجاع جاهزة ومجربة.

---

## أوامر مفيدة (سريعة) 💻
- تشغيل الاختبارات: `npm test`
- بناء: `npm run build`
- تشغيل محلي production: `NODE_ENV=production npm start`
- تشغيل مهاجرات: `node migrations/run-migration.js`
- تسجيل القوالب: `ts-node scripts/register-whatsapp-templates.ts`

---

## ملاحق — مراجع داخلية
- قواعد البيانات / مهاجرات: `migrations/` و `migrations/create-user-tables.js`
- سكربتات القوالب: `scripts/register-whatsapp-templates.ts`
- إعدادات Webhook: `docs/PRODUCTION_WEBHOOK_SETUP.md`
- نقاط الدخول المهمة: `src/app/api/...` (auth, webhook handlers)

---

إذا رغبت، أُنشئ مثال GitHub Actions workflow كامل للـ CI/CD أو أجهّز سكربت Dockerfile وملف `docker-compose.production.yml` وPR جاهز للنشر. هل أبدأ بإعداد أحد هذه العناصر الآن؟