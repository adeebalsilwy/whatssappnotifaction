import tap from 'tap';
import { ValidationService } from '../../src/gateway/services/validation.service';
import { TransactionIdService } from '../../src/gateway/services/transactionid.service';

tap.test('ValidationService', async (t) => {
    t.equal(ValidationService.normalizeMobileNo('774577134'), '967774577134', 'Should prepend 967 to 9-digit Yemen number');
    t.equal(ValidationService.normalizeMobileNo('+967774577134'), '967774577134', 'Should remove + prefix');
    t.equal(ValidationService.normalizeMobileNo('00967774577134'), '967774577134', 'Should remove 00 prefix');
    t.equal(ValidationService.normalizeMobileNo('967774577134'), '967774577134', 'Should keep valid format');
    t.equal(ValidationService.normalizeMobileNo('12345'), '12345', 'Should leave other numbers alone');
});

tap.test('TransactionIdService', async (t) => {
    const mobile = '774577134';
    const tid = TransactionIdService.generate(mobile);
    t.match(tid, /^967774577134-\d{17}$/, 'Should match format normalize(mobile)-YYYYMMDDHHmmssSSS'); // 17 digits for timestamp?
    // YYYY (4) + MM (2) + DD (2) + HH (2) + mm (2) + ss (2) + SSS (3) = 17 chars
});
