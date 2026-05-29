import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeHealth } from '../ops/health-service.mjs';

test('health summary marks dependency failures', () => {
  assert.deepEqual(
    summarizeHealth({ api: true, postgres: true, neo4j: false, medusa: false }),
    {
      ok: false,
      dependencies: {
        api: 'ok',
        postgres: 'ok',
        neo4j: 'down',
        medusa: 'down',
      },
    },
  );
});
