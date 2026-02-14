# دليل التشغيل والإعداد للإتصال بـ Meta (WhatsApp) — Production 🔐

دليل مختصر وعملي لتشغيل وتهيئة الويب هوك والسكربتات اللازمة للربط بالـ Meta WhatsApp في بيئة الإنتاج.
يشمل: المتطلبات، إعدادات البيئة، خطوات التحقق، السكربتات التشغيلية، خطوات الاختبار، الأمن، والتشغيل المستمر.

---

## ⚙️ المتطلبات الأساسية
- Node.js (مطابق لإصدار التشغيل في البنية الخاصة بكم)
- قاعدة بيانات SQLite أو النسخة المفضلة لديك (موجودة في المشروع: `SQLITE_DB_PATH`)
- شهادة TLS صالحة للنطاق العام (HTTPS)
- المتغيرات البيئية الأساسية (ضعها في CI / Secrets / .env.production):
  - META_WHATSAPP_TOKEN أو WHATSAPP_ACCESS_TOKEN — توكن الوصول للـ Graph API
  - META_APP_SECRET — App Secret (مطلوب للتحقق من X-Hub-Signature-256)
  - META_WEBHOOK_VERIFY_TOKEN — توكن التحقق (hub.verify_token)
  - META_WHATSAPP_NUMBER_ID — Phone Number ID
  - WABA_ID — WhatsApp Business Account ID (عند الحاجة)
  - SQLITE_DB_PATH — مسار DB
  - PORT / GATEWAY_PORT — منافذ التطبيق إن لزم

> ملاحظة أمان: لا تضع القيم الحساسة في ملفات نصية غير آمنة. خزنها في secret manager أو CI secrets.

---

## 🗂️ ملفات وسكربتات مهمة في المشروع
- `src/app/api/webhooks/meta/route.ts` — نقطة الويب هوك العامة (GET للتحقق، POST للـ events).
- `src/app/api/webhooks/meta/inbound/route.ts` — استقبال رسائل واردة.
- `src/app/api/webhooks/meta/status/route.ts` — استقبال تحديثات الحالة.
- `src/lib/metaWebhook.ts` — حساب والتحقق من `X-Hub-Signature-256`، وقراءة توكنات التحقق.
- `dev-tools/setup-meta-webhook.js` — مساعد إعداد (يفحص env، يهيّئ DB ويُنتج تقرير)
- `dev-tools/override-meta-webhook.js` — سكربت لإجراء *override* (WABA / phone number) عبر Graph API.
- `docs/META_WEBHOOK_SECURITY.md` — وثائق أمنية لمطوري النظام.

---

## ✅ خطوات تهيئة الإنتاج (الترتيب الموصى به)
1. إعداد البنية التحتية
   - تأكد من وجود HTTPS (شهادة عامّة). إذا تطلّب Meta mTLS فقم بتهيئة الـ reverse proxy (Nginx/ALB) لقبول شهادات العميل.
2. إعداد المتغيرات البيئية في بيئة الإنتاج (Secrets)
   - أضف جميع المتغيرات المذكورة في القسم أعلاه (خاصة `META_APP_SECRET`).
3. تهيئة قاعدة البيانات
   - شغّل: node dev-tools/init-database.js أو سكربتات التهيئة (يجب أن تنشأ الجداول المطلوبة).
4. بدء الخادم
   - npm run build && npm start  (أو حسب صيغتك في CI/CD)
5. تسجيل الويب هوك في Meta
   - استخدم لوحة مطور Meta أو السكربت `dev-tools/override-meta-webhook.js` لوضع `override_callback_uri` و `verify_token`.
   - مثال (WABA override):
     META_WHATSAPP_TOKEN="<TOKEN>" node dev-tools/override-meta-webhook.js --waba <WABA_ID> --callback https://your.domain/api/webhooks/meta/inbound --verify-token <VERIFY_TOKEN>
6. تحقق من عمل التحقق (hub.challenge)
   - افتح المتصفح أو استخدم curl على:
     http://<your-host>/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=abc123
   - يجب أن يعيد الخادم قيمة `abc123` إذا كان التوكن صحيحاً.
7. تفعيل المراقبة والـ logging
   - تأكد من تمكين سجلات `api_logs`, وملفات السجل لرسائل وwebhook events.

---

## 🔐 أمن الويب هوك (مطلوبات تشغيل آمن)
- وضع `META_APP_SECRET` في بيئة الإنتاج — سيُستخدم للتحقق من `X-Hub-Signature-256`.
- رفض أي POST لا يمر التحقق (يُرجع 403).
- استخدم TLS كامل (HTTPS). إن طلب Meta mTLS فأنهي العملية عند proxy.
- حصر عنوان الـ callback IPs إن أمكن (قوائم Meta/FB) و/أو تفعيل تحقق DNS/SNI

---

## 🧪 أوامر فحص واختبار سريعة (Production-safe)
- اختبار GET verification (hub.challenge):
  curl "https://your.domain/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=$META_WEBHOOK_VERIFY_TOKEN&hub.challenge=hello"

- اختبار POST موقّع (مثال توليد توقيع محلي):
  node -e "const c=require('crypto');const p=JSON.stringify({entry:[]});const s=process.env.META_APP_SECRET;console.log('sha256='+c.createHmac('sha256',s).update(p).digest('hex'))" 
  ثم:
  curl -X POST https://your.domain/api/webhooks/meta/inbound \
    -H 'Content-Type: application/json' \
    -H "X-Hub-Signature-256: sha256=<SIG_FROM_ABOVE>" \
    -d '{"entry":[]}'

- تشغيل سكربت Override:
  META_WHATSAPP_TOKEN="<TOKEN>" node dev-tools/override-meta-webhook.js --waba <WABA_ID> --callback https://your.domain/api/webhooks/meta/inbound --verify-token <VERIFY_TOKEN>

---

## 🔁 CI/CD checklist قبل رفع للإنتاج
- [ ] إعداد Secrets في CI: META_APP_SECRET, META_WHATSAPP_TOKEN, META_WEBHOOK_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WABA_ID
- [ ] DB migrations مُنفّذة / نسخة احتياطية من DB إن تغيّرت الجداول
- [ ] TLS مُفعّل وتهيئة Nginx/ALB صحيحة
- [ ] Health checks (liveness/readiness) مُسجّلة
- [ ] مراقبة (logs/alerts/uptime) مُفعّلة
- [ ] Smoke tests: تحقق GET hub.challenge، إرسال رسالة اختبار للوصول

---

## 📉 مراقبة وتشغيل مستمر
- سجّل كل inbound webhook في جدول `api_logs` و/أو ملف سجل مرجعي
- راقب حالات فشل التحقق (signature mismatches) — قد تدل على اختراق أو تغيير App Secret
- أنشئ تنبيهاً عند زيادة معدّل الأخطاء أو فقدان اتصال Meta

---

## 🛠️ استكشاف الأخطاء الشائعـة وحلولها
- 403 من webhook POST
  - تأكد من وجود `X-Hub-Signature-256` وصحّة `META_APP_SECRET`.
- hub.challenge لا يرد بالقيمة الصحيحة
  - تأكد من `META_WEBHOOK_VERIFY_TOKEN` أو القيم المُخزنة في إعدادات DB
- رسائل لا تظهر في DB
  - راجع سجلات `api_logs` وملفات السجل للتأكد من وصول payloads ومعالجتها

---

## ✅ خلاصة سريعة للتشغيل الآمن في الإنتاج
1. خزّن كل الأسرار في secret manager. 2. فعّل `META_APP_SECRET` و`META_WEBHOOK_VERIFY_TOKEN`. 3. استخدم HTTPS (mTLS عند الحاجة). 4. استعمل `dev-tools/override-meta-webhook.js` لأتمتة override. 5. أضف مراقبة وتنبيهات.

---

إذا رغبت، أستطيع الآن:
- إضافة صفحة إدارة `override` في Dashboard لحفظ callback URIs وverify tokens تلقائياً، أو
- تعديل `setup-meta-webhook.js` ليجري override تلقائياً أثناء التشغيل، أو
- إنشاء سيناريو اختبارات تكاملية (signed webhook E2E).

اختر التالي الذي تريده وسأنفّذه. 👇