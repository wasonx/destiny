from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]

USER_FACING_FILES = [
    ROOT / "index.html",
    ROOT / "metadata.json",
    ROOT / "src" / "App.tsx",
    ROOT / "src" / "components" / "Layout.tsx",
    ROOT / "src" / "components" / "Home.tsx",
    ROOT / "src" / "components" / "InputForm.tsx",
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class BrandingTests(unittest.TestCase):
    def test_old_branding_is_not_user_facing(self):
        combined = "\n".join(read(path) for path in USER_FACING_FILES)

        for old_phrase in [
            "元启东方",
            "Digital Zen",
            "AI东方人生与空间咨询",
        ]:
            self.assertNotIn(old_phrase, combined)

    def test_zhensuan_branding_is_present_in_key_surfaces(self):
        for path in [
            ROOT / "index.html",
            ROOT / "metadata.json",
            ROOT / "src" / "App.tsx",
            ROOT / "src" / "components" / "Layout.tsx",
            ROOT / "src" / "components" / "Home.tsx",
        ]:
            self.assertIn("甄好算", read(path))


if __name__ == "__main__":
    unittest.main()
