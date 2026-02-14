import { ValidationService } from './validation.service';

export class TransactionIdService {
    static generate(mobileNo: string): string {
        const normalizedMobile = ValidationService.normalizeMobileNo(mobileNo);
        const date = new Date();

        // YYYYMMDDHHmmssSSS
        const timestamp = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0') +
            date.getHours().toString().padStart(2, '0') +
            date.getMinutes().toString().padStart(2, '0') +
            date.getSeconds().toString().padStart(2, '0') +
            date.getMilliseconds().toString().padStart(3, '0');

        return `${normalizedMobile}-${timestamp}`;
    }
}
