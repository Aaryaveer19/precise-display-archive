"""
Integrated Decision Support System for Soil Fertility, Crop and
Fertilizer Recommendation using Machine Learning
==================================================================
TRAINING SCRIPT (run this first, and only when your data changes)

This script trains all 3 models, evaluates them with k-fold CV +
confusion matrices + domain spot-checks, runs Apriori, and saves
everything into dss_bundle.pkl. It does NOT ask for any input and
does NOT give live recommendations -- that is dss_predict.py's job
(run this once, then run dss_predict.py as many times as you like).

Run this as a script, OR paste section by section into Jupyter/Colab
(each "# %%" marks a new cell if opened in VS Code / Spyder).

BEFORE RUNNING, place these files in the same folder as this script:
  1. crop_recommendation.csv   -> Kaggle: atharvaingle/crop-recommendation-dataset
  2. fertilizer_prediction.csv -> Kaggle: gdabhishek/fertilizer-prediction
  3. soil_health.csv           -> Soil Health Card data (data.gov.in) OR your own
                                   soil test records with columns:
                                   N, P, K, pH  (one row per sample/district)

If any of the three files is missing, the script will auto-generate a
small synthetic stand-in so you can test-run the whole pipeline first,
then swap in the real files later without changing any code.
"""

import os
import numpy as np
import pandas as pd
from itertools import combinations

from sklearn.model_selection import (
    train_test_split, StratifiedKFold, cross_val_score, cross_val_predict
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    ConfusionMatrixDisplay, silhouette_score
)

import matplotlib
matplotlib.use("Agg")  # safe for headless / script execution; remove this line in Jupyter if you want inline plots
import matplotlib.pyplot as plt

import joblib

RANDOM_STATE = 42
DATA_DIR = "."

# %% ---------------------------------------------------------------
# 0. HELPERS: synthetic fallback data (only used if real CSV missing)
# --------------------------------------------------------------------

def make_synthetic_crop_data(n=600, seed=RANDOM_STATE):
    """Mimics the Kaggle crop_recommendation.csv structure."""
    rng = np.random.default_rng(seed)
    crops = ["rice", "maize", "chickpea", "kidneybeans", "banana",
             "mango", "grapes", "cotton", "coffee", "watermelon"]
    rows = []
    for crop in crops:
        base_n = rng.uniform(10, 120)
        base_p = rng.uniform(10, 120)
        base_k = rng.uniform(10, 200)
        for _ in range(n // len(crops)):
            rows.append({
                "N": max(0, rng.normal(base_n, 10)),
                "P": max(0, rng.normal(base_p, 10)),
                "K": max(0, rng.normal(base_k, 15)),
                "temperature": rng.uniform(15, 40),
                "humidity": rng.uniform(30, 95),
                "ph": rng.uniform(4, 8.5),
                "rainfall": rng.uniform(20, 300),
                "label": crop
            })
    return pd.DataFrame(rows)


def make_synthetic_fertilizer_data(n=300, seed=RANDOM_STATE):
    """Mimics the Kaggle fertilizer_prediction.csv structure."""
    rng = np.random.default_rng(seed)
    soil_types = ["Sandy", "Loamy", "Black", "Red", "Clayey"]
    crop_types = ["Maize", "Sugarcane", "Cotton", "Tobacco", "Paddy", "Wheat"]
    fertilizers = ["Urea", "DAP", "14-35-14", "28-28", "17-17-17", "MOP", "20-20"]
    rows = []
    for _ in range(n):
        rows.append({
            "Temparature": rng.integers(25, 40),
            "Humidity": rng.integers(50, 75),
            "Moisture": rng.integers(25, 65),
            "Soil Type": rng.choice(soil_types),
            "Crop Type": rng.choice(crop_types),
            "Nitrogen": rng.integers(0, 40),
            "Potassium": rng.integers(0, 20),
            "Phosphorous": rng.integers(0, 40),
            "Fertilizer Name": rng.choice(fertilizers)
        })
    return pd.DataFrame(rows)


def make_synthetic_soil_health_data(n=500, seed=RANDOM_STATE):
    """Mimics Soil Health Card style records: N, P, K, pH per sample/district."""
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "district": [f"district_{i%40}" for i in range(n)],
        "N": rng.uniform(50, 700, n),     # kg/ha
        "P": rng.uniform(2, 50, n),       # kg/ha
        "K": rng.uniform(50, 500, n),     # kg/ha
        "pH": rng.uniform(4.5, 9.0, n)
    })


def load_or_synthesize(filename, synth_func, label):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        print(f"[OK] Loaded real file: {filename}")
        return pd.read_csv(path)
    print(f"[WARN] '{filename}' not found -> using synthetic {label} data "
          f"for demo. Replace with the real Kaggle/Soil Health CSV later.")
    return synth_func()


# %% ---------------------------------------------------------------
# 1. LOAD DATA
# --------------------------------------------------------------------

crop_df = load_or_synthesize("crop_recommendation.csv", make_synthetic_crop_data, "crop")
fert_df = load_or_synthesize("fertilizer_prediction.csv", make_synthetic_fertilizer_data, "fertilizer")
soil_df = load_or_synthesize("soil_health.csv", make_synthetic_soil_health_data, "soil health")

print("\ncrop_df shape:", crop_df.shape)
print("fert_df shape:", fert_df.shape)
print("soil_df shape:", soil_df.shape)


# %% ---------------------------------------------------------------
# 1b. HELPER: k-fold CV + confusion matrix
# --------------------------------------------------------------------
# Row count / a single train-test split tells you almost nothing about
# whether a model generalizes. Stratified k-fold CV gives a mean +-
# std accuracy across k different train/test splits, and out-of-fold
# predictions give an honest confusion matrix over the WHOLE dataset
# (every row gets predicted exactly once, by a model that never saw it
# during training).

def evaluate_with_kfold(model, X, y, label_names, model_name, k=5,
                         save_path=None):
    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=RANDOM_STATE)

    # per-fold accuracy -> mean +- std tells you how STABLE the model is,
    # not just how good one lucky/unlucky split looked
    fold_scores = cross_val_score(model, X, y, cv=skf, scoring="accuracy")
    print(f"\n=== {model_name}: {k}-FOLD CROSS-VALIDATION ===")
    print("Per-fold accuracy:", np.round(fold_scores, 3))
    print(f"Mean accuracy: {fold_scores.mean():.3f}  (+/- {fold_scores.std():.3f})")

    # out-of-fold predictions -> unbiased confusion matrix over all rows
    y_pred_oof = cross_val_predict(model, X, y, cv=skf)
    print(f"\n{model_name}: out-of-fold classification report")
    print(classification_report(y, y_pred_oof, zero_division=0))

    cm = confusion_matrix(y, y_pred_oof, labels=label_names)
    fig, ax = plt.subplots(figsize=(max(6, len(label_names) * 0.6),
                                     max(5, len(label_names) * 0.5)))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=label_names)
    disp.plot(ax=ax, xticks_rotation=90, cmap="Blues", colorbar=False)
    ax.set_title(f"{model_name} - Out-of-fold Confusion Matrix")
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"Confusion matrix saved -> {save_path}")
    plt.close(fig)

    return fold_scores, y_pred_oof


# %% ---------------------------------------------------------------
# 2. MODEL 1: CROP RECOMMENDATION
# --------------------------------------------------------------------
# Input : N, P, K, temperature, humidity, ph, rainfall
# Output: crop label

crop_features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
X_crop = crop_df[crop_features]
y_crop = crop_df["label"]
crop_labels_sorted = sorted(y_crop.unique())

crop_model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)

# k-fold CV + out-of-fold confusion matrix (the real evidence of quality)
crop_fold_scores, crop_oof_pred = evaluate_with_kfold(
    crop_model, X_crop, y_crop, crop_labels_sorted,
    model_name="Crop Recommendation", k=5,
    save_path="crop_confusion_matrix.png"
)

# final production model: refit on ALL data once CV has told us the model
# is stable (CV is for evaluation only; the deployed model should see
# every available row)
crop_model.fit(X_crop, y_crop)
joblib.dump(crop_model, "crop_model.pkl")


# ---- Domain spot-check (does the model agree with basic agronomy?) ----
# CV accuracy can look great yet still hide a model that learned spurious
# correlations. These are hand-written, textbook-level examples with an
# expected crop, independent of whatever is in the training CSV.

crop_spot_checks = [
    # N,   P,   K, temp, humidity, pH,  rainfall, expected
    (90,   40,  40, 26,   82,       6.5, 220,      "rice"),        # rice: high N, high rainfall/humidity, near-neutral pH
    (20,   130, 200, 22,  82,       5.9, 70,       "grapes"),      # grapes: very high P & K
    (100,  20,  30,  26,  60,       5.5, 160,      "coffee"),      # coffee: acidic soil, moderate rainfall
    (20,   10,  10,  30,  70,       6.5, 100,      "orange"),      # orange: low NPK, warm
    (120,  40,  20,  24,  70,       6.5, 90,       "cotton"),      # cotton: high N, moderate rainfall
]

print("\n=== CROP MODEL: DOMAIN SPOT-CHECK (agronomic sanity check) ===")
spot_rows = []
for n, p, k, t, h, ph, rf, expected in crop_spot_checks:
    row = pd.DataFrame([[n, p, k, t, h, ph, rf]], columns=crop_features)
    pred = crop_model.predict(row)[0]
    spot_rows.append({
        "N": n, "P": p, "K": k, "temp": t, "humidity": h, "pH": ph, "rainfall": rf,
        "expected": expected, "predicted": pred,
        "match": "YES" if pred == expected else "NO"
    })
spot_df = pd.DataFrame(spot_rows)
print(spot_df.to_string(index=False))
print(f"\nSpot-check agreement: {(spot_df['match'] == 'YES').mean():.0%} "
      f"({(spot_df['match'] == 'YES').sum()}/{len(spot_df)}) "
      "-- mismatches are worth discussing in your presentation, not hiding: "
      "they usually mean the training data doesn't fully cover that "
      "region of the feature space, which is a legitimate, honest limitation to state.")


# %% ---------------------------------------------------------------
# 3. MODEL 2: FERTILIZER RECOMMENDATION
# --------------------------------------------------------------------
# Input : Temparature, Humidity, Moisture, Soil Type, Crop Type, N, K, P
# Output: Fertilizer Name
# Categorical columns (Soil Type, Crop Type, Fertilizer Name) must be
# label-encoded before feeding into the model.

fert_df.columns = [c.strip() for c in fert_df.columns]  # tidy column names

soil_type_le = LabelEncoder()
crop_type_le = LabelEncoder()
fert_name_le = LabelEncoder()

fert_encoded = fert_df.copy()
fert_encoded["Soil Type"] = soil_type_le.fit_transform(fert_encoded["Soil Type"])
fert_encoded["Crop Type"] = crop_type_le.fit_transform(fert_encoded["Crop Type"])
fert_encoded["Fertilizer Name"] = fert_name_le.fit_transform(fert_encoded["Fertilizer Name"])

fert_feature_cols = [c for c in fert_encoded.columns if c != "Fertilizer Name"]
X_fert = fert_encoded[fert_feature_cols]
y_fert = fert_encoded["Fertilizer Name"]
fert_label_ids_sorted = sorted(y_fert.unique())
fert_label_names_sorted = fert_name_le.inverse_transform(fert_label_ids_sorted)

fert_model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)

fert_fold_scores, fert_oof_pred = evaluate_with_kfold(
    fert_model, X_fert, y_fert, fert_label_ids_sorted,
    model_name="Fertilizer Recommendation", k=5,
    save_path="fertilizer_confusion_matrix.png"
)
# (confusion matrix plot uses numeric label ids as ticks; swap
#  display_labels=fert_label_names_sorted inside evaluate_with_kfold's
#  ConfusionMatrixDisplay call if you want readable fertilizer names instead)

fert_model.fit(X_fert, y_fert)
joblib.dump(fert_model, "fertilizer_model.pkl")
joblib.dump({"soil_type": soil_type_le, "crop_type": crop_type_le,
             "fertilizer_name": fert_name_le}, "fertilizer_encoders.pkl")


# ---- Domain spot-check for fertilizer model ----
# e.g. very low N with everything else adequate should push towards a
# high-N fertilizer like Urea; very low P/K should push towards DAP/MOP.
# Replace these example Soil Type / Crop Type strings with values that
# actually exist in YOUR fertilizer_prediction.csv before presenting.

available_soil_types = list(fert_df["Soil Type"].unique())
available_crop_types = list(fert_df["Crop Type"].unique())
print(f"\n(Soil types in data: {available_soil_types})")
print(f"(Crop types in data: {available_crop_types})")

fert_spot_checks = [
    # temp, humidity, moisture, soil_type,              crop_type,               N,  K,  P,  note
    (30, 60, 40, available_soil_types[0], available_crop_types[0], 5,  40, 40, "N very deficient -> expect high-N fertilizer (e.g. Urea)"),
    (30, 60, 40, available_soil_types[0], available_crop_types[0], 40, 5,  40, "K very deficient -> expect K-rich fertilizer (e.g. MOP)"),
    (30, 60, 40, available_soil_types[0], available_crop_types[0], 40, 40, 5,  "P very deficient -> expect P-rich fertilizer (e.g. DAP)"),
]

print("\n=== FERTILIZER MODEL: DOMAIN SPOT-CHECK ===")
for temp, hum, moist, soil_t, crop_t, n, k, p, note in fert_spot_checks:
    row = pd.DataFrame([{
        "Temparature": temp, "Humidity": hum, "Moisture": moist,
        "Soil Type": soil_type_le.transform([soil_t])[0],
        "Crop Type": crop_type_le.transform([crop_t])[0],
        "Nitrogen": n, "Potassium": k, "Phosphorous": p
    }])[fert_feature_cols]
    pred_id = fert_model.predict(row)[0]
    pred_name = fert_name_le.inverse_transform([pred_id])[0]
    print(f"N={n},K={k},P={p} | {note}\n  -> predicted: {pred_name}\n")

print("These spot-checks are a sanity filter, not proof: if the model "
      "contradicts basic agronomy here, that's a real red flag worth "
      "fixing (more data, feature engineering) before trusting the "
      "cross-validation number.")


# %% ---------------------------------------------------------------
# 4. MODEL 3: SOIL FERTILITY CLASSIFIER
# --------------------------------------------------------------------
# 4a. Rule-based bins (standard Soil Health Card style thresholds, kg/ha)

def rate_nutrient(value, low_max, med_max):
    if value < low_max:
        return "Low"
    elif value < med_max:
        return "Medium"
    else:
        return "High"

def ph_category(ph):
    if ph < 6.5:
        return "Acidic"
    elif ph <= 7.5:
        return "Neutral"
    else:
        return "Alkaline"

def rule_based_fertility(row):
    n_r = rate_nutrient(row["N"], 280, 560)
    p_r = rate_nutrient(row["P"], 10, 24.6)
    k_r = rate_nutrient(row["K"], 108, 280)
    score = {"Low": 0, "Medium": 1, "High": 2}
    avg = np.mean([score[n_r], score[p_r], score[k_r]])
    if avg < 0.67:
        overall = "Low"
    elif avg < 1.34:
        overall = "Medium"
    else:
        overall = "High"
    return pd.Series({
        "N_level": n_r, "P_level": p_r, "K_level": k_r,
        "pH_level": ph_category(row["pH"]),
        "Fertility_rule": overall
    })

soil_df = pd.concat([soil_df, soil_df.apply(rule_based_fertility, axis=1)], axis=1)

# 4b. K-Means clustering (unsupervised cross-check against the rule-based labels)

fertility_features = ["N", "P", "K", "pH"]
scaler = StandardScaler()
X_soil_scaled = scaler.fit_transform(soil_df[fertility_features])

kmeans = KMeans(n_clusters=3, random_state=RANDOM_STATE, n_init=10)
soil_df["cluster"] = kmeans.fit_predict(X_soil_scaled)

# Map clusters to Low/Medium/High by their mean N+P+K (higher nutrients = higher fertility)
cluster_order = (
    soil_df.groupby("cluster")[["N", "P", "K"]].mean().sum(axis=1).sort_values().index
)
cluster_to_label = {cluster_order[0]: "Low", cluster_order[1]: "Medium", cluster_order[2]: "High"}
soil_df["Fertility_kmeans"] = soil_df["cluster"].map(cluster_to_label)

print("\n=== SOIL FERTILITY CLASSIFIER ===")
print(soil_df[["N", "P", "K", "pH", "Fertility_rule", "Fertility_kmeans"]].head(10))
print("\nRule-based vs KMeans agreement:",
      (soil_df["Fertility_rule"] == soil_df["Fertility_kmeans"]).mean())

# Silhouette score: KMeans' own equivalent of "how do you know it's good"
# since there's no ground-truth label to score accuracy against.
# Range -1..1; >0.5 = reasonably well-separated clusters, <0.25 = weak/overlapping.
sil_score = silhouette_score(X_soil_scaled, soil_df["cluster"])
print(f"KMeans silhouette score: {sil_score:.3f} "
      "(>0.5 good separation, ~0.25-0.5 weak/overlapping, <0.25 poor)")

joblib.dump({"scaler": scaler, "kmeans": kmeans, "cluster_to_label": cluster_to_label},
            "soil_fertility_model.pkl")


# %% ---------------------------------------------------------------
# 5. ASSOCIATION RULE MINING: APRIORI ALGORITHM
# --------------------------------------------------------------------
# Goal: discover patterns like
#   {N_level=Low, pH_level=Acidic} -> {Fertility_rule=Low}
# Apriori needs transactions of discrete "items", so every soil sample
# is turned into a small basket of categorical items first.

def build_transactions(df, cols):
    transactions = []
    for _, row in df.iterrows():
        transactions.append([f"{c}={row[c]}" for c in cols])
    return transactions

soil_cols = ["N_level", "P_level", "K_level", "pH_level", "Fertility_rule"]
soil_transactions = build_transactions(soil_df, soil_cols)


# ---- a compact, dependency-free Apriori implementation ----

def apriori_frequent_itemsets(transactions, min_support=0.15):
    """Returns dict {frozenset(itemset): support}."""
    n = len(transactions)
    tx_sets = [set(t) for t in transactions]

    # 1-itemsets
    items = sorted(set(item for t in tx_sets for item in t))
    itemsets = {frozenset([i]): 0 for i in items}
    for t in tx_sets:
        for i in t:
            itemsets[frozenset([i])] += 1

    def support(iset):
        return sum(1 for t in tx_sets if iset.issubset(t)) / n

    current = {k: v / n for k, v in itemsets.items() if v / n >= min_support}
    all_frequent = dict(current)
    k = 2
    while current:
        candidates = set()
        current_items = list(current.keys())
        for a, b in combinations(current_items, 2):
            union = a | b
            if len(union) == k:
                candidates.add(union)
        next_level = {}
        for cand in candidates:
            s = support(cand)
            if s >= min_support:
                next_level[cand] = s
        all_frequent.update(next_level)
        current = next_level
        k += 1
    return all_frequent


def generate_rules(frequent_itemsets, min_confidence=0.6, min_lift=1.0):
    rules = []
    for itemset, sup in frequent_itemsets.items():
        if len(itemset) < 2:
            continue
        items = list(itemset)
        for r in range(1, len(items)):
            for antecedent in combinations(items, r):
                antecedent = frozenset(antecedent)
                consequent = itemset - antecedent
                if antecedent not in frequent_itemsets:
                    continue
                conf = sup / frequent_itemsets[antecedent]
                cons_support = frequent_itemsets.get(consequent, None)
                if cons_support is None or cons_support == 0:
                    continue
                lift = conf / cons_support
                if conf >= min_confidence and lift >= min_lift:
                    rules.append({
                        "antecedent": set(antecedent),
                        "consequent": set(consequent),
                        "support": round(sup, 3),
                        "confidence": round(conf, 3),
                        "lift": round(lift, 3)
                    })
    return sorted(rules, key=lambda r: r["lift"], reverse=True)


def run_apriori(transactions, name, min_support=0.10, min_confidence=0.6,
                 min_lift=1.0, top_n=10, save_path=None):
    frequent_itemsets = apriori_frequent_itemsets(transactions, min_support=min_support)
    rules = generate_rules(frequent_itemsets, min_confidence=min_confidence, min_lift=min_lift)
    print(f"\n=== APRIORI: {name} ===")
    print(f"{len(transactions)} transactions, {len(frequent_itemsets)} frequent itemsets "
          f"(min_support={min_support}), {len(rules)} rules "
          f"(min_confidence={min_confidence}, min_lift={min_lift})")
    if not rules:
        print("No rules found at these thresholds -- try lowering min_support/min_confidence.")
    for r in rules[:top_n]:
        print(f"  {r['antecedent']}  =>  {r['consequent']}   "
              f"(support={r['support']}, confidence={r['confidence']}, lift={r['lift']})")
    rules_df = pd.DataFrame(rules)
    if save_path:
        rules_df.to_csv(save_path, index=False)
        print(f"Full rule list saved -> {save_path}")
    return rules_df


# 5a. Soil fertility patterns: which nutrient/pH combos predict fertility level
soil_rules_df = run_apriori(
    soil_transactions, name="Soil Fertility Patterns",
    min_support=0.10, min_confidence=0.6, min_lift=1.0,
    save_path="association_rules_soil_fertility.csv"
)

# 5b. Fertilizer usage patterns: which soil/crop/nutrient combos predict
#     which fertilizer gets used -- directly useful for the recommendation
#     narrative ("farms with X soil + Y deficiency tend to need Z fertilizer")
fert_for_apriori = fert_df.copy()
fert_for_apriori["N_level"] = pd.qcut(fert_for_apriori["Nitrogen"], 3,
                                       labels=["Low", "Medium", "High"], duplicates="drop")
fert_for_apriori["P_level"] = pd.qcut(fert_for_apriori["Phosphorous"], 3,
                                       labels=["Low", "Medium", "High"], duplicates="drop")
fert_for_apriori["K_level"] = pd.qcut(fert_for_apriori["Potassium"], 3,
                                       labels=["Low", "Medium", "High"], duplicates="drop")

fert_cols = ["Soil Type", "Crop Type", "N_level", "P_level", "K_level", "Fertilizer Name"]
fert_transactions = build_transactions(fert_for_apriori, fert_cols)

fert_rules_df = run_apriori(
    fert_transactions, name="Fertilizer Usage Patterns",
    min_support=0.08, min_confidence=0.5, min_lift=1.0,
    save_path="association_rules_fertilizer.csv"
)


# %% ---------------------------------------------------------------
# 7. SAVE A SINGLE "BUNDLE" FOR THE PREDICT/APP SCRIPT
# --------------------------------------------------------------------
# dss_predict.py (a separate file) loads ONLY this bundle -- it never
# needs the original CSVs again, and never re-runs training. This is
# what your frontend (Streamlit / Flask) should import from too.

bundle = {
    "crop_model": crop_model,
    "fert_model": fert_model,
    "soil_type_le": soil_type_le,
    "crop_type_le": crop_type_le,
    "fert_name_le": fert_name_le,
    "crop_features": crop_features,
    "fert_feature_cols": fert_feature_cols,
    "default_soil_type": fert_df["Soil Type"].mode()[0],
    "default_crop_type": fert_df["Crop Type"].mode()[0],
}
joblib.dump(bundle, "dss_bundle.pkl")
print("\n[DONE] Training complete. Saved dss_bundle.pkl for dss_predict.py to use.")
print("Run:  python dss_predict.py   to get an interactive prompt.")
