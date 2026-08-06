const fs = require('fs');
const path = require('path');

const RATE_LIMIT_FILE = '/tmp/demo_rate_limits.json';

try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
        fs.unlinkSync(RATE_LIMIT_FILE);
        console.log("✅ Successfully cleared all demo call rate limits (deleted demo_rate_limits.json).");
    } else {
        console.log("ℹ️ No rate limit file found. Everyone can currently make demo calls.");
    }
} catch (error) {
    console.error("❌ Failed to clear rate limits:", error);
}
