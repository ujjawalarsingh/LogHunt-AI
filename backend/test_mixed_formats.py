import requests
import json

url = 'http://localhost:8000/upload'

def run_test(name, content):
    print(f"\n--- Running Test: {name} ---")
    filename = f'sample_logs/test_{name}.log'
    with open(filename, 'w') as f:
        f.write(content)
        
    files = {'file': open(filename, 'rb')}
    r = requests.post(url, files=files)
    res = r.json()
    print('Upload result:', res)
    return res

# 1. MIXED FILE
mixed_content = """192.168.1.100 - - [10/Aug/2026:14:22:03 +0000] "GET /index.html HTTP/1.1" 200 512
Aug 10 14:22:05 server sshd[1234]: Failed password for admin from 192.168.1.50 port 22 ssh2
{"timestamp":"2026-08-10T14:22:10Z","source_ip":"192.168.1.60","event_type":"login","message":"User login failed"}
Aug 10 14:22:15 server sshd: Accepted password for user from 192.168.1.70 port 22
192.168.1.100 - - [10/Aug/2026:14:22:20 +0000] "GET /search?q=1%27%20OR%201=1 HTTP/1.1" 200 512
192.168.1.50 - - [10/Aug/2026:14:22:31 +0000] "POST /login HTTP/1.1" 401 512
192.168.1.50 - - [10/Aug/2026:14:22:32 +0000] "POST /login HTTP/1.1" 401 512
192.168.1.50 - - [10/Aug/2026:14:22:33 +0000] "POST /login HTTP/1.1" 401 512
192.168.1.50 - - [10/Aug/2026:14:22:34 +0000] "POST /login HTTP/1.1" 401 512
192.168.1.50 - - [10/Aug/2026:14:22:35 +0000] "POST /login HTTP/1.1" 401 512
This is an unparseable malformed line that should fail
"""

res = run_test('mixed', mixed_content)
pid = res.get('project_id')

if pid:
    # Query the logs to verify formats
    logs_r = requests.get(f'http://localhost:8000/logs?limit=500')
    logs_data = logs_r.json()
    project_logs = [l for l in logs_data.get('items', []) if l['project_id'] == pid]

    formats = {}
    failed_logs = 0
    for l in project_logs:
        fmt = l.get('source_format', 'unknown')
        formats[fmt] = formats.get(fmt, 0) + 1
        
        # Same failed_lines logic as ingestion_service
        if l.get('timestamp') is None and l.get('source_ip') is None and l.get('destination_ip') is None and l.get('hostname') is None and l.get('username') is None and l.get('event_type') is None and l.get('severity') is None and l.get('message') is None:
            failed_logs += 1

    print("\nLog Formats Saved in DB:")
    for fmt, count in formats.items():
        print(f"  {fmt}: {count}")
    print(f"Failed Logs Saved (expected 1): {failed_logs}")

    # Query alerts
    alerts_r = requests.get(f'http://localhost:8000/alerts')
    project_log_ids = [l['id'] for l in project_logs]
    project_alerts = [a for a in alerts_r.json().get('items', []) if a['log_id'] in project_log_ids]

    print(f"\nAlerts generated for Mixed File: {len(project_alerts)}")
    for a in project_alerts:
        print(f"  [{a['alert_type']}] ({a['severity']}) - {a['description']}")

    # Duplication Test
    print("\n--- Duplication Test (Same Project) ---")
    files = {'file': open('sample_logs/test_mixed.log', 'rb')}
    r2 = requests.post(url, files=files, data={'project_id': pid})
    print('Upload result:', r2.json())

    # Query alerts again to check deduplication
    alerts_r2 = requests.get(f'http://localhost:8000/alerts')
    logs_r2 = requests.get(f'http://localhost:8000/logs?limit=500')
    project_logs2 = [l for l in logs_r2.json().get('items', []) if l['project_id'] == pid]
    project_log_ids2 = [l['id'] for l in project_logs2]
    project_alerts2 = [a for a in alerts_r2.json().get('items', []) if a['log_id'] in project_log_ids2]

    print(f"\nTotal Alerts for project {pid} after duplicate upload: {len(project_alerts2)} (Should be 3 or 4 depending on SQL sorting of identical timestamps)")
    assert len(project_alerts2) in [3, 4], "Duplicate upload alert count mismatch"

# Run regression tests for the other formats (syslog, json, apache, malformed, empty)
run_test('regression_apache', '192.168.1.100 - - [10/Aug/2026:14:22:03 +0000] "GET /index.html HTTP/1.1" 200 512\n')
run_test('regression_syslog', 'Aug 10 14:22:05 server sshd[1234]: Failed password for admin from 192.168.1.50 port 22 ssh2\n')
run_test('regression_json', '{"timestamp":"2026-08-10T14:22:10Z","source_ip":"192.168.1.60","event_type":"login","message":"User login failed"}\n')
run_test('regression_auth', 'Aug 10 14:22:15 server sshd: Accepted password for user from 192.168.1.70 port 22\n')
run_test('regression_malformed', 'Garbage text that matches no format at all\n')
run_test('regression_empty', '')
