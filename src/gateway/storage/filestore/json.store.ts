import fs from 'fs';
import path from 'path';

export class JsonFileStore {
    private baseDir: string;

    constructor(baseDirArg: string) {
        this.baseDir = baseDirArg;
    }

    public async save(transId: string, data: any): Promise<string> {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');

        const dirPath = path.join(this.baseDir, year, month, day);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, `${transId}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

        return filePath;
    }
}
