'use client';

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
    '/dashboard': 'نظرة عامة',
    '/dashboard/logs': 'سجلات الرسائل',
    '/dashboard/settings': 'إعدادات مزودي الخدمة',
    '/dashboard/testing': 'اختبار الإرسال',
    '/dashboard/users': 'إدارة المستخدمين',
    '/dashboard/reports': 'التقارير والتحليلات',
    '/dashboard/messages': 'إدارة الرسائل',
    '/dashboard/templates': 'قوالب الرسائل',
    '/dashboard/audit': 'سجلات التدقيق',
}

export function DashboardHeader() {
    const pathname = usePathname();
    const title = titles[pathname] || 'لوحة التحكم';

    return <h1 className="text-xl font-bold md:text-2xl">{title}</h1>;
}
