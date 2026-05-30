import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MINI = ROOT / "miniprogram"


class OnlineIntegrationScaffoldTests(unittest.TestCase):
    def test_miniprogram_declares_native_compass_page(self):
        app_json = json.loads((MINI / "app.json").read_text(encoding="utf-8"))

        self.assertIn("pages/compass/index", app_json["pages"])
        for suffix in ["js", "wxml", "wxss", "json"]:
            self.assertTrue((MINI / "pages" / "compass" / f"index.{suffix}").exists())

    def test_compass_uses_wechat_native_compass_api(self):
        compass_js = (MINI / "pages" / "compass" / "index.js").read_text(encoding="utf-8")

        self.assertIn("wx.startCompass", compass_js)
        self.assertIn("wx.onCompassChange", compass_js)
        self.assertIn("wx.stopCompass", compass_js)
        self.assertIn("房屋朝向", (MINI / "pages" / "compass" / "index.wxml").read_text(encoding="utf-8"))

    def test_h5_and_miniprogram_use_customer_token(self):
        h5_auth = (ROOT / "src" / "lib" / "customerAuth.ts").read_text(encoding="utf-8")
        mini_auth = (MINI / "utils" / "auth.js").read_text(encoding="utf-8")
        mini_api = (MINI / "utils" / "api.js").read_text(encoding="utf-8")

        self.assertIn("zhensuan_customer_token", h5_auth)
        self.assertIn("customer_token", mini_auth)
        self.assertIn("Authorization", mini_api)
        self.assertIn("wx.login", mini_auth)
        self.assertIn("code: loginRes.code", mini_auth)
        self.assertNotIn("mock-code", mini_auth)
        self.assertNotIn("loginRes.code ||", mini_auth)

    def test_h5_and_miniprogram_expose_report_tiers(self):
        h5_insights = (ROOT / "src" / "lib" / "insights.ts").read_text(encoding="utf-8")
        h5_report = (ROOT / "src" / "components" / "Report.tsx").read_text(encoding="utf-8")
        mini_api = (MINI / "utils" / "api.js").read_text(encoding="utf-8")
        mini_report = (MINI / "pages" / "report" / "index.wxml").read_text(encoding="utf-8")

        self.assertIn("tier?: 'free' | 'full'", h5_insights)
        self.assertIn("upgradePrompt", h5_report)
        self.assertIn("免费体验版", h5_report)
        self.assertIn("function generateInsight(kind, payload, tier = 'free')", mini_api)
        self.assertIn("report.tier", mini_report)
        self.assertIn("report.upgradePrompt", mini_report)

    def test_h5_exposes_customer_report_history(self):
        h5_auth = (ROOT / "src" / "lib" / "customerAuth.ts").read_text(encoding="utf-8")
        app_tsx = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        history_path = ROOT / "src" / "components" / "ReportHistory.tsx"

        self.assertTrue(history_path.exists(), "missing H5 report history component")
        history = history_path.read_text(encoding="utf-8")
        self.assertIn("fetchCustomerReportRuns", h5_auth)
        self.assertIn("fetchCustomerReportRun", h5_auth)
        self.assertIn("/customer/report-runs", h5_auth)
        self.assertIn("ReportHistory", app_tsx)
        self.assertIn("报告历史", history)
        self.assertIn("report_tier", history)
        self.assertIn("final_report", history)

    def test_h5_desktop_navigation_exposes_report_history(self):
        layout = (ROOT / "src" / "components" / "Layout.tsx").read_text(encoding="utf-8")

        self.assertIn("hidden md:flex", layout)
        self.assertIn("onTabChange('reports')", layout)
        self.assertIn("报告", layout)

    def test_h5_exposes_customer_commerce_center(self):
        app_tsx = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        commerce_path = ROOT / "src" / "lib" / "customerCommerce.ts"
        center_path = ROOT / "src" / "components" / "CustomerCenter.tsx"

        self.assertTrue(commerce_path.exists(), "missing H5 customer commerce API helpers")
        self.assertTrue(center_path.exists(), "missing H5 customer center component")
        commerce = commerce_path.read_text(encoding="utf-8")
        center = center_path.read_text(encoding="utf-8")

        for helper in ["listProducts", "createOrder", "listOrders", "createRefundRequest", "listAddresses", "createAddress", "updateAddress"]:
            self.assertIn(helper, commerce)
        for endpoint in ["/customer/products", "/customer/orders", "/refund-requests", "/customer/addresses"]:
            self.assertIn(endpoint, commerce)
        for text in ["客户中心", "会员状态", "积分余额", "商城", "订单", "申请退款", "收货地址", "保存地址", "选择收货地址"]:
            self.assertIn(text, center)
        self.assertIn("selectedAddressId", center)
        self.assertIn("address_snapshot", center)
        self.assertIn("CustomerCenter", app_tsx)
        self.assertIn("view === 'profile'", app_tsx)


if __name__ == "__main__":
    unittest.main()
