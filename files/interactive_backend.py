import json
from dss_backend import decision_support

def main():
    print("=" * 60)
    print("Interactive Crop & Fertilizer Recommender")
    print("=" * 60)
    print("Please enter the following conditions (or press Enter to use default values):")
    
    try:
        n = input("Nitrogen (N) [default 90]: ")
        n = float(n) if n else 90.0

        p = input("Phosphorous (P) [default 40]: ")
        p = float(p) if p else 40.0

        k = input("Potassium (K) [default 40]: ")
        k = float(k) if k else 40.0

        ph = input("Soil pH [default 6.5]: ")
        ph = float(ph) if ph else 6.5

        temp = input("Temperature (°C) [default 26]: ")
        temp = float(temp) if temp else 26.0

        hum = input("Humidity (%) [default 80]: ")
        hum = float(hum) if hum else 80.0

        rain = input("Rainfall (mm) [default 200]: ")
        rain = float(rain) if rain else 200.0

        print("\nCalculating recommendations...\n")
        
        result = decision_support(
            n=n, p=p, k=k, ph=ph,
            temperature=temp, humidity=hum, rainfall=rain
        )
        
        print("RECOMMENDATION RESULTS:")
        print("-" * 30)
        print(f"Recommended Crop       : {result['recommended_crop'].capitalize()}")
        print(f"Soil Fertility Level   : {result['soil_fertility']}")
        print(f"Recommended Fertilizer : {result['recommended_fertilizer']}")
        print("-" * 30)

    except ValueError:
        print("Invalid input! Please enter numeric values.")

if __name__ == "__main__":
    main()
