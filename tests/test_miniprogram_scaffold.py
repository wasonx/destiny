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
                "pages/report/index",
            ],
        )
        self.assertEqual(app_json["window"]["navigationBarTitleText"], "甄算")

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
