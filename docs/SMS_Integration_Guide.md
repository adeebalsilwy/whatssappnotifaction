# دليل الربط مع نظام Vonage WhatsApp (Integration Guide)

## 1. نظرة عامة (Overview)
هذا المستند يشرح كيفية عمل نظام الربط مع **Vonage WhatsApp API** في هذا المشروع. تم تصميم النظام ليكون قوياً (Robust)، آمناً، ويحتفظ بسجل كامل لكل العمليات في ملفات سجلات (Logs) وقاعدة البيانات.

## 2. بنية النظام (System Architecture)

يعتمد الربط على مكونين رئيسيين:
1. **الإرسال (Outbound)**: يتم عبر `VonageSDKProvider` الذي يستخدم مكتبة `@vonage/server-sdk`.
2. **الاستقبال (Inbound)**: يتم عبر Webhook Endpoint `/api/webhooks/vonage/inbound`.

### المميزات الرئيسية:
- **إرسال ذكي**: يحاول إرسال رسائل نصية عادية أولاً، وفي حال فشلها بسبب "نافذة الـ 24 ساعة" (Error 1340)، يقوم النظام تلقائياً بالتحويل لإرسال "قالب" (Template).
- **تخزين كامل للعمليات**: يتم تسجيل كل طلب صادر أو وارد في ملفات نصية (`.log`) بالإضافة لقاعدة البيانات.
- **أمان عالي**: التحقق من صحة التوقيعات (Signature Verification) للرسائل الواردة باستخدام JWT.

---

## 3. آلية التخزين والسجلات (Logging & Auditing)

تم تصميم النظام ليحقق شرط **"تخزين كل العمليات في الملفات"** لضمان وجود نسخة احتياطية ومراجعة دقيقة (Audit Trail) بعيداً عن قاعدة البيانات.

### موقع الملفات
يتم تخزين السجلات في المجلد:
`root/logs/vonage_debug-YYYY-MM-DD.log`

### ماذا يتم تسجيله؟
يتم تسجيل البيانات التالية بتنسيق JSON مع طابع زمني دقيق:

1. **عند الإرسال (Outbound):**
   - **SEND_ATTEMPT_TEXT**: محاولة إرسال رسالة (يحتوي على الرقم المرسل إليه، والـ ID).
   - **SEND_SUCCESS_TEXT**: نجاح الإرسال (يحتوي على رد Vonage و الـ Message UUID).
   - **SEND_FAILURE_TEXT**: فشل الإرسال (يحتوي على رمز الخطأ وتفاصيله).
   - **TEMPLATE_FALLBACK**: محاولة استخدام القوالب عند حدوث خطأ 1340.

2. **عند الاستقبال (Inbound Webhook):**
   - **INBOUND_WEBHOOK_RECEIVED**: وصول طلب جديد (يحتوي على الـ IP والـ Request ID).
   - **INBOUND_SIGNATURE_FAIL**: فشل التحقق من الحماية.
   - **INBOUND_MESSAGE_SAVED**: نجاح معالجة الرسالة وحفظها في قاعدة البيانات.

**مثال على سجل (Log Entry):**
```json
[2026-01-10T14:55:00.123Z] {"action":"SEND_SUCCESS_TEXT","response":{"message_uuid":"Target-UUID"}}
```

---

## 4. دورة الطلب والرد (Request/Response Cycle)

### أ. عند إرسال رسالة (Outbound Flow)

1. يقوم النظام باستدعاء `VonageSDKProvider.send(to, message)`.
2. يتم إنشاء سجل `SEND_ATTEMPT_TEXT` في الملف.
3. يرسل الطلب إلى Vonage API.
4. **في حال النجاح**: 
   - يتم تسجيل `SEND_SUCCESS_TEXT` في الملف.
   - يعود النظام بـ `success: true`.
5. **في حال الفشل (خطأ 1340 - Policy)**:
   - يتم تسجيل التحذير في الملف.
   - يحاول النظام إرسال القالب المحدد في `VONAGE_WA_TEMPLATE_NAME`.
   - يتم تسجيل نتيجة القالب (`SEND_SUCCESS_TEMPLATE` أو `SEND_FAILURE_TEMPLATE`).

### ب. عند استقبال رسالة (Inbound Webhook Flow)

الرابط: `POST /api/webhooks/vonage/inbound`

**الـ Request (ما يستلمه النظام):**
```json
{
  "to": "14157386102",
  "from": "447700900000",
  "channel": "whatsapp",
  "message_uuid": "0000-0000-0000",
  "timestamp": "2023-01-01T12:00:00Z",
  "text": "مرحباً بك",
  "message_type": "text"
}
```

**العمليات:**
1. **التحقق (Verification)**: فحص الـ `Authorization: Bearer <token>` والتأكد من توقيع JWT.
2. **التسجيل (Audit)**: كتابة الحدث `INBOUND_WEBHOOK_RECEIVED` في ملف اللوج.
3. **الحفظ (Persistence)**: إدخال الرسالة في جدول `messages` في قاعدة البيانات.

**الـ Response (ما يرسله النظام لـ Vonage):**
```json
{
  "ok": true,
  "requestId": "uuid-generated-by-server"
}
```

---

## 5. إعدادات البيئة (Environment Variables)

لضمان عمل النظام بشكل صحيح، تأكد من ضبط المتغيرات التالية في ملف `.env`:

```bash
# المصادقة (إما API Key/Secret أو Application ID/Private Key)
VONAGE_API_KEY=xxx
VONAGE_API_SECRET=xxx
VONAGE_APPLICATION_ID=xxx
# المسار للمفتاح الخاص أو محتواه مباشرة
VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY----- ... "

# رقم المرسل (WhatsApp Business Account Number)
VONAGE_FROM_NUMBER=14157386102

# إعدادات القوالب (للرسائل خارج نافذة 24 ساعة)
VONAGE_WA_TEMPLATE_NAME=otp_code
VONAGE_WA_TEMPLATE_LOCALE=en
VONAGE_WA_TEMPLATE_PARAMS=
```

---

## الخلاصة
هذا النظام يضمن:
1. **الموثوقية**: عبر تقنية Fallback للقوالب.
2. **الشفافية**: عبر تسجيل دقيق في الملفات (`logs/vonage_debug-*.log`).
3. **الأمان**: عبر التحقق الصارم من التواقيع.
