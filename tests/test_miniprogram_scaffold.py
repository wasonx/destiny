import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MINI = ROOT / "miniprogram"
PACKAGE_JSON = ROOT / "package.json"
VALIDATOR = ROOT / "scripts" / "validate-miniprogram.mjs"


class MiniprogramScaffoldTests(unittest.TestCase):
    def test_required_miniprogram_files_exist(self):
        required_files = [
            MINI / "app.js",
            MINI / "app.json",
            MINI / "app.wxss",
            MINI / "project.config.json",
            MINI / "utils" / "api.js",
            MINI / "utils" / "fallback.js",
        ]

        for path in required_files:
            self.assertTrue(path.exists(), f"missing {path.relative_to(ROOT)}")

    def test_app_declares_expected_pages(self):
        app_json = json.loads((MINI / "app.json").read_text(encoding="utf-8"))

        self.assertEqual(
            app_json["pages"],
            [
                "pages/home/index",
                "pages/login/index",
                "pages/life/index",
                "pages/relationship/index",
                "pages/question/index",
                "pages/space/index",
                "pages/compass/index",
                "pages/store/index",
                "pages/address/index",
                "pages/orders/index",
                "pages/report/index",
                "pages/legal/index",
            ],
        )
        self.assertEqual(app_json["window"]["navigationBarTitleText"], "甄算")

    def test_native_commerce_pages_and_api_helpers_exist(self):
        app_json = json.loads((MINI / "app.json").read_text(encoding="utf-8"))
        api_js = (MINI / "utils" / "api.js").read_text(encoding="utf-8")
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in MINI.rglob("*")
            if path.is_file() and path.suffix in {".js", ".json", ".wxml", ".wxss"}
        )

        for page in ["pages/store/index", "pages/address/index", "pages/orders/index"]:
            self.assertIn(page, app_json["pages"])
            for suffix in ["js", "wxml", "wxss", "json"]:
                self.assertTrue((MINI / f"{page}.{suffix}").exists())

        for helper in [
            "listProducts",
            "listAddresses",
            "createAddress",
            "createOrder",
            "listOrders",
            "createRefundRequest",
            "fetchValueState",
            "listReportRuns",
            "getReportRun",
        ]:
            self.assertIn(helper, api_js)

        for text in ["商城", "收货地址", "订单", "申请退款", "/customer/orders"]:
            self.assertIn(text, combined)

    def test_native_login_page_supports_wechat_and_mock_phone_otp(self):
        app_json = json.loads((MINI / "app.json").read_text(encoding="utf-8"))
        auth_js = (MINI / "utils" / "auth.js").read_text(encoding="utf-8")
        login_js = (MINI / "pages" / "login" / "index.js").read_text(encoding="utf-8")
        login_wxml = (MINI / "pages" / "login" / "index.wxml").read_text(encoding="utf-8")

        self.assertIn("pages/login/index", app_json["pages"])
        for suffix in ["js", "wxml", "wxss", "json"]:
            self.assertTrue((MINI / f"pages/login/index.{suffix}").exists())

        self.assertIn("loginWithWechatCode", auth_js)
        self.assertIn("sendPhoneOtp", auth_js)
        self.assertIn("verifyPhoneOtp", auth_js)
        self.assertIn("/customer/otp/send", auth_js)
        self.assertIn("/customer/otp/verify", auth_js)
        self.assertIn("loginWithWechatCode", login_js)
        self.assertIn("sendPhoneOtp", login_js)
        self.assertIn("verifyPhoneOtp", login_js)
        self.assertIn("微信登录", login_wxml)
        self.assertIn("手机验证码登录", login_wxml)

    def test_native_report_page_loads_customer_report_history(self):
        api_js = (MINI / "utils" / "api.js").read_text(encoding="utf-8")
        report_js = (MINI / "pages" / "report" / "index.js").read_text(encoding="utf-8")
        report_wxml = (MINI / "pages" / "report" / "index.wxml").read_text(encoding="utf-8")

        self.assertIn("/customer/report-runs", api_js)
        self.assertIn("listReportRuns", api_js)
        self.assertIn("getReportRun", api_js)
        self.assertIn("listReportRuns", report_js)
        self.assertIn("getReportRun", report_js)
        self.assertIn("loadHistory", report_js)
        self.assertIn("openReportRun", report_js)
        self.assertIn("报告历史", report_wxml)
        self.assertIn("historyRuns", report_wxml)
        self.assertIn("report_tier", report_wxml)
        self.assertIn("final_report", report_js)
        self.assertIn("formatProvenance", report_js)
        self.assertIn("命中规则", report_wxml)
        self.assertIn("知识来源", report_wxml)
        self.assertIn("图谱路径", report_wxml)
        self.assertIn("provenanceSummary", report_wxml)

    def test_backend_api_and_branding_are_consistent(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in MINI.rglob("*")
            if path.is_file() and path.suffix in {".js", ".json", ".wxml", ".wxss"}
        )

        self.assertIn("甄算", combined)
        self.assertIn("https://www.goye.cc/destiny-api", combined)
        self.assertIn("wx.request", combined)
        self.assertNotIn("元启东方", combined)
        self.assertNotIn("Digital Zen", combined)

    def test_miniprogram_static_validator_is_wired(self):
        package_json = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            package_json["scripts"]["test:miniprogram"],
            "node scripts/validate-miniprogram.mjs",
        )
        self.assertTrue(VALIDATOR.exists(), "missing scripts/validate-miniprogram.mjs")


if __name__ == "__main__":
    unittest.main()
