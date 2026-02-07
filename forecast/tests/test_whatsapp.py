import requests

payload = {
    "users": ["+918850097691", "+919820386915"],
    "message": "Hello from Python test"
}

r = requests.post("http://localhost:4000/send-whatsapp", json=payload, timeout=15)
print(r.status_code)
try:
    print(r.json())
except Exception:
    print(r.text)