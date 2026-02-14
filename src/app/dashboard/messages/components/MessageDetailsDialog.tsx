'use client';

import { Message } from '@/server/messagesRepo';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface MessageDetailsDialogProps {
    message: Message;
    onClose: () => void;
}

export function MessageDetailsDialog({ message, onClose }: MessageDetailsDialogProps) {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>تفاصيل الرسالة</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">معلومات أساسية</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">رقم المعاملة:</span>
                                <p className="font-mono">{message.transId}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">رقم الجوال:</span>
                                <p className="font-mono">{message.mobileNo}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">الحالة:</span>
                                <Badge className="mt-1">{message.status}</Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground">الأولوية:</span>
                                <p>{message.priority}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2">الرسالة</h3>
                        <p className="text-sm bg-muted p-3 rounded-md">{message.message}</p>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2">معلومات الإرسال</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">المزود:</span>
                                <p>{message.selectedProvider || '-'}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">معرف المزود:</span>
                                <p className="font-mono text-xs">{message.providerMessageId || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {message.lastError && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="font-semibold mb-2 text-red-600">الخطأ</h3>
                                <p className="text-sm bg-red-50 dark:bg-red-950 p-3 rounded-md text-red-900 dark:text-red-100">
                                    {message.lastError}
                                </p>
                            </div>
                        </>
                    )}

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2">التواريخ</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                                <p>{new Date(message.createdAt).toLocaleString('ar-YE')}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">آخر تحديث:</span>
                                <p>{new Date(message.updatedAt).toLocaleString('ar-YE')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
