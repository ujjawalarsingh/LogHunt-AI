import requests

content = """192.168.1.100 - - [10/Aug/2026:14:22:01 +0000] "GET /login?user=admin'%20OR%201=1-- HTTP/1.1" 200 512
192.168.1.100 - - [10/Aug/2026:14:22:02 +0000] "GET /login?user=admin'%20OR%20'1'='1 HTTP/1.1" 200 512
192.168.1.100 - - [10/Aug/2026:14:22:03 +0000] "GET /login?user=admin'%20UNION%20SELECT%20*%20FROM%20users-- HTTP/1.1" 200 512
"""

with open('sample_logs/test_sqli_encoded.log', 'w') as f:
    f.write(content)

url = 'http://localhost:8000/upload'
files = {'file': open('sample_logs/test_sqli_encoded.log', 'rb')}
r = requests.post(url, files=files)
print('Upload:', r.json())

project_id = r.json()['project_id']
logs_r = requests.get(f'http://localhost:8000/logs?limit=500')
logs = [l for l in logs_r.json()['items'] if l['project_id'] == project_id]
for log in logs:
    print('Log', log['id'], ':', log['event_type'], log['severity'], log['message'])

alerts_r = requests.get(f'http://localhost:8000/alerts')
alerts = [a for a in alerts_r.json()['items'] if a['log_id'] in [l['id'] for l in logs]]
print('Alerts created:', len(alerts))
for a in alerts:
    print('Alert:', a['alert_type'], a['severity'], a['description'])
