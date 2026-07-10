import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "configure-wechat-pay-merchant.py"


def load_script_module():
    spec = importlib.util.spec_from_file_location("configure_wechat_pay_merchant", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class WechatPayConfigScriptTests(unittest.TestCase):
    def test_loads_private_key_from_only_cert_zip_in_directory(self):
        module = load_script_module()
        private_key = "\n".join([
            "-----BEGIN PRIVATE KEY-----",
            "mock-private-key",
            "-----END PRIVATE KEY-----",
        ])

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            with zipfile.ZipFile(temp_path / "wechatpay-cert.zip", "w") as archive:
                archive.writestr("apiclient_cert.pem", "mock cert")
                archive.writestr("apiclient_key.pem", private_key)

            material = module.load_private_key_material(str(temp_path))

        self.assertEqual(private_key, material.content)
        self.assertTrue(material.source.endswith("wechatpay-cert.zip!apiclient_key.pem"))

    def test_console_text_replaces_characters_not_supported_by_terminal_encoding(self):
        module = load_script_module()

        self.assertEqual("ok ?", module.console_text("ok \u2713", encoding="gbk"))

    def test_remote_verify_script_is_written_under_project_root(self):
        module = load_script_module()

        self.assertEqual(
            "/var/www/destiny/verify-wechat-pay-config-20260707-123400.mjs",
            module.remote_verify_path("20260707-123400"),
        )

    def test_wechat_pay_env_updates_include_miniprogram_app_id(self):
        module = load_script_module()

        updates = module.wechat_pay_env_updates(
            mch_id="mch",
            api_v3_key="key",
            cert_serial="serial",
        )

        self.assertEqual("wxc4ed7c07ce86326c", updates["WECHAT_MINIPROGRAM_APP_ID"])

    def test_derives_mch_id_from_wechat_cert_zip_name(self):
        module = load_script_module()

        self.assertEqual(
            "1382373302",
            module.derive_mch_id_from_path(r"E:\certs\1382373302_20260707_cert.zip"),
        )

    def test_loads_certificate_serial_from_cert_zip(self):
        module = load_script_module()
        serial_number = 0x36A19ADF
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, "test merchant"),
        ])
        certificate = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(serial_number)
            .not_valid_before(datetime.now(timezone.utc) - timedelta(days=1))
            .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1))
            .sign(key, hashes.SHA256())
        )
        private_key = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            zip_path = temp_path / "1382373302_20260707_cert.zip"
            with zipfile.ZipFile(zip_path, "w") as archive:
                archive.writestr("apiclient_cert.pem", certificate.public_bytes(serialization.Encoding.PEM))
                archive.writestr("apiclient_key.pem", private_key)

            self.assertEqual("36A19ADF", module.load_certificate_serial_from_path(str(temp_path)))


if __name__ == "__main__":
    unittest.main()
