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
            "运行健康",
        ]:
            self.assertIn(text, combined)

    def test_admin_entry_uses_admin_path(self):
        main = (ROOT / "src" / "main.tsx").read_text(encoding="utf-8")

        self.assertIn("startsWith('/admin')", main)
        self.assertIn("AdminApp", main)

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

    def test_ontology_page_exposes_graph_visualization_workbench(self):
        ontology = (ROOT / "src" / "admin" / "pages" / "OntologyPage.tsx").read_text(encoding="utf-8")

        self.assertIn("GraphCanvas", ontology)
        self.assertIn("GraphDetailsPanel", ontology)
        self.assertIn("/graph/concepts/wood/paths", ontology)
        self.assertIn("/graph/knowledge/", ontology)
        self.assertIn("/graph/rules/", ontology)
        self.assertIn("/graph/templates/", ontology)
        self.assertIn("/graph/reports/", ontology)
        self.assertIn("节点搜索", ontology)
        self.assertIn("节点类型", ontology)
        self.assertIn("关系类型", ontology)
        self.assertIn("展开范围", ontology)
        self.assertIn("一跳关系", ontology)

        self.assertTrue((ROOT / "src" / "admin" / "components" / "GraphCanvas.tsx").exists())
        self.assertTrue((ROOT / "src" / "admin" / "components" / "GraphDetailsPanel.tsx").exists())


if __name__ == "__main__":
    unittest.main()
