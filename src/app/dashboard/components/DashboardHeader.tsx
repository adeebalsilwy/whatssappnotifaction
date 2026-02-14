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
}

export function DashboardHeader() {
    const pathname = usePathname();
    const title = titles[pathname] || 'لوحة التحكم';

    return <h1 className="text-2xl font-bold">{title}</h1>;
}
