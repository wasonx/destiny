import 'dotenv/config';
import { loadConfig } from '../config.mjs';
import { createNeo4jDriver } from './neo4j-driver.mjs';
import { branchConflicts, earthlyBranches, elementCycles, fiveElements, heavenlyStems, tenGods } from './bazi-seed-data.mjs';

async function mergeConcept(session, item, type) {
  await session.run(
    `
      merge (c:Concept {key: $key})
      set c.label = $label, c.type = $type, c.element = $element, c.yinYang = $yinYang
    `,
    { ...item, type },
  );
}

export async function seedBaziOntology({ driver, database = 'neo4j' }) {
  const session = driver.session({ database });
  try {
    for (const item of fiveElements) await mergeConcept(session, item, '五行');
    for (const item of heavenlyStems) await mergeConcept(session, item, '天干');
    for (const item of earthlyBranches) await mergeConcept(session, item, '地支');
    for (const item of tenGods) await mergeConcept(session, item, '十神');

    for (const stem of heavenlyStems) {
      await session.run(
        `
          match (a:Concept {label: $label}), (b:Concept {label: $element})
          merge (a)-[:BELONGS_TO]->(b)
        `,
        stem,
      );
    }

    for (const branch of earthlyBranches) {
      await session.run(
        `
          match (a:Concept {label: $label}), (b:Concept {label: $element})
          merge (a)-[:BELONGS_TO]->(b)
        `,
        branch,
      );
    }

    for (const [from, to] of elementCycles.generates) {
      await session.run('match (a:Concept {label: $from}), (b:Concept {label: $to}) merge (a)-[:GENERATES]->(b)', { from, to });
    }
    for (const [from, to] of elementCycles.restrains) {
      await session.run('match (a:Concept {label: $from}), (b:Concept {label: $to}) merge (a)-[:RESTRAINS]->(b)', { from, to });
    }
    for (const [from, to] of branchConflicts) {
      await session.run('match (a:Concept {label: $from}), (b:Concept {label: $to}) merge (a)-[:CONFLICTS_WITH]->(b) merge (b)-[:CONFLICTS_WITH]->(a)', { from, to });
    }
  } finally {
    await session.close();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const config = loadConfig();
  const driver = createNeo4jDriver(config);
  if (!driver) {
    console.error('NEO4J_PASSWORD is required');
    process.exit(1);
  }

  try {
    await seedBaziOntology({ driver, database: config.neo4jDatabase });
    console.log('bazi ontology seeded');
  } finally {
    await driver.close();
  }
}
