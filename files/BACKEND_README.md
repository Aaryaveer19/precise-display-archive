# Integrated Decision Support System - BACKEND

This is the ML backend for a soil-crop-fertilizer recommendation system. 
It's ready to be integrated with any frontend (Streamlit, Flask, React, etc.).

---

## 📦 Files Included

| File | Purpose |
|------|---------|
| `dss_train.py` | Trains all 3 ML models (run once) |
| `dss_backend.py` | Main backend module (what you import in your frontend) |
| `test_backend.py` | Example/test showing how to use the backend |

**Do NOT delete:**
- `dss_bundle.pkl` (created after running `dss_train.py`) - contains all trained models

---

## ⚙️ Setup (One-time)

### 1. Install dependencies
```bash
pip install pandas numpy scikit-learn joblib
```

### 2. Place data files in the same folder
Before running training, you need three CSV files:
- `crop_recommendation.csv` — From Kaggle: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
- `fertilizer_prediction.csv` — From Kaggle: https://www.kaggle.com/datasets/gdabhishek/fertilizer-prediction
- `soil_health.csv` — Your own soil test data with columns: `N, P, K, pH`

If you skip this, training will use synthetic demo data (OK for testing, but accuracy will be low).

### 3. Train the models
```bash
python dss_train.py
```

This will print CV accuracy, confusion matrices, domain spot-checks, and Apriori rules. 
At the end, it saves `dss_bundle.pkl` (contains all trained models — **keep this file**).

---

## 🚀 Using the Backend in Your Frontend

**The only function you need to call:**

```python
from dss_backend import decision_support

result = decision_support(
    n=90,              # Nitrogen (kg/ha)
    p=40,              # Phosphorous (kg/ha)
    k=40,              # Potassium (kg/ha)
    ph=6.5,            # Soil pH
    temperature=26,    # Celsius
    humidity=80,       # Percentage
    rainfall=200,      # mm
    soil_type=None,    # Optional: "Black", "Sandy", "Loamy", "Red", "Clayey"
    crop_type=None     # Optional: "Cotton", "Maize", "Paddy", etc.
)

print(result)
# Output:
# {
#   "recommended_crop": "chickpea",
#   "soil_fertility": "Low",
#   "nutrient_levels": {
#       "N": "Low",
#       "P": "High",
#       "K": "Low",
#       "pH": "Neutral"
#   },
#   "recommended_fertilizer": "20-20"
# }
```

---

## 📋 Function Reference

### `decision_support(n, p, k, ph, temperature, humidity, rainfall, soil_type=None, crop_type=None)`

**Required Parameters:**
- `n` (float): Nitrogen level in kg/ha
- `p` (float): Phosphorous level in kg/ha
- `k` (float): Potassium level in kg/ha
- `ph` (float): Soil pH (0–14)
- `temperature` (float): Temperature in °C
- `humidity` (float): Humidity in % (0–100)
- `rainfall` (float): Rainfall in mm

**Optional Parameters:**
- `soil_type` (str): One of `["Black", "Clayey", "Loamy", "Red", "Sandy"]`. 
  If None, uses most common soil type from training data.
- `crop_type` (str): One of `["Cotton", "Maize", "Paddy", "Sugarcane", "Tobacco", "Wheat"]`. 
  If None, uses most common crop type from training data.

**Returns:**
A dict with:
- `recommended_crop` (str): Best crop for these conditions
- `soil_fertility` (str): Rating — "Low", "Medium", or "High"
- `nutrient_levels` (dict): Individual classifications for N, P, K, pH
- `recommended_fertilizer` (str): Fertilizer name (e.g., "Urea", "DAP", "MOP", "14-35-14")

**Raises:**
- `FileNotFoundError`: if `dss_bundle.pkl` doesn't exist (run `dss_train.py` first)
- `ValueError`: if soil_type or crop_type is not recognized

---

### `get_available_options()`

Useful for populating dropdown menus in your UI.

```python
from dss_backend import get_available_options

opts = get_available_options()
# Returns:
# {
#   "soil_types": ["Black", "Clayey", "Loamy", "Red", "Sandy"],
#   "crop_types": ["Cotton", "Maize", "Paddy", "Sugarcane", "Tobacco", "Wheat"],
#   "fertilizers": ["14-35-14", "17-17-17", "20-20", "28-28", "DAP", "MOP", "Urea"]
# }
```

---

## 🧪 Testing

Run the included test to verify everything works:

```bash
python test_backend.py
```

This will run 3 example predictions and print results as JSON. If all 3 pass, your backend is ready to integrate.

---

## 🔗 Integrating with Your Frontend

### Streamlit Example
```python
import streamlit as st
from dss_backend import decision_support

n = st.number_input("Nitrogen (N)", value=90.0)
p = st.number_input("Phosphorous (P)", value=40.0)
k = st.number_input("Potassium (K)", value=40.0)
ph = st.number_input("Soil pH", value=6.5)
temperature = st.number_input("Temperature (°C)", value=26.0)
humidity = st.number_input("Humidity (%)", value=80.0)
rainfall = st.number_input("Rainfall (mm)", value=200.0)

if st.button("Get Recommendation"):
    result = decision_support(n, p, k, ph, temperature, humidity, rainfall)
    st.write(result)
```

### Flask Example
```python
from flask import Flask, request, jsonify
from dss_backend import decision_support

app = Flask(__name__)

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    result = decision_support(
        n=data['n'], p=data['p'], k=data['k'], ph=data['ph'],
        temperature=data['temperature'], humidity=data['humidity'],
        rainfall=data['rainfall']
    )
    return jsonify(result)
```

### React/Node Example
```javascript
const dss = require('child_process').execSync;
const result = JSON.parse(
  dss('python -c "from dss_backend import decision_support; import json; print(json.dumps(decision_support(...)))"')
);
```

Or use a Flask/FastAPI wrapper (easier).

---

## 🎯 What the Backend Does

1. **Crop Recommendation** (RandomForest): Predicts best crop given soil + climate
2. **Soil Fertility Assessment** (Rule-based): Classifies N, P, K, pH as Low/Medium/High
3. **Fertilizer Recommendation** (RandomForest): Suggests fertilizer based on soil + crop + nutrients

All three models were trained with:
- ✅ 5-fold cross-validation (proves stability)
- ✅ Out-of-fold confusion matrices (proves accuracy)
- ✅ Domain spot-checks (proves agronomic sense)
- ✅ Apriori association rules (reveals real patterns)

---

## ❓ FAQ

**Q: Can I use this without running `dss_train.py`?**  
A: No. You must have `dss_bundle.pkl` in the same folder. It contains all trained models.

**Q: What if I want to retrain with new data?**  
A: Delete `dss_bundle.pkl` and run `dss_train.py` again with new CSVs.

**Q: What if soil_type or crop_type is not in the dropdown?**  
A: The system falls back to the most common value from training. To add new types, retrain.

**Q: Why are fertilizer recommendations sometimes unexpected?**  
A: With synthetic training data, patterns are weak. Use real Kaggle CSVs for better results.

**Q: Can I modify the code?**  
A: Yes, but leave `dss_backend.py`'s public functions unchanged so your frontend doesn't break.

---

## 📞 Support

If errors occur:
1. Check that `dss_bundle.pkl` exists
2. Run `test_backend.py` to verify backend works
3. Check that all CSV filenames match exactly: `crop_recommendation.csv`, `fertilizer_prediction.csv`, `soil_health.csv`

---

**Ready for frontend integration!** 🚀
