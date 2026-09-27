"""
Simple test/example showing how to use dss_backend.py
Run this AFTER dss_train.py has created dss_bundle.pkl
"""

from dss_backend import decision_support, get_available_options
import json

print("=" * 70)
print("BACKEND TEST - Decision Support System")
print("=" * 70)

# Show available options (useful info for frontend dev)
options = get_available_options()
print("\nAvailable options for frontends:")
print(f"  Soil types: {options['soil_types']}")
print(f"  Crop types: {options['crop_types']}")
print(f"  Fertilizers: {options['fertilizers']}")

# Test 1: Simple call with just required parameters
print("\n" + "-" * 70)
print("TEST 1: Basic prediction with default soil/crop types")
print("-" * 70)
result = decision_support(n=90, p=40, k=40, ph=6.5,
                          temperature=26, humidity=80, rainfall=200)
print(json.dumps(result, indent=2))

# Test 2: With explicit soil/crop types
print("\n" + "-" * 70)
print("TEST 2: Prediction with explicit soil and crop types")
print("-" * 70)
result = decision_support(n=50, p=20, k=30, ph=5.8,
                          temperature=28, humidity=75, rainfall=150,
                          soil_type="Black", crop_type="Cotton")
print(json.dumps(result, indent=2))

# Test 3: Low fertility scenario
print("\n" + "-" * 70)
print("TEST 3: Low fertility soil")
print("-" * 70)
result = decision_support(n=10, p=5, k=10, ph=4.5,
                          temperature=25, humidity=60, rainfall=100,
                          soil_type="Sandy")
print(json.dumps(result, indent=2))

print("\n" + "=" * 70)
print("All tests completed successfully!")
print("=" * 70)
