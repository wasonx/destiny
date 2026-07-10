import getpass
import json
import os
import posixpath
import sys
import time

import paramiko


HOST = "170.106.113.176"
USER = "root"
REMOTE_ROOT = "/var/www/destiny"
PM2_PROCESS = "destiny-api"

FILES = [
    "server/app.mjs",
    "server/config.mjs",
    "server/commerce/order-service.mjs",
    "server/commerce/payment-providers/wechat-jsapi-provider.mjs",
    "server/routes/commerce-routes.mjs",
    "server/routes/settings-routes.mjs",
    "server/tests/commerce.test.mjs",
    "server/tests/settings-routes.test.mjs",
    "server/tests/wechat-pay-provider.test.mjs",
    "docs/deployment/zhensuan-online-runbook.md",
    "docs/deployment/zhensuan-online-verification.md",
    "docs/miniprogram-release.md",
]


def repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def run(ssh, command, *, check=True):
    print(f"$ {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    if check and code != 0:
        raise RuntimeError(f"command failed with exit {code}: {command}")
    return code, out, err


def sftp_mkdirs(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    current = ""
    for part in parts:
        current = f"{current}/{part}" if current else f"/{part}"
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def upload_file(sftp, local_root, rel_path):
    local_path = os.path.join(local_root, *rel_path.split("/"))
    if not os.path.exists(local_path):
        raise FileNotFoundError(local_path)
    remote_path = posixpath.join(REMOTE_ROOT, rel_path)
    sftp_mkdirs(sftp, posixpath.dirname(remote_path))
    print(f"upload {rel_path}")
    sftp.put(local_path, remote_path)


def main():
    result = {
        "ok": False,
        "host": HOST,
        "remoteRoot": REMOTE_ROOT,
        "backupDir": None,
        "error": None,
    }
    password = getpass.getpass(f"Password for {USER}@{HOST}: ")
    if not password:
        print("empty password, aborting", file=sys.stderr)
        result["error"] = "empty password"
        write_result(result)
        return 2

    local_root = repo_root()
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    backup_dir = f"/root/destiny-wechat-pay-backup-{timestamp}"
    result["backupDir"] = backup_dir

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        HOST,
        username=USER,
        password=password,
        timeout=15,
        look_for_keys=False,
        allow_agent=False,
    )
    try:
        run(ssh, f"test -d {REMOTE_ROOT}")
        run(ssh, f"mkdir -p {backup_dir}")
        for rel_path in FILES:
            remote_path = posixpath.join(REMOTE_ROOT, rel_path)
            backup_path = posixpath.join(backup_dir, rel_path)
            run(
                ssh,
                f"if [ -e '{remote_path}' ]; then mkdir -p '{posixpath.dirname(backup_path)}' && cp -a '{remote_path}' '{backup_path}'; fi",
            )

        sftp = ssh.open_sftp()
        try:
            for rel_path in FILES:
                upload_file(sftp, local_root, rel_path)
        finally:
            sftp.close()

        run(ssh, f"cd {REMOTE_ROOT} && npm run test:server")
        run(ssh, f"cd {REMOTE_ROOT} && npm run build")
        run(ssh, f"pm2 restart {PM2_PROCESS}")
        run(ssh, "pm2 save", check=False)
        run(ssh, "curl -fsS https://www.goye.cc/destiny-api/health")
        run(
            ssh,
            "curl -fsS -H 'Authorization: Bearer invalid' https://www.goye.cc/destiny-api/admin/settings/integrations >/dev/null || true",
            check=False,
        )
        print(f"backup_dir={backup_dir}")
        result["ok"] = True
        write_result(result)
        return 0
    except Exception as error:
        result["error"] = str(error)
        write_result(result)
        raise
    finally:
        ssh.close()


def write_result(result):
    path = os.path.join(repo_root(), "deployment-wechat-pay-result.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    raise SystemExit(main())
