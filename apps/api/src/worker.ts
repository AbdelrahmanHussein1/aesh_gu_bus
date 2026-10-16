import { runWorker } from './jobs/worker.js';
import { pool } from './db/index.js';
const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
try {
    await runWorker({ signal: controller.signal });
}
finally {
    await pool.end();
}
