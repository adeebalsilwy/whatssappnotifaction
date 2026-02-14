const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log('Keys in .env.local:');
    Object.keys(envConfig).forEach(key => {
        console.log(` - ${key}`);
    });
} else {
    console.log('.env.local file not found');
}
