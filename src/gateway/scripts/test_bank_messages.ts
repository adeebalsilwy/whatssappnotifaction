import axios from 'axios';

async function testBankMessages() {
    const base = process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com';
    const url = `${base.replace(/\/$/, '')}/api/notify`; 

    console.log('🏦 بنك عدن الأول الإسلامي - اختبار النظام البنكي\n');
    console.log('='.repeat(60));

    const tests = [
        {
            name: 'تنبيه خصم (Debit Alert)',
            payload: {
                message: `بنك عدن الأول الإسلامي
عزيزي العميل، تم خصم مبلغ 5,000 YER من حسابك 1234567890
الرصيد المتاح: 45,000 YER
التاريخ: ${new Date().toLocaleString('ar-YE')}
المرجع: TXN-${Date.now()}`,
                mobileNo: "967774577134",
                priority: "HIGH"
            }
        },
        {
            name: 'تنبيه إيداع (Credit Alert)',
            payload: {
                message: `بنك عدن الأول الإسلامي
عزيزي العميل، تم إيداع مبلغ 10,000 YER في حسابك 1234567890
الرصيد المتاح: 55,000 YER
التاريخ: ${new Date().toLocaleString('ar-YE')}
المرجع: TXN-${Date.now()}`,
                mobileNo: "967774577134",
                priority: "HIGH"
            }
        },
        {
            name: 'رمز التحقق (OTP)',
            payload: {
                message: `بنك عدن الأول الإسلامي
رمز التحقق الخاص بك: ${Math.floor(100000 + Math.random() * 900000)}
صالح لمدة 5 دقائق
لا تشارك هذا الرمز مع أي شخص
المرجع: OTP-${Date.now()}`,
                mobileNo: "967774577134",
                priority: "HIGH"
            }
        },
        {
            name: 'تنبيه تحويل (Transfer)',
            payload: {
                message: `بنك عدن الأول الإسلامي
عزيزي العميل، تم تحويل مبلغ 3,000 YER من حسابك 1234567890 إلى الحساب 9876543210
الرصيد المتاح: 52,000 YER
المرجع: TRF-${Date.now()}`,
                mobileNo: "967774577134",
                priority: "NORMAL"
            }
        }
    ];

    for (const test of tests) {
        console.log(`\n📤 اختبار: ${test.name}`);
        console.log('-'.repeat(60));

        try {
            const res = await axios.post(url, test.payload);
            console.log('✅ الحالة:', res.status);
            console.log('📋 النتيجة:', JSON.stringify(res.data, null, 2));

            // Wait 2 seconds between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
            console.error('❌ خطأ:', err.message);
            if (err.response) {
                console.error('التفاصيل:', err.response.data);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ انتهى الاختبار');
}

testBankMessages();
