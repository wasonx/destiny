from dataclasses import dataclass
import getpass
import json
import os
import re
import sys
import time
import zipfile

import paramiko


HOST = "170.106.113.176"
USER = "root"
REMOTE_ENV = "/etc/zhensuan/knowledge.env"
REMOTE_CERT_DIR = "/root/certs/wechatpay"
REMOTE_PRIVATE_KEY = f"{REMOTE_CERT_DIR}/apiclient_key.pem"
REMOTE_ROOT = "/var/www/destiny"
PM2_PROCESS = "destiny-api"
MINIPROGRAM_APP_ID = "wxc4ed7c07ce86326c"


def repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def result_path():
    return os.path.join(repo_root(), "configure-wechat-pay-result.json")


def remote_verify_path(timestamp):
    return f"{REMOTE_ROOT}/verify-wechat-pay-config-{timestamp}.mjs"


def write_result(result):
    with open(result_path(), "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)


def console_text(value, encoding=None):
    target_encoding = encoding or getattr(sys.stdout, "encoding", None) or "utf-8"
    return value.encode(target_encoding, errors="replace").decode(target_encoding, errors="replace")


def print_console(value):
    print(console_text(value))


def run(ssh, command, *, check=True, quiet=False):
    if not quiet:
        print(f"$ {command}")
    _stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip() and not quiet:
        print_console(out.rstrip())
    if err.strip() and not quiet:
        print_console(err.rstrip())
    if check and code != 0:
        raise RuntimeError(f"command failed with exit {code}: {command}")
    return code, out, err


def prompt_nonempty(label):
    value = input(f"{label}: ").strip()
    if not value:
        raise ValueError(f"{label} cannot be empty")
    return value


def first_existing_env(*names):
    for name in names:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


@dataclass(frozen=True)
class PrivateKeyMaterial:
    content: str
    source: str


def validate_private_key_material(content, source):
    if "BEGIN" not in content or "PRIVATE KEY" not in content:
        raise ValueError(f"{source} does not look like a private key file")
    return PrivateKeyMaterial(content=content, source=source)


def read_private_key_file(path):
    with open(path, "r", encoding="utf-8", errors="replace") as handle:
        return validate_private_key_material(handle.read(), path)


def read_private_key_zip(path):
    materials = []
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            normalized_name = info.filename.replace("\\", "/")
            if normalized_name.rsplit("/", 1)[-1] != "apiclient_key.pem":
                continue
            content = archive.read(info).decode("utf-8", errors="replace")
            materials.append(validate_private_key_material(content, f"{path}!{normalized_name}"))
    return materials


def find_cert_zip_paths(path):
    if not path or not os.path.exists(path):
        return []
    if os.path.isfile(path):
        return [path] if path.lower().endswith(".zip") else []

    matches = []
    for root, _dirs, files in os.walk(path):
        for name in files:
            if name.lower().endswith(".zip"):
                matches.append(os.path.join(root, name))
    return matches


def single_cert_zip_path(path):
    matches = find_cert_zip_paths(path)
    if not matches:
        raise FileNotFoundError(f"cert zip not found in: {path}")
    if len(matches) > 1:
        listed = "\n".join(f"  {match}" for match in matches)
        raise ValueError(f"multiple cert zip candidates found:\n{listed}")
    return matches[0]


def derive_mch_id_from_path(path):
    zip_path = single_cert_zip_path(path) if os.path.isdir(path) else path
    match = re.match(r"^(\d+)_\d{8}_cert\.zip$", os.path.basename(zip_path))
    if not match:
        return ""
    return match.group(1)


def read_certificate_zip(path):
    serials = []
    from cryptography import x509

    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            normalized_name = info.filename.replace("\\", "/")
            if normalized_name.rsplit("/", 1)[-1] != "apiclient_cert.pem":
                continue
            cert = x509.load_pem_x509_certificate(archive.read(info))
            serials.append(format(cert.serial_number, "X"))
    return serials


def load_certificate_serial_from_path(path):
    serials = []
    for zip_path in find_cert_zip_paths(path):
        serials.extend(read_certificate_zip(zip_path))
    if not serials:
        raise FileNotFoundError(f"apiclient_cert.pem not found in: {path}")
    if len(serials) > 1:
        raise ValueError("multiple apiclient_cert.pem candidates found")
    return serials[0]


def single_private_key_material(materials, target):
    if not materials:
        raise FileNotFoundError(f"apiclient_key.pem not found in: {target}")
    if len(materials) > 1:
        sources = "\n".join(f"  {material.source}" for material in materials)
        raise ValueError(f"multiple apiclient_key.pem candidates found:\n{sources}")
    return materials[0]


def load_private_key_material(path):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    if os.path.isfile(path):
        if path.lower().endswith(".zip"):
            return single_private_key_material(read_private_key_zip(path), path)
        return read_private_key_file(path)

    materials = []
    for root, _dirs, files in os.walk(path):
        for name in files:
            candidate = os.path.join(root, name)
            if name == "apiclient_key.pem":
                materials.append(read_private_key_file(candidate))
            elif name.lower().endswith(".zip"):
                materials.extend(read_private_key_zip(candidate))
    return single_private_key_material(materials, path)


def prompt_key_material():
    path = input("Local apiclient_key.pem, cert zip, or containing folder (blank = use server copy): ").strip().strip('"').strip("'")
    if not path:
        return None
    return load_private_key_material(path)


def defaulted_nonempty(label, default_value):
    if default_value:
        print(f"{label}: auto-filled")
        return default_value
    return prompt_nonempty(label)


def defaulted_private_key_material(default_path):
    if default_path:
        material = load_private_key_material(default_path)
        print(f"Local certificate path: auto-filled ({default_path})")
        return material
    return prompt_key_material()


def parse_env(text):
    values = {}
    order = []
    for line in text.splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            order.append((line, None))
            continue
        key, value = line.split("=", 1)
        values[key] = value
        order.append((key, value))
    return values, order


def render_env(existing_text, updates):
    values, order = parse_env(existing_text)
    values.update(updates)
    rendered = []
    seen = set()
    for key, old_value in order:
        if old_value is None:
            rendered.append(key)
            continue
        if key in updates:
            rendered.append(f"{key}={values[key]}")
            seen.add(key)
        else:
            rendered.append(f"{key}={old_value}")
            seen.add(key)
    for key, value in updates.items():
        if key not in seen:
            rendered.append(f"{key}={value}")
    return "\n".join(rendered).rstrip() + "\n"


def wechat_pay_env_updates(mch_id, api_v3_key, cert_serial):
    return {
        "WECHAT_MINIPROGRAM_APP_ID": MINIPROGRAM_APP_ID,
        "WECHAT_PAY_ENABLED": "false",
        "WECHAT_PAY_MCH_ID": mch_id,
        "WECHAT_PAY_API_V3_KEY": api_v3_key,
        "WECHAT_PAY_CERT_SERIAL_NO": cert_serial,
        "WECHAT_PAY_PRIVATE_KEY_PATH": REMOTE_PRIVATE_KEY,
        "WECHAT_PAY_NOTIFY_URL": "https://www.goye.cc/destiny-api/payments/wechat/notify",
    }


def sh_quote(value):
    return "'" + value.replace("'", "'\"'\"'") + "'"


def sftp_read_text(sftp, path):
    try:
        with sftp.open(path, "r") as handle:
            return handle.read().decode("utf-8", errors="replace")
    except FileNotFoundError:
        return ""


def sftp_write_text(sftp, path, text):
    with sftp.open(path, "w") as handle:
        handle.write(text.encode("utf-8"))


def collect_inputs(result):
    print("Configure WeChat Pay merchant credentials.")
    print("Hidden inputs are not written to shell history.")
    cert_path = first_existing_env("WECHAT_PAY_CERT_PATH", "ZHENSUAN_WECHAT_CERT_PATH")
    mch_id = defaulted_nonempty(
        "WeChat Pay MCH_ID",
        first_existing_env("WECHAT_PAY_MCH_ID") or (derive_mch_id_from_path(cert_path) if cert_path else ""),
    )
    cert_serial = defaulted_nonempty(
        "Merchant API certificate serial number",
        first_existing_env("WECHAT_PAY_CERT_SERIAL_NO") or (load_certificate_serial_from_path(cert_path) if cert_path else ""),
    )
    private_key_material = defaulted_private_key_material(cert_path)
    server_password = first_existing_env("ZHENSUAN_SERVER_PASSWORD")
    if not server_password:
        server_password = getpass.getpass(f"Server password for {USER}@{HOST}: ")
    api_v3_key = first_existing_env("WECHAT_PAY_API_V3_KEY")
    if not api_v3_key:
        api_v3_key = getpass.getpass("API v3 key (32 bytes, hidden): ").strip()
    if len(api_v3_key.encode("utf-8")) != 32:
        raise ValueError("API v3 key must be exactly 32 bytes")
    result["privateKeySource"] = private_key_material.source if private_key_material else "server-existing"
    return server_password, mch_id, cert_serial, api_v3_key, private_key_material


def main():
    result = {
        "ok": False,
        "host": HOST,
        "envPath": REMOTE_ENV,
        "privateKeyPath": REMOTE_PRIVATE_KEY,
        "privateKeySource": None,
        "backupEnvPath": None,
        "backupPrivateKeyPath": None,
        "configState": None,
        "error": None,
    }
    ssh = None

    try:
        server_password, mch_id, cert_serial, api_v3_key, private_key_material = collect_inputs(result)

        timestamp = time.strftime("%Y%m%d-%H%M%S")
        env_backup = f"/root/knowledge.env.backup-{timestamp}"
        key_backup = f"{REMOTE_PRIVATE_KEY}.backup-{timestamp}"
        result["backupEnvPath"] = env_backup
        result["backupPrivateKeyPath"] = key_backup

        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            HOST,
            username=USER,
            password=server_password,
            timeout=15,
            look_for_keys=False,
            allow_agent=False,
        )

        sftp = ssh.open_sftp()
        try:
            run(ssh, "mkdir -p /etc/zhensuan /root/certs/wechatpay")
            run(ssh, f"chmod 700 {sh_quote(REMOTE_CERT_DIR)}")
            run(ssh, f"if [ -f {sh_quote(REMOTE_ENV)} ]; then cp -a {sh_quote(REMOTE_ENV)} {sh_quote(env_backup)}; fi")
            if private_key_material:
                run(ssh, f"if [ -f {sh_quote(REMOTE_PRIVATE_KEY)} ]; then cp -a {sh_quote(REMOTE_PRIVATE_KEY)} {sh_quote(key_backup)}; fi")
                print(f"upload apiclient_key.pem from {private_key_material.source} -> {REMOTE_PRIVATE_KEY}")
                sftp_write_text(sftp, REMOTE_PRIVATE_KEY, private_key_material.content)
                run(ssh, f"chmod 600 {sh_quote(REMOTE_PRIVATE_KEY)}")
            else:
                code, _out, _err = run(ssh, f"test -f {sh_quote(REMOTE_PRIVATE_KEY)}", check=False, quiet=True)
                if code != 0:
                    raise FileNotFoundError(f"server private key not found: {REMOTE_PRIVATE_KEY}")

            current_env = sftp_read_text(sftp, REMOTE_ENV)
            next_env = render_env(current_env, wechat_pay_env_updates(mch_id, api_v3_key, cert_serial))
            temp_env = f"/root/knowledge.env.wechat-pay-{timestamp}.tmp"
            sftp_write_text(sftp, temp_env, next_env)
            run(ssh, f"install -m 600 {sh_quote(temp_env)} {sh_quote(REMOTE_ENV)} && rm -f {sh_quote(temp_env)}")
        finally:
            sftp.close()

        run(ssh, f"cd {sh_quote(REMOTE_ROOT)} && npm run test:server")
        run(ssh, f"pm2 restart {sh_quote(PM2_PROCESS)}")
        run(ssh, "pm2 save", check=False)
        run(ssh, "curl -fsS https://www.goye.cc/destiny-api/health")

        verify_script = """
import dotenv from 'dotenv';
import { loadConfig } from './server/config.mjs';
import { getWechatPayConfigState } from './server/commerce/payment-providers/wechat-jsapi-provider.mjs';
dotenv.config({ path: '/etc/zhensuan/knowledge.env', override: true, quiet: true });
const state = getWechatPayConfigState(loadConfig());
console.log(JSON.stringify(state));
"""
        remote_verify = remote_verify_path(timestamp)
        sftp = ssh.open_sftp()
        try:
            sftp_write_text(sftp, remote_verify, verify_script)
        finally:
            sftp.close()
        _code, out, _err = run(ssh, f"cd {sh_quote(REMOTE_ROOT)} && node {sh_quote(remote_verify)}")
        run(ssh, f"rm -f {sh_quote(remote_verify)}", check=False)
        match = re.search(r"\{.*\}", out, re.S)
        if match:
            result["configState"] = json.loads(match.group(0))
        result["ok"] = True
        write_result(result)
        print("Configuration complete. WECHAT_PAY_ENABLED=false, so real payment is still disabled.")
        return 0
    except Exception as error:
        result["error"] = str(error)
        write_result(result)
        raise
    finally:
        if ssh is not None:
            ssh.close()


if __name__ == "__main__":
    raise SystemExit(main())
