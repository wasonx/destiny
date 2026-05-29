import urllib.request
import urllib.error
import json
import sys

def test_url(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            content = response.read().decode("utf-8")
            return True, status, content
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode("utf-8")
    except Exception as e:
        return False, 0, str(e)

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
        
    ip = "170.106.113.176"
    print(f"=== Starting Production Verification for Destiny App on {ip} ===")
    
    # 1. Test Frontend static files serving via Nginx
    frontend_url = f"http://{ip}/"
    print(f"\n[Test 1] Testing Nginx Frontend static files at {frontend_url}...")
    success, status, content = test_url(frontend_url)
    if success:
        print(f"  Result: Success (Status {status})")
        if 'id="root"' in content or "assets/index" in content:
            print("  [PASS] Nginx successfully serves React frontend static files!")
        else:
            print("  [WARN] Nginx served HTML, but React hook elements not detected.")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")
        
    # 2. Test Nginx Proxy to Backend Health Check
    health_url = f"http://{ip}/destiny-api/health"
    print(f"\n[Test 2] Testing Nginx Proxy to Backend Health Check at {health_url}...")
    success, status, content = test_url(health_url)
    if success:
        print(f"  Result: Success (Status {status})")
        print(f"  Response: {content.strip()}")
        try:
            res_json = json.loads(content)
            if res_json.get("ok") is True:
                print("  [PASS] Nginx proxy to Backend Health Check is fully working!")
                if res_json.get("hasKey") is True:
                    print("  [PASS] DeepSeek API Key detected and loaded successfully!")
                else:
                    print("  [WARN] DeepSeek API Key not detected by backend!")
            else:
                print("  [FAIL] Health check returned ok=false.")
        except Exception as e:
            print(f"  [FAIL] Failed to parse health check JSON: {e}")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")
        
    # 3. Test E2E AI Report Generation through Nginx Proxy (POST /destiny-api/generate)
    gen_url = f"http://{ip}/destiny-api/generate"
    print(f"\n[Test 3] Testing End-to-End AI Report Generation at {gen_url}...")
    test_payload = {
        "kind": "life",
        "payload": {
            "concern": "事业健康"
        }
    }
    success, status, content = test_url(gen_url, method="POST", data=test_payload)
    if success:
        print(f"  Result: Success (Status {status})")
        try:
            res_json = json.loads(content)
            report = res_json.get("report", {})
            title = report.get("title")
            source = report.get("source")
            sections = report.get("sections", [])
            
            print(f"  Generated Report Title: {title}")
            print(f"  Generation Source: {source}")
            print(f"  Number of Sections: {len(sections)}")
            
            if title and len(sections) > 0:
                print(f"  [PASS] AI E2E Report generation tested successfully! Source: {source}")
            else:
                print("  [FAIL] Generated report has invalid structure.")
        except Exception as e:
            print(f"  [FAIL] Failed to parse generated report JSON: {e}")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")
        
    print("\n=== Production Verification Completed ===")

if __name__ == "__main__":
    main()
