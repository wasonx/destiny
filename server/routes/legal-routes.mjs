import { legalDocuments } from '../legal/legal-content.mjs';

export function mountLegalRoutes(app) {
  app.get('/destiny-api/legal', (_req, res) => {
    res.json(legalDocuments);
  });
}
