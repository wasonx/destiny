import dotenv from 'dotenv';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createPool } from './db/pool.mjs';
import { createNeo4jDriver } from './graph/neo4j-driver.mjs';

dotenv.config({ quiet: true });
dotenv.config({ path: '/etc/zhensuan/knowledge.env', override: false, quiet: true });

const config = loadConfig();
const pool = config.databaseUrl ? createPool({ config }) : null;
const graphDriver = config.neo4jPassword ? createNeo4jDriver(config) : null;
const app = createApp({ config, pool, graphDriver });

app.listen(config.port, '127.0.0.1', () => {
  console.log(`destiny api listening on http://127.0.0.1:${config.port}`);
});
