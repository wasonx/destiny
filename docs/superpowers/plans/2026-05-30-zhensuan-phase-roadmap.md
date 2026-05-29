# Zhensuan Six Phase Delivery Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide one master index for the six 甄算 delivery phases so each phase can be executed, verified, and deployed without losing the product thread.

**Architecture:** The platform is built as a staged system: account foundation first, knowledge base second, rule/report production third, entitlement/commercial capability fourth and fifth, then full online integration. Each phase produces working software and leaves the system deployable.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, Neo4j, MedusaJS, Vite, React, TypeScript, WeChat Mini Program, native `node:test`, Python unittest.

---

## Phase Plan Index

1. Phase 1: [基础账号与后台骨架](2026-05-30-zhensuan-phase1-foundation.md)
2. Phase 2: [八字知识库 MVP](2026-05-30-zhensuan-phase2-bazi-knowledge-mvp.md)
3. Phase 3: [规则引擎与报告模板](2026-05-30-zhensuan-phase3-rule-engine-report-templates.md)
4. Phase 4: [会员、积分与权益](2026-05-30-zhensuan-phase4-membership-points-entitlements.md)
5. Phase 5: [轻商城与支付预留](2026-05-30-zhensuan-phase5-commerce-payment-reservation.md)
6. Phase 6: [线上联调与发布闭环](2026-05-30-zhensuan-phase6-online-integration.md)

## Delivery Logic

- Phase 1 gives the system an identity, database, API, and admin shell.
- Phase 2 gives the system a maintainable knowledge base and first ontology sample.
- Phase 3 turns knowledge into structured conclusions and user-facing reports.
- Phase 4 adds customer value accounting: report quota, membership, growth level, and points.
- Phase 5 adds product/order/payment reservation so commercial operation has a base.
- Phase 6 connects Web/H5, mini program, admin publishing, report generation, and server operations into one live path.

## Global Quality Gates

- Every phase must end with `npm run test:server`, Python smoke tests that apply to that phase, `npm run lint`, and `npm run build`.
- Every phase must commit only its own files.
- Database migrations must be forward-only and named in sequence.
- Admin features must be protected by backend editor/platform admin sessions.
- Customer-facing flows must preserve the disclaimer and avoid absolute, medical, investment, or legal advice.
- External providers stay behind adapter modules so mocks and production providers can be swapped without changing business services.

## Dependency Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 6
   |          |          |
   |          |          -> Phase 4 -> Phase 5 -> Phase 6
   |          |
   -> Phase 4
```

Phase 2 can begin after Phase 1 database and admin shell are in place. Phase 3 needs Phase 2 knowledge/rule primitives. Phase 4 needs Phase 1 users and sessions. Phase 5 needs Phase 4 entitlement accounts. Phase 6 needs all earlier phase APIs stable.

## Execution Order

- [ ] Complete Phase 1 foundation plan.
- [ ] Execute Phase 2 knowledge MVP plan.
- [ ] Execute Phase 3 rule and report plan.
- [ ] Execute Phase 4 membership and entitlement plan.
- [ ] Execute Phase 5 commerce and payment reservation plan.
- [ ] Execute Phase 6 integration and release plan.

## Rollback Principle

Each phase should be reversible at the feature level by hiding navigation entries and disabling new routes behind configuration where practical. Database migrations are not rolled back destructively; if a migration needs correction, create a new forward migration.
