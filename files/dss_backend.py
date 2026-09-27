"""
Integrated Decision Support System - BACKEND MODULE
==================================================================
This is the backend that a frontend (Streamlit, Flask, etc.) imports
and calls. It contains only the ML prediction logic, zero UI code.

Usage in a frontend:
    from dss_backend import decision_support
    result = decision_support(n=90, p=40, k=40, ph=6.5,
                              temperature=26, humidity=80, rainfall=200)
    # result is a dict with keys: recommended_crop, soil_fertility,
    #                              nutrient_levels, recommended_fertilizer

PREREQUISITE: dss_bundle.pkl must exist in the same folder.
              Run dss_train.py once to create it.
"""

import os
import joblib
import pandas as pd
import numpy as np

BUNDLE_PATH = "dss_bundle.pkl"

# Load the trained models once at import time
if not os.path.exists(BUNDLE_PATH):
    raise FileNotFoundError(
        f"'{BUNDLE_PATH}' not found. Run 'python dss_train.py' first to "
        "train the models and create this file."
    )

_bundle = joblib.load(BUNDLE_PATH)
_crop_model = _bundle["crop_model"]
_fert_model = _bundle["fert_model"]
_soil_type_le = _bundle["soil_type_le"]
_crop_type_le = _bundle["crop_type_le"]
_fert_name_le = _bundle["fert_name_le"]
_crop_features = _bundle["crop_features"]
_fert_feature_cols = _bundle["fert_feature_cols"]
_default_soil_type = _bundle["default_soil_type"]
_default_crop_type = _bundle["default_crop_type"]


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def rate_nutrient(value, low_max, med_max):
    """Classify a nutrient level as Low, Medium, or High."""
    if value < low_max:
        return "Low"
    elif value < med_max:
        return "Medium"
    else:
        return "High"


def ph_category(ph):
    """Classify soil pH as Acidic, Neutral, or Alkaline."""
    if ph < 6.5:
        return "Acidic"
    elif ph <= 7.5:
        return "Neutral"
    else:
        return "Alkaline"


def rule_based_fertility(n, p, k, ph):
    """
    Evaluate soil fertility using standard agronomic thresholds.
    
    Args:
        n (float): Nitrogen level (kg/ha)
        p (float): Phosphorous level (kg/ha)
        k (float): Potassium level (kg/ha)
        ph (float): Soil pH
    
    Returns:
        dict with keys: N_level, P_level, K_level, pH_level, Fertility_rule
    """
    n_r = rate_nutrient(n, 280, 560)
    p_r = rate_nutrient(p, 10, 24.6)
    k_r = rate_nutrient(k, 108, 280)
    
    score = {"Low": 0, "Medium": 1, "High": 2}
    avg = np.mean([score[n_r], score[p_r], score[k_r]])
    
    if avg < 0.67:
        overall = "Low"
    elif avg < 1.34:
        overall = "Medium"
    else:
        overall = "High"
    
    return {
        "N_level": n_r,
        "P_level": p_r,
        "K_level": k_r,
        "pH_level": ph_category(ph),
        "Fertility_rule": overall
    }


# ============================================================================
# MAIN DECISION SUPPORT FUNCTION (what frontends call)
# ============================================================================

def decision_support(n, p, k, ph, temperature, humidity, rainfall,
                      soil_type=None, crop_type=None):
    """
    Generate crop, soil fertility, and fertilizer recommendations.
    
    Args:
        n (float): Nitrogen (kg/ha)
        p (float): Phosphorous (kg/ha)
        k (float): Potassium (kg/ha)
        ph (float): Soil pH (0-14)
        temperature (float): Temperature in Celsius
        humidity (float): Humidity in percentage (0-100)
        rainfall (float): Rainfall in mm
        soil_type (str, optional): Soil type. If None, uses default.
        crop_type (str, optional): Crop type. If None, uses default.
    
    Returns:
        dict with keys:
            - recommended_crop (str): Best crop for these conditions
            - soil_fertility (str): Soil fertility rating (Low/Medium/High)
            - nutrient_levels (dict): Individual N/P/K/pH classifications
            - recommended_fertilizer (str): Recommended fertilizer name
    
    Raises:
        ValueError: if soil_type or crop_type is not recognized
    """
    
    # 1. CROP RECOMMENDATION
    crop_input = pd.DataFrame(
        [[n, p, k, temperature, humidity, ph, rainfall]],
        columns=_crop_features
    )
    recommended_crop = _crop_model.predict(crop_input)[0]
    
    # 2. SOIL FERTILITY ASSESSMENT
    fertility_info = rule_based_fertility(n, p, k, ph)
    
    # 3. FERTILIZER RECOMMENDATION
    soil_type = soil_type or _default_soil_type
    
    # Ensure the predicted crop is known to the fertilizer model before using it
    if not crop_type:
        predicted = recommended_crop.capitalize()
        # Fall back to default if the predicted crop is not in the fertilizer dataset
        if predicted in _crop_type_le.classes_:
            crop_type = predicted
        else:
            crop_type = _default_crop_type
            
    try:
        soil_type_encoded = _soil_type_le.transform([soil_type])[0]
        crop_type_encoded = _crop_type_le.transform([crop_type])[0]
    except ValueError as e:
        raise ValueError(
            f"Unrecognized soil_type or crop_type. "
            f"Valid soil types: {list(_soil_type_le.classes_)}, "
            f"Valid crop types: {list(_crop_type_le.classes_)}"
        ) from e
    
    fert_input = pd.DataFrame([{
        "Temparature": temperature,
        "Humidity": humidity,
        "Moisture": 40,  # placeholder if not measured
        "Soil Type": soil_type_encoded,
        "Crop Type": crop_type_encoded,
        "Nitrogen": n,
        "Potassium": k,
        "Phosphorous": p
    }])[_fert_feature_cols]
    
    fert_pred_encoded = _fert_model.predict(fert_input)[0]
    recommended_fertilizer = _fert_name_le.inverse_transform([fert_pred_encoded])[0]
    
    # 4. RETURN COMBINED RECOMMENDATION
    return {
        "recommended_crop": recommended_crop,
        "soil_fertility": fertility_info["Fertility_rule"],
        "nutrient_levels": {
            "N": fertility_info["N_level"],
            "P": fertility_info["P_level"],
            "K": fertility_info["K_level"],
            "pH": fertility_info["pH_level"]
        },
        "recommended_fertilizer": recommended_fertilizer
    }


# ============================================================================
# HELPER: Get available options (useful for frontend dropdowns)
# ============================================================================

def get_available_options():
    """
    Return valid soil types, crop types, and fertilizer names.
    Use this in a frontend to populate dropdown menus.
    
    Returns:
        dict with keys: soil_types, crop_types, fertilizers
    """
    return {
        "soil_types": list(_soil_type_le.classes_),
        "crop_types": list(_crop_type_le.classes_),
        "fertilizers": list(_fert_name_le.classes_),
    }
