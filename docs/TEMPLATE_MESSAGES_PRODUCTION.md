# تشغيل وإدارة رسائل القوالب (WhatsApp Message Templates) — Production 📣

دليل متكامل للتأكد من أن جميع الرسائل المرسلة كـ *قوالب* (Template Messages / MTM) — لتقليل مخاطر الحظر وتحسين الجودة عند الربط ببيئة الإنتاج.

---

## 🎯 الهدف
- إجبار/دعم إرسال الرسائل الحرجة كقوالب عندما يلزم (خارج نافذة الـ24 ساعة).  
- ضمان تسجيل/اختبار القوالب، تسجيل الحوادث، والتكامل الآمن في الإنتاج.

---

## ✅ ملخص السيناريوهات المدعومة (ما فعلناه في الكود)
- الخدمة الرئيسية (`WhatsAppNotificationService`) تقوم الآن بإنشاء `OutgoingMessagePayload` من نوع `messageType: 'TEMPLATE'` عند استدعاء `sendTemplateMessage`.
- مزود Meta (WhatsApp Cloud API) الآن يدعم إرسال قوالب مباشرة (`type: 'template'`).
- Vonage SDK يدعم إرسال قوالب صريحة (`messageType: 'template'`) بالإضافة إلى ميكانيكية الـfallback القديمة.
- تم تحديث الـvalidation لقبول `messageType: 'TEMPLATE'` و`templateId` + `variables`.

---

## 📦 متغيرات بيئة أساسية للقوالب (Production)
- WHATSAPP_ACCESS_TOKEN — توكن الوصول (Meta Cloud API)
- WABA_ID — WhatsApp Business Account ID (للتسجيلات/أدوات BM)
- PHONE_NUMBER_ID / META_WHATSAPP_NUMBER_ID — WhatsApp Phone Number ID
- VONAGE_WA_TEMPLATE_NAME — (اختياري) اسم قالب افتراضي عند استخدام Vonage كـ fallback
- VONAGE_WA_TEMPLATE_LOCALE — locale الافتراضي (ex: en_US)

---

## 🛠️ خطوات التشغيل والإعداد (قوالب)
1. تأكد من إنشاء/مراجعة القوالب في WhatsApp Manager أو عبر Business Management API.
2. ضع أسماء القوالب والـvariables في الملف `src/config/whatsapp-professional-templates.json` أو استخدم جدول `message_templates` في DB.
3. شغّل التحقق البنيوي (local):
   - node scripts/test-template-validation.js
4. سجّل القوالب لدى Meta (اختياري تلقائي):
   - node scripts/register-whatsapp-templates.ts  (يتطلب `WHATSAPP_ACCESS_TOKEN` و`WABA_ID`)
5. اختبر إرسال قالب فعلي (sandbox / test number):
   - node scripts/send-whatsapp-templates.ts  (يتطلب `WHATSAPP_ACCESS_TOKEN` و`PHONE_NUMBER_ID`)

---

## 🧪 خطة اختبار احترافية (pre-prod → prod)
1. وحدة ووظائف
   - Template rendering: تحقق من `TemplateService.renderTemplate()` (ملء المتغيرات، المتعلقات).
   - Provider: تحقق أن `MetaWhatsAppProvider` يرسل `type: 'template'` عندما يُمرر قالب.
   - Fallbacks: تحقق أن Vonage يقوم بإرسال القالب عند الحاجة.
2. تكامل (E2E)
   - سجل قالب اختباري في WhatsApp Manager (أو استخدم قالب مسبق الموافقة).
   - شغل `scripts/send-whatsapp-templates.ts` مع recipient sandbox.
   - راقب Webhooks (delivery, status) وتأكد من وصول الأحداث إلى `api_logs`.
3. سيناريوهات جودة/سياسة
   - إرسال قالب خارج نافذة 24 ساعة — يحدث fallback/MTM
   - إرسال قالب بمتغيرات ناقصة — يجب فشل الـrender والرجوع برسالة خطأ واضحة

---

## 🔍 مراقبة وقياسات (production)
- رصد الأخطاء: تفعيل سجلات `api_logs` وفلترة `TEMPLATE` و`TEMPLATE_RENDER_ERROR` و`ALL_PROVIDERS_FAILED`.
- Quality Signals: راقب معدلات الرفض من Meta (quality rating) عبر Business Manager.
- Alerts: إن زادت أخطاء القوالب أو تجاوزت معدلات الرفض حدًّا معينًا، فعّل تنبيه فوري.

---

## 📋 قائمة تحقق قبل الانتقال للإنتاج
- [ ] جميع القوالب المطلوبة مُسجّلة ومعتمدة في WhatsApp Manager
- [ ] ملفات القوالب في `src/config/*` مُحدّثة
- [ ] متغيرات البيئة مُحدّدة (ACCESS_TOKEN, PHONE_NUMBER_ID, WABA_ID, إلخ)
- [ ] اختبارات وحدات لتجهيز القوالب + اختبارات providers مارة
- [ ] اختبارات E2E ناجحة على بيئة stage/sandbox
- [ ] مراقبة logs وalerts مفعّلة

---

## 💡 نصائح عملية
- عند إرسال قوالب تضمن أرقام أو روابط، احرص على اعتماد Preview URL فقط بعد إرسال قالب أولي (لضمان ظهور preview).
- احتفظ بنسخة من كل قالب (name + language + components) في مستودع الشيفرة أو DB للرجوع السريع.
- سجّل `templateId` + `templateName` في كل رسالة للتمكين من تتبع مشاكل الـquality بسهولة.

---

إذا رغبت، أستطيع الآن:
- تشغيل كل الاختبارات ذات العلاقة (`npm test`) والتحقق من نتائج القوالب، أو
- تنفيذ تدقيق كامل للقوالب الحالية في `src/config` وتهيئة أي قوالب ناقصة، أو
- إعداد سيناريو E2E محدد على بيئة الاختبار مع خطوات مفصّلة للاختبار اليدوي.

اختر الإجراء التالي الذي تريدني أن أؤديه. ✅