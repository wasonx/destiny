import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminScaffoldTests(unittest.TestCase):
    def test_admin_shell_contains_all_core_sections(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (ROOT / "src" / "admin").rglob("*.tsx")
        )

        for text in [
            "甄算后台",
            "总览",
            "用户管理",
            "八字本体图谱",
            "知识条目",
            "测试台",
            "分析规则",
            "报告模板",
            "会员管理",
            "权益账户",
            "积分账户",
            "商品管理",
            "库存管理",
            "订单管理",
            "支付管理",
            "发货管理",
            "退款管理",
            "审计日志",
            "运行健康",
        ]:
            self.assertIn(text, combined)

    def test_admin_entry_uses_admin_path(self):
        main = (ROOT / "src" / "main.tsx").read_text(encoding="utf-8")

        self.assertIn("startsWith('/admin')", main)
        self.assertIn("AdminApp", main)

    def test_admin_layout_exposes_settings_navigation(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")

        self.assertIn("settings", layout)
        self.assertIn("系统设置", layout)

    def test_commerce_admin_pages_call_backend_endpoints(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "src" / "admin" / "pages" / "ProductsPage.tsx",
                ROOT / "src" / "admin" / "pages" / "InventoryPage.tsx",
                ROOT / "src" / "admin" / "pages" / "OrdersPage.tsx",
                ROOT / "src" / "admin" / "pages" / "PaymentsPage.tsx",
                ROOT / "src" / "admin" / "pages" / "ShipmentsPage.tsx",
                ROOT / "src" / "admin" / "pages" / "RefundsPage.tsx",
                ROOT / "src" / "admin" / "pages" / "DeliveryLogsPage.tsx",
            ]
        )

        self.assertIn("adminRequest", combined)
        for endpoint in [
            "/products",
            "/inventory",
            "/orders",
            "/payments",
            "/shipments",
            "/refund-requests",
            "/delivery-logs",
            "mark-paid",
            "/ship",
            "/review",
        ]:
            self.assertIn(endpoint, combined)

    def test_shipments_page_exposes_shipping_feedback(self):
        page = (ROOT / "src" / "admin" / "pages" / "ShipmentsPage.tsx").read_text(encoding="utf-8")

        for text in ["请填写快递公司和单号", "发货成功", "发货失败", "setMessage", "setError"]:
            self.assertIn(text, page)

    def test_value_admin_pages_call_entitlement_endpoints(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "src" / "admin" / "pages" / "MembershipPage.tsx",
                ROOT / "src" / "admin" / "pages" / "EntitlementsPage.tsx",
                ROOT / "src" / "admin" / "pages" / "PointsPage.tsx",
            ]
        )

        self.assertIn("adminRequest", combined)
        for endpoint in [
            "/customers/",
            "/value-state",
            "/grant-quota",
            "/grant-points",
            "/grant-membership",
            "/memberships/expire-overdue",
            "/value-ledger",
        ]:
            self.assertIn(endpoint, combined)
        for text in ["客户 ID", "查询账户", "发放报告次数", "发放积分", "开通会员", "过期处理", "会员记录", "权益流水", "积分流水"]:
            self.assertIn(text, combined)

    def test_knowledge_admin_pages_expose_publish_workflow(self):
        knowledge = (ROOT / "src" / "admin" / "pages" / "KnowledgePage.tsx").read_text(encoding="utf-8")
        rules = (ROOT / "src" / "admin" / "pages" / "RulesPage.tsx").read_text(encoding="utf-8")
        templates = (ROOT / "src" / "admin" / "pages" / "TemplatesPage.tsx").read_text(encoding="utf-8")

        self.assertIn("发布", knowledge)
        self.assertIn("停用", knowledge)
        self.assertIn("版本", knowledge)
        self.assertIn("发布", rules)
        self.assertIn("停用", rules)
        self.assertIn("关联知识", rules)
        self.assertIn("发布", templates)
        self.assertIn("停用", templates)
        self.assertIn("免责声明", templates)

    def test_knowledge_admin_pages_call_publish_endpoints(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "src" / "admin" / "pages" / "KnowledgePage.tsx",
                ROOT / "src" / "admin" / "pages" / "RulesPage.tsx",
                ROOT / "src" / "admin" / "pages" / "TemplatesPage.tsx",
            ]
        )

        self.assertIn("adminRequest", combined)
        for endpoint in [
            "/knowledge",
            "/rules",
            "/templates",
            "/publish",
            "/disable",
        ]:
            self.assertIn(endpoint, combined)
        for text in ["保存草稿", "发布", "停用", "变更摘要"]:
            self.assertIn(text, combined)

    def test_knowledge_admin_pages_show_publish_version_history(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "src" / "admin" / "pages" / "KnowledgePage.tsx",
                ROOT / "src" / "admin" / "pages" / "RulesPage.tsx",
                ROOT / "src" / "admin" / "pages" / "TemplatesPage.tsx",
            ]
        )

        self.assertIn("/versions", combined)
        for text in ["版本历史", "change_summary", "published_at"]:
            self.assertIn(text, combined)

    def test_report_runs_page_calls_report_history_endpoints(self):
        page = (ROOT / "src" / "admin" / "pages" / "ReportRunsPage.tsx").read_text(encoding="utf-8")

        self.assertIn("adminRequest", page)
        self.assertIn("/report-runs", page)
        self.assertIn("命中规则", page)
        self.assertIn("知识来源", page)
        self.assertIn("图谱路径", page)
        self.assertIn("安全审查", page)

    def test_users_page_calls_user_management_endpoint(self):
        page = (ROOT / "src" / "admin" / "pages" / "UsersPage.tsx").read_text(encoding="utf-8")

        self.assertIn("adminRequest", page)
        self.assertIn("/users", page)
        for text in ["客户", "后端编辑人员", "平台管理人员", "微信登录", "手机验证码", "账号密码"]:
            self.assertIn(text, page)

    def test_users_page_exposes_identity_unlink_controls(self):
        page = (ROOT / "src" / "admin" / "pages" / "UsersPage.tsx").read_text(encoding="utf-8")

        self.assertIn("/users/${userId}/identities/${identityId}", page)
        self.assertIn("unlinkIdentity", page)
        self.assertIn("解绑身份", page)
        self.assertIn("provider_subject", page)
        self.assertIn("身份已解绑", page)

    def test_users_page_exposes_customer_merge_controls(self):
        page = (ROOT / "src" / "admin" / "pages" / "UsersPage.tsx").read_text(encoding="utf-8")

        self.assertIn("mergeCustomer", page)
        self.assertIn("mergeTargetId", page)
        self.assertIn("/users/${mergeTargetId}/merge-customer", page)
        self.assertIn("sourceUserId", page)
        self.assertIn("customer.merge", page)

    def test_users_page_exposes_identity_bind_controls(self):
        page = (ROOT / "src" / "admin" / "pages" / "UsersPage.tsx").read_text(encoding="utf-8")

        self.assertIn("bindIdentity", page)
        self.assertIn("bindProvider", page)
        self.assertIn("/users/${userId}/identities", page)
        self.assertIn("providerSubject", page)
        self.assertIn("customer_identity.bind", page)

    def test_settings_page_calls_integration_status_endpoint(self):
        page = (ROOT / "src" / "admin" / "pages" / "SettingsPage.tsx").read_text(encoding="utf-8")

        self.assertIn("adminRequest", page)
        self.assertIn("/settings/integrations", page)
        for text in ["微信登录", "短信", "支付", "退款", "快递", "模拟发送", "人工确认"]:
            self.assertIn(text, page)

    def test_sms_logs_page_calls_sms_delivery_log_endpoint(self):
        app = (ROOT / "src" / "admin" / "AdminApp.tsx").read_text(encoding="utf-8")
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        page_path = ROOT / "src" / "admin" / "pages" / "SmsLogsPage.tsx"

        self.assertTrue(page_path.exists())
        page = page_path.read_text(encoding="utf-8")
        self.assertIn("smsLogs", app)
        self.assertIn("SmsLogsPage", app)
        self.assertIn("smsLogs", layout)
        self.assertIn("短信日志", layout)
        self.assertIn("adminRequest", page)
        self.assertIn("/sms-delivery-logs", page)
        for text in ["手机号", "模拟发送", "provider", "template_id", "sign_name"]:
            self.assertIn(text, page)

    def test_testbench_page_uses_authenticated_admin_request(self):
        page = (ROOT / "src" / "admin" / "pages" / "TestBenchPage.tsx").read_text(encoding="utf-8")

        self.assertIn("adminRequest", page)
        self.assertIn("/testbench/four-pillars", page)
        self.assertIn("运行四柱分析", page)

    def test_ops_page_calls_health_and_error_endpoints(self):
        page = (ROOT / "src" / "admin" / "pages" / "OpsPage.tsx").read_text(encoding="utf-8")

        self.assertIn("adminRequest", page)
        self.assertIn("/ops/health", page)
        self.assertIn("/ops/recent-errors", page)
        for text in ["Node/Express API", "PostgreSQL", "Neo4j", "商城服务", "最近错误"]:
            self.assertIn(text, page)

    def test_audit_logs_page_calls_audit_endpoint(self):
        app = (ROOT / "src" / "admin" / "AdminApp.tsx").read_text(encoding="utf-8")
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        page = (ROOT / "src" / "admin" / "pages" / "AuditLogsPage.tsx").read_text(encoding="utf-8")

        self.assertIn("auditLogs", app)
        self.assertIn("AuditLogsPage", app)
        self.assertIn("auditLogs", layout)
        self.assertIn("审计日志", layout)
        self.assertIn("adminRequest", page)
        self.assertIn("/audit-logs", page)
        for text in ["操作类型", "目标类型", "目标 ID", "元数据"]:
            self.assertIn(text, page)

    def test_ontology_page_exposes_graph_visualization_workbench(self):
        ontology = (ROOT / "src" / "admin" / "pages" / "OntologyPage.tsx").read_text(encoding="utf-8")
        details_panel = (ROOT / "src" / "admin" / "components" / "GraphDetailsPanel.tsx").read_text(encoding="utf-8")

        self.assertIn("GraphCanvas", ontology)
        self.assertIn("GraphDetailsPanel", ontology)
        self.assertIn("/graph/concepts/${encodeURIComponent(target)}/paths", ontology)
        self.assertIn("/graph/knowledge/", ontology)
        self.assertIn("/graph/rules/", ontology)
        self.assertIn("/graph/templates/", ontology)
        self.assertIn("/graph/reports/", ontology)
        self.assertIn("节点搜索", ontology)
        self.assertIn("节点类型", ontology)
        self.assertIn("关系类型", ontology)
        self.assertIn("展开范围", ontology)
        self.assertIn("一跳关系", ontology)
        self.assertIn("focusSelectedGraphNode", ontology)
        self.assertIn("以选中节点展开一跳", details_panel)
        self.assertIn("以选中节点展开两跳", details_panel)
        self.assertIn("onFocusNode", details_panel)

        self.assertTrue((ROOT / "src" / "admin" / "components" / "GraphCanvas.tsx").exists())
        self.assertTrue((ROOT / "src" / "admin" / "components" / "GraphDetailsPanel.tsx").exists())

    def test_graph_visualization_supports_deep_links_from_work_pages(self):
        admin_app = (ROOT / "src" / "admin" / "AdminApp.tsx").read_text(encoding="utf-8")
        ontology = (ROOT / "src" / "admin" / "pages" / "OntologyPage.tsx").read_text(encoding="utf-8")
        work_pages = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "src" / "admin" / "pages" / "KnowledgePage.tsx",
                ROOT / "src" / "admin" / "pages" / "RulesPage.tsx",
                ROOT / "src" / "admin" / "pages" / "TemplatesPage.tsx",
                ROOT / "src" / "admin" / "pages" / "ReportRunsPage.tsx",
            ]
        )

        self.assertIn("URLSearchParams", admin_app)
        self.assertIn("view=ontology", work_pages)
        for mode in ["mode=knowledge", "mode=rule", "mode=template", "mode=report"]:
            self.assertIn(mode, work_pages)
        self.assertIn("查看图谱", work_pages)
        self.assertIn("window.location.search", ontology)
        self.assertIn("mode", ontology)
        self.assertIn("target", ontology)
        self.assertIn("depth", ontology)
        self.assertIn("/graph/concepts/${encodeURIComponent(target)}/paths", ontology)


if __name__ == "__main__":
    unittest.main()
