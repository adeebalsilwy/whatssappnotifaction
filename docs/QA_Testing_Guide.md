# دليل اختبار النظام والجودة (System Testing & QA Guide)

## 1. مقدمة (Introduction)
يهدف هذا المستند إلى توجيه فريق التطوير والجودة (QA) لكيفية إجراء اختبارات شاملة لنظام بوابة WhatsApp (WhatsApp Gateway). يغطي الدليل الاختبارات اليدوية (Manual Testing) باستخدام أدوات مثل Postman/cURL، والاختبارات الآلية (Automated Tests)، والتحقق من السجلات.

---

## 2. المتطلبات الأساسية (Prerequisites)

قبل البدء بالاختبار، تأكد من:
1. أن السيرفر يعمل محلياً:
   ```bash
   npm run dev
   ```
   (الرابط الافتراضي: `http://localhost:3000`)
   
2. ملف `.env.local` يحتوي على إعدادات Vonage الصحيحة:
   - `VONAGE_API_KEY` و `VONAGE_API_SECRET`
   - أو `VONAGE_APPLICATION_ID` و `VONAGE_PRIVATE_KEY` (للرسائل المتقدمة).

---

## 3. اختبار إرسال الرسائل (Outbound Testing)

هذا هو السيناريو الأهم للتكامل مع الأنظمة الخارجية.

### الحالة 1: إرسال رسالة ناجحة (Happy Path)
أرسل رسالة نصية بسيطة للتأكد من الربط مع Vonage.

**الأداة**: cURL أو Postman

```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "971501234567",
    "message": "Test Message via QA Guide"
  }'
```

**النتيجة المتوقعة (200 OK):**
```json
{
  "success": true,
  "provider": "vonage",
  "providerMessageId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rawResponse": { ... }
}
```

### الحالة 2: اختبار التحقق من البيانات (Validation Failure)
أرسل طلباً ناقصاً (بدون رقم هاتف) للتأكد من أن النظام يرفض الطلبات غير الصالحة.

```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Missing To Field"
  }'
```

**النتيجة المتوقعة (400 Bad Request):**
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "errors": ["to: Recipient phone number (to) is required."]
}
```

---

## 4. اختبار استقبال الرسائل (Inbound Webhook Testing)

لمحاكاة استلام رسالة من مستخدم WhatsApp وإرسالها إلى النظام (Webhook).

**ملاحظة**: هذا يتطلب وجود توقيع JWT صالح (`authorization: Bearer ...`) إذا كان التحقق مفعلاً، أو يمكن تعطيل التحقق مؤقتاً أثناء التطوير، أو استخدام الـ Payload التالي لمحاكاة البيانات (قد يتم رفضه بـ 403 إذا كان التوقيع مطلوباً، لكنه يختبر الوصول للـ Endpoint).

**الرابط**: `POST https://apinotification.firstaden-bank.com/api/webhooks/vonage/inbound`

**الطلب (Payload):**
```json
{
  "to": "14157386102",
  "from": "971501234567",
  "channel": "whatsapp",
  "message_uuid": "test-uuid-123",
  "timestamp": "2023-01-01T12:00:00Z",
  "text": "Hello from QA",
  "message_type": "text"
}
```

---

## 5. التحقق من السجلات (Log Verification)

بعد تنفيذ أي اختبار، **يجب** التحقق من الملفات لضمان تسجيل العملية. هذا جزء جوهري من اختبار "الموثوقية".

1. اذهب إلى المجلد: `logs/` في جذر المشروع.
2. افتح أحدث ملف باسم `messages-YYYY-MM-DD.log` (للرسائل) أو `vonage_debug-YYYY-MM-DD.log` (لتفاصيل Vonage).

**ماذا يجب أن تجد؟**
- للرسالة الصادرة: سطر يحتوي على `SEND_SUCCESS_TEXT` أو JSON يحتوي على `body` و `to`.
- للرسالة الواردة: سطر يحتوي على `INBOUND_WEBHOOK_RECEIVED`.

---

## 6. الاختبارات الآلية (Automated Tests)

يحتوي المشروع على اختبارات مكتوبة (Unit Tests) باستخدام Jest.

لتشغيل جميع الاختبارات:
```bash
npm test
```

لتشغيل اختبار محدد (مثلاً اختبار التحقق):
```bash
npm test tests/validation.test.ts
```

### ملفات الاختبار المتاحة:
- `tests/providersSend.test.ts`: يختبر منطق اختيار المزود (Provider Selection).
- `tests/validation.test.ts`: يختبر صحة البيانات المدخلة.
- `tests/rateLimit.test.ts`: يختبر حدود الإرسال (Rate Limiting) إذا كانت مفعلة.

---

## 7. أدوات مساعدة (Helper Tools)

### Postman Collection
يوجد ملف مجموعة Postman جاهز في المجلد:
`postman/WhatsApp.postman_collection.json`
يمكنك استيراده في برنامج Postman لتجربة جميع الـ Endpoints جاهزة.

---

## الخلاصة
تكتمل دورة الاختبار الناجحة عندما:
1. يعود الـ API بحالة `200 OK`.
2. تصل الرسالة فعلياً للهاتف (في حالة Live) أو يتم قبولها من Vonage Sandbox.
3. يظهر سجل مفصل للعملية في ملفات الـ `logs`.
