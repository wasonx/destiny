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


if __name__ == "__main__":
    unittest.main()
