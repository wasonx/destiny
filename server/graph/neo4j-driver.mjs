import neo4j from 'neo4j-driver';

export function createNeo4jDriver(config) {
  if (!config.neo4jPassword) {
    return null;
  }

  return neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword));
}
