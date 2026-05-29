import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MINI = ROOT / "miniprogram"


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
                "pages/life/index",
                "pages/relationship/index",
                "pages/question/index",
                "pages/space/index",
                "pages/compass/index",
                "pages/store/index",
                "pages/address/index",
                "pages/orders/index",
                "pages/report/index",
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
        ]:
            self.assertIn(helper, api_js)

        for text in ["商城", "收货地址", "订单", "申请退款", "/customer/orders"]:
            self.assertIn(text, combined)

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


if __name__ == "__main__":
    unittest.main()
