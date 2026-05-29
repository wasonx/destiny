import 'dotenv/config';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createPool } from './db/pool.mjs';

const config = loadConfig();
const pool = config.databaseUrl ? createPool({ config }) : null;
const app = createApp({ config, pool });

app.listen(config.port, '127.0.0.1', () => {
  console.log(`destiny api listening on http://127.0.0.1:${config.port}`);
});
