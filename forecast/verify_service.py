#!/usr/bin/env python3
"""Comprehensive verification script for the forecast service"""

import requests
import json
import sys

BASE_URL = "http://localhost:4000"

def test_health():
    """Test the health endpoint"""
    print("=" * 50)
    print("1. Testing Health Endpoint")
    print("=" * 50)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: Status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BASE_URL}")
        print("   Make sure the service is running: ./start_service.sh")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_forecast_revenue():
    """Test revenue forecasting"""
    print("\n" + "=" * 50)
    print("2. Testing Revenue Forecast")
    print("=" * 50)
    
    test_data = {
        "monthlyData": [
            {"month": "2024-01", "revenue": 10000, "aov": 50, "orders": 200},
            {"month": "2024-02", "revenue": 12000, "aov": 55, "orders": 220},
            {"month": "2024-03", "revenue": 11000, "aov": 52, "orders": 210},
            {"month": "2024-04", "revenue": 13000, "aov": 58, "orders": 225},
            {"month": "2024-05", "revenue": 12500, "aov": 56, "orders": 223},
        ],
        "periods": 3,
        "type": "revenue"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/forecast",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Revenue forecast successful!")
            print(f"   Historical points: {len(result.get('historical', []))}")
            print(f"   Forecast points: {len(result.get('forecast', []))}")
            print(f"   MAPE: {result.get('metrics', {}).get('mape', 0):.2f}%")
            print(f"   MAE: ${result.get('metrics', {}).get('mae', 0):.2f}")
            print(f"   RMSE: ${result.get('metrics', {}).get('rmse', 0):.2f}")
            return True
        else:
            print(f"❌ Forecast failed: Status {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Forecast error: {e}")
        return False

def test_forecast_aov():
    """Test AOV forecasting"""
    print("\n" + "=" * 50)
    print("3. Testing AOV Forecast")
    print("=" * 50)
    
    test_data = {
        "monthlyData": [
            {"month": "2024-01", "revenue": 10000, "aov": 50, "orders": 200},
            {"month": "2024-02", "revenue": 12000, "aov": 55, "orders": 220},
            {"month": "2024-03", "revenue": 11000, "aov": 52, "orders": 210},
        ],
        "periods": 2,
        "type": "aov"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/forecast",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ AOV forecast successful!")
            print(f"   Forecast points: {len(result.get('forecast', []))}")
            return True
        else:
            print(f"❌ AOV forecast failed: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ AOV forecast error: {e}")
        return False

def test_insufficient_data():
    """Test error handling for insufficient data"""
    print("\n" + "=" * 50)
    print("4. Testing Error Handling (Insufficient Data)")
    print("=" * 50)
    
    test_data = {
        "monthlyData": [
            {"month": "2024-01", "revenue": 10000, "aov": 50, "orders": 200},
        ],
        "periods": 1,
        "type": "revenue"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/forecast",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            result = response.json()
            if "Insufficient data" in result.get("error", ""):
                print(f"✅ Error handling works correctly!")
                print(f"   Error message: {result.get('error')}")
                return True
            else:
                print(f"❌ Unexpected error message")
                return False
        else:
            print(f"❌ Expected 400 status, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "🔍 FORECAST SERVICE VERIFICATION" + "\n")
    
    results = []
    results.append(("Health Check", test_health()))
    results.append(("Revenue Forecast", test_forecast_revenue()))
    results.append(("AOV Forecast", test_forecast_aov()))
    results.append(("Error Handling", test_insufficient_data()))
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Service is running perfectly!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the service.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

