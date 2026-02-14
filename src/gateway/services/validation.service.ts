export class ValidationService {
    /**
     * Normalizes a mobile number to the format 967xxxxxxxxx
     * Rules observed from requirements:
     * - 774577134 (9 digits) -> 967774577134
     * - +967774577134 -> 967774577134
     * - 00967774577134 -> 967774577134
     */
    static normalizeMobileNo(mobileNo: string | number): string {
        let numStr = String(mobileNo).trim();

        // Remove any non-digit characters except leading + if we want to handle it logically, but regex below handles logic better
        // Actually just strip all non-digits first for safety, except if it helps detection
        // Let's just strip symbols first
        numStr = numStr.replace(/[^0-9]/g, '');

        // Check for 00 prefix
        if (numStr.startsWith('00')) {
            numStr = numStr.substring(2);
        }

        // Check for Yemen default length (9 digits starting with 7)
        // Example: 774577134 -> prepend 967
        if (numStr.length === 9 && numStr.startsWith('7')) {
            return '967' + numStr;
        }

        // If it already follows 967 format (12 digits)
        if (numStr.length === 12 && numStr.startsWith('967')) {
            return numStr;
        }

        // Default return cleaned string if no specific rule matches, or throw error?
        // User requirement says "Normalize", implying best effort.
        return numStr;
    }
}
