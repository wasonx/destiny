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
        self.assertIn("handleUnauthorized", mini_api)
        self.assertIn("wx.removeStorageSync('customer_token')", mini_api)
        self.assertIn("登录已失效，请重新登录", mini_api)
        self.assertIn("url: '/pages/login/index'", mini_api)
        self.assertIn("skipUnauthorizedRedirect", mini_auth)

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
        self.assertIn("命中规则", history)
        self.assertIn("知识来源", history)
        self.assertIn("图谱路径", history)
        self.assertIn("selected?.provenance?.ruleHits", history)
        self.assertIn("selected?.provenance?.knowledgeSources", history)
        self.assertIn("selected?.provenance?.graphEdges", history)

    def test_h5_desktop_navigation_exposes_report_history(self):
        layout = (ROOT / "src" / "components" / "Layout.tsx").read_text(encoding="utf-8")

        self.assertIn("hidden md:flex", layout)
        self.assertIn("onTabChange('reports')", layout)
        self.assertIn("报告", layout)

    def test_customer_qr_login_frontends_are_wired(self):
        h5_auth = (ROOT / "src" / "lib" / "customerAuth.ts").read_text(encoding="utf-8")
        login_panel = (ROOT / "src" / "components" / "LoginPanel.tsx").read_text(encoding="utf-8")
        mini_auth = (MINI / "utils" / "auth.js").read_text(encoding="utf-8")
        mini_login_js = (MINI / "pages" / "login" / "index.js").read_text(encoding="utf-8")
        mini_login_wxml = (MINI / "pages" / "login" / "index.wxml").read_text(encoding="utf-8")

        for text in ["createQrLoginSession", "fetchQrLoginStatus", "/customer/qr/create", "/customer/qr/status", "customerToken"]:
            self.assertIn(text, h5_auth)
        for text in ["QRCode", "startQrLogin", "pollQrLoginStatus", "扫码登录", "qrImage"]:
            self.assertIn(text, login_panel)
        for text in ["confirmQrLogin", "/customer/qr/confirm"]:
            self.assertIn(text, mini_auth)
        self.assertIn("wx.scanCode", mini_login_js)
        self.assertIn("scanQrLogin", mini_login_js)
        self.assertIn('bindtap="scanQrLogin"', mini_login_wxml)

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
        self.assertIn("shipment", commerce)
        self.assertIn("tracking_no", center)
        self.assertIn("CustomerCenter", app_tsx)
        self.assertIn("view === 'profile'", app_tsx)

    def test_miniprogram_store_selects_address_for_physical_orders(self):
        store_js = (MINI / "pages" / "store" / "index.js").read_text(encoding="utf-8")
        store_wxml = (MINI / "pages" / "store" / "index.wxml").read_text(encoding="utf-8")
        orders_js = (MINI / "pages" / "orders" / "index.js").read_text(encoding="utf-8")

        self.assertIn("api.listAddresses", store_js)
        self.assertIn("selectedAddressId", store_js)
        self.assertIn("selectedAddress", store_js)
        self.assertIn("addressOptions", store_js)
        self.assertIn("selectAddress", store_js)
        self.assertIn("address_snapshot", store_js)
        self.assertIn("requires_shipping", store_js)
        self.assertIn("shipmentText", orders_js)
        self.assertIn("tracking_no", orders_js)
        self.assertIn("选择收货地址", store_wxml)
        self.assertIn('bindchange="selectAddress"', store_wxml)
        self.assertIn('range="{{addressOptions}}"', store_wxml)

    def test_miniprogram_generation_pages_can_request_full_reports(self):
        for page in ["life", "relationship", "question", "space"]:
            with self.subTest(page=page):
                page_js = (MINI / "pages" / page / "index.js").read_text(encoding="utf-8")
                page_wxml = (MINI / "pages" / page / "index.wxml").read_text(encoding="utf-8")

                self.assertIn("reportTier", page_js)
                self.assertIn("setReportTier", page_js)
                self.assertIn("generateInsight(kind, payload, this.data.reportTier)", page_js)
                self.assertIn("免费体验版", page_wxml)
                self.assertIn("完整版", page_wxml)
                self.assertIn('bindtap="setReportTier"', page_wxml)

    def test_h5_generation_pages_can_request_full_reports(self):
        app_tsx = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        input_form = (ROOT / "src" / "components" / "InputForm.tsx").read_text(encoding="utf-8")

        self.assertIn("reportTier", input_form)
        self.assertIn("setReportTier", input_form)
        self.assertIn("免费体验版", input_form)
        self.assertIn("完整版", input_form)
        self.assertIn("tier: payload.tier", app_tsx)

        for component in ["Relationship", "Questions", "Anju"]:
            with self.subTest(component=component):
                source = (ROOT / "src" / "components" / f"{component}.tsx").read_text(encoding="utf-8")
                self.assertIn("reportTier", source)
                self.assertIn("setReportTier", source)
                self.assertIn("免费体验版", source)
                self.assertIn("完整版", source)
                self.assertIn("tier: reportTier", source)

    def test_h5_and_miniprogram_expose_legal_documents(self):
        h5_center = (ROOT / "src" / "components" / "CustomerCenter.tsx").read_text(encoding="utf-8")
        h5_legal = ROOT / "src" / "lib" / "legal.ts"
        app_json = json.loads((MINI / "app.json").read_text(encoding="utf-8"))
        mini_api = (MINI / "utils" / "api.js").read_text(encoding="utf-8")

        self.assertTrue(h5_legal.exists(), "missing H5 legal API helper")
        legal_source = h5_legal.read_text(encoding="utf-8")
        self.assertIn("/legal", legal_source)
        self.assertIn("fetchLegalDocuments", legal_source)
        self.assertIn("用户协议", h5_center)
        self.assertIn("隐私政策", h5_center)
        self.assertIn("报告分层与风险边界说明", h5_center)
        self.assertIn("fetchLegalDocuments", h5_center)

        self.assertIn("pages/legal/index", app_json["pages"])
        for suffix in ["js", "wxml", "wxss", "json"]:
            self.assertTrue((MINI / "pages" / "legal" / f"index.{suffix}").exists())
        self.assertIn("getLegalDocuments", mini_api)
        self.assertIn("/legal", mini_api)

        mini_legal_js = (MINI / "pages" / "legal" / "index.js").read_text(encoding="utf-8")
        mini_legal_wxml = (MINI / "pages" / "legal" / "index.wxml").read_text(encoding="utf-8")
        self.assertIn("getLegalDocuments", mini_legal_js)
        self.assertIn("用户协议", mini_legal_wxml)
        self.assertIn("隐私政策", mini_legal_wxml)
        self.assertIn("报告分层与风险边界说明", mini_legal_wxml)
        self.assertIn("不提供医疗、投资、法律等确定性建议", mini_legal_wxml)


if __name__ == "__main__":
    unittest.main()
