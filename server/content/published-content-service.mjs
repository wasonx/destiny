export async function loadPublishedReportContent(pool, { reportKind = 'life', module = 'bazi' } = {}) {
  if (!pool) {
    return { knowledge: [], rules: [], template: null };
  }

  const [knowledge, rules, templates] = await Promise.all([
    pool.query(
      `
        select *
        from app.knowledge_entries
        where status = 'published'
          and module = $1
        order by updated_at desc
        limit 50
      `,
      [module],
    ),
    pool.query(
      `
        select *
        from app.analysis_rules
        where status = 'published'
          and module = $1
        order by priority asc, weight desc
        limit 100
      `,
      [module],
    ),
    pool.query(
      `
        select *
        from app.report_templates
        where status = 'published'
          and module = $1
          and report_kind = $2
        order by published_at desc nulls last, updated_at desc
        limit 1
      `,
      [module, reportKind],
    ),
  ]);

  return {
    knowledge: knowledge.rows,
    rules: rules.rows,
    template: templates.rows[0] || null,
  };
}
