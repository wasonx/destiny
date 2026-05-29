export function summarizeHealth(dependencies) {
  const mapped = Object.fromEntries(
    Object.entries(dependencies).map(([key, value]) => [key, value ? 'ok' : 'down']),
  );
  return {
    ok: Object.values(mapped).every((value) => value === 'ok'),
    dependencies: mapped,
  };
}

export async function checkHealth({ pool, graphDriver, config }) {
  const dependencies = { api: true, postgres: false, neo4j: false, medusa: false };

  if (pool) {
    try {
      await pool.query('select 1');
      dependencies.postgres = true;
    } catch {
      dependencies.postgres = false;
    }
  }

  if (graphDriver) {
    const session = graphDriver.session({ database: config.neo4jDatabase });
    try {
      await session.run('return 1 as ok');
      dependencies.neo4j = true;
    } catch {
      dependencies.neo4j = false;
    } finally {
      await session.close();
    }
  }

  if (config.medusaHealthUrl) {
    try {
      const response = await fetch(config.medusaHealthUrl);
      dependencies.medusa = response.ok;
    } catch {
      dependencies.medusa = false;
    }
  }

  return summarizeHealth(dependencies);
}
