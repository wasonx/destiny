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
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content = response.read().decode("utf-8")
            return True, status, content
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode("utf-8")
    except Exception as e:
        return False, 0, str(e)

def main():
    print("=== Automated Integration Testing for Destiny App ===")
    
    # 1. Test Backend Health Check
    backend_health_url = "http://127.0.0.1:3201/destiny-api/health"
    print(f"\n[Test 1] Testing Backend Health Check at {backend_health_url}...")
    success, status, content = test_url(backend_health_url)
    if success:
        print(f"  Result: Success (Status {status})")
        print(f"  Response: {content.strip()}")
        try:
            res_json = json.loads(content)
            if res_json.get("ok") is True:
                print("  [PASS] Health check passed!")
            else:
                print("  [FAIL] Health check failed (ok is not True)")
        except Exception as e:
            print(f"  [FAIL] Failed to parse health check JSON: {e}")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")

    # 2. Test Frontend Server Availability
    frontend_url = "http://127.0.0.1:3000/"
    print(f"\n[Test 2] Testing Frontend Server (Vite) at {frontend_url}...")
    success, status, content = test_url(frontend_url)
    if success:
        print(f"  Result: Success (Status {status})")
        # Check if the response contains typical React index.html markers
        if "id=\"root\"" in content or "main.tsx" in content:
            print("  [PASS] Frontend is up and serves React/Vite mount point correctly!")
        else:
            print("  [WARN] Warning: HTML served, but React root element not detected in index.html.")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")

    # 3. Test Backend API Report Generation (POST /generate)
    backend_gen_url = "http://127.0.0.1:3201/destiny-api/generate"
    print(f"\n[Test 3] Testing Backend Report Generation at {backend_gen_url}...")
    test_payload = {
        "kind": "life",
        "payload": {
            "concern": "事业与个人节奏"
        }
    }
    success, status, content = test_url(backend_gen_url, method="POST", data=test_payload)
    if success:
        print(f"  Result: Success (Status {status})")
        try:
            res_json = json.loads(content)
            report = res_json.get("report", {})
            title = report.get("title")
            kind = report.get("kind")
            source = report.get("source")
            sections = report.get("sections", [])
            
            print(f"  Generated Report Title: {title}")
            print(f"  Report Kind: {kind}")
            print(f"  Generation Source: {source}")
            print(f"  Number of Sections: {len(sections)}")
            
            if title and kind == "life" and len(sections) > 0:
                print("  [PASS] Report generation API validated successfully (Fallback works perfectly)!")
            else:
                print("  [FAIL] Generated report structure is invalid.")
        except Exception as e:
            print(f"  [FAIL] Failed to parse generated report JSON: {e}")
    else:
        print(f"  [FAIL] Test failed: Status {status}, Error: {content}")

    print("\n=== Test Suite Completed ===")

if __name__ == "__main__":
    main()
