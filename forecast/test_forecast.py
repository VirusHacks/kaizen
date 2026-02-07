#!/usr/bin/env python3
"""Quick test script for the forecast service"""

import requests
import json

# Test health endpoint
print("Testing health endpoint...")
try:
    response = requests.get("http://localhost:4000/health")
    print(f"Health check: {response.status_code} - {response.json()}")
except Exception as e:
    print(f"Health check failed: {e}")

# Test forecast endpoint
print("\nTesting forecast endpoint...")
test_data = {
    "monthlyData": [
        {"month": "2024-01", "revenue": 10000, "aov": 50, "orders": 200},
        {"month": "2024-02", "revenue": 12000, "aov": 55, "orders": 220},
        {"month": "2024-03", "revenue": 11000, "aov": 52, "orders": 210},
        {"month": "2024-04", "revenue": 13000, "aov": 58, "orders": 225},
    ],
    "periods": 3,
    "type": "revenue"
}

try:
    response = requests.post(
        "http://localhost:4000/forecast",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Forecast status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Historical points: {len(result.get('historical', []))}")
        print(f"Forecast points: {len(result.get('forecast', []))}")
        print(f"Metrics: {result.get('metrics', {})}")
        print("\n✅ Forecast service is working!")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Forecast test failed: {e}")

