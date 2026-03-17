import json
import sys
from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / 'crop_recommendation_model.pkl'

REQUIRED_FIELDS = [
    'nitrogen',
    'phosphorus',
    'potassium',
    'temperature',
    'humidity',
    'ph',
    'rainfall',
]

# Valid input ranges for each parameter (inclusive)
INPUT_RANGES = {
    'nitrogen':    (0, 140,    'kg/ha'),
    'phosphorus':  (5, 145,    'kg/ha'),
    'potassium':   (5, 205,    'kg/ha'),
    'temperature': (8.0, 44.0, '°C'),
    'humidity':    (14.0, 100.0, '%'),
    'ph':          (3.5, 10.0,  ''),
    'rainfall':    (20.0, 300.0, 'mm'),
}

# Per-crop known preference profiles used to build natural-language explanations
CROP_PROFILES = {
    'rice':         {'temp': (20, 35), 'humidity': (70, 100), 'ph': (5.5, 7.0), 'rainfall': (150, 300),  'n': 'high',   'p': 'medium', 'k': 'medium'},
    'maize':        {'temp': (18, 35), 'humidity': (50, 80),  'ph': (5.5, 7.5), 'rainfall': (50, 200),   'n': 'high',   'p': 'medium', 'k': 'medium'},
    'chickpea':     {'temp': (10, 30), 'humidity': (15, 65),  'ph': (6.0, 8.0), 'rainfall': (30, 120),   'n': 'low',    'p': 'medium', 'k': 'medium'},
    'kidneybeans':  {'temp': (15, 30), 'humidity': (50, 80),  'ph': (5.5, 7.5), 'rainfall': (100, 200),  'n': 'low',    'p': 'medium', 'k': 'medium'},
    'pigeonpeas':   {'temp': (18, 38), 'humidity': (40, 70),  'ph': (5.0, 7.5), 'rainfall': (60, 200),   'n': 'low',    'p': 'medium', 'k': 'low'},
    'mothbeans':    {'temp': (24, 42), 'humidity': (25, 55),  'ph': (6.0, 8.0), 'rainfall': (30, 100),   'n': 'low',    'p': 'low',    'k': 'low'},
    'mungbean':     {'temp': (20, 38), 'humidity': (45, 75),  'ph': (6.2, 7.5), 'rainfall': (50, 150),   'n': 'low',    'p': 'medium', 'k': 'medium'},
    'blackgram':    {'temp': (22, 40), 'humidity': (45, 80),  'ph': (6.0, 7.5), 'rainfall': (50, 160),   'n': 'low',    'p': 'medium', 'k': 'medium'},
    'lentil':       {'temp': (10, 28), 'humidity': (18, 70),  'ph': (6.0, 8.5), 'rainfall': (25, 120),   'n': 'low',    'p': 'medium', 'k': 'medium'},
    'pomegranate':  {'temp': (18, 38), 'humidity': (25, 70),  'ph': (5.5, 7.5), 'rainfall': (40, 150),   'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'banana':       {'temp': (20, 35), 'humidity': (70, 90),  'ph': (5.5, 7.0), 'rainfall': (100, 250),  'n': 'high',   'p': 'high',   'k': 'high'},
    'mango':        {'temp': (24, 42), 'humidity': (40, 75),  'ph': (5.5, 7.5), 'rainfall': (40, 200),   'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'grapes':       {'temp': (15, 38), 'humidity': (55, 80),  'ph': (5.5, 7.0), 'rainfall': (50, 200),   'n': 'medium', 'p': 'medium', 'k': 'high'},
    'watermelon':   {'temp': (22, 40), 'humidity': (60, 85),  'ph': (5.5, 7.0), 'rainfall': (40, 120),   'n': 'high',   'p': 'medium', 'k': 'high'},
    'muskmelon':    {'temp': (25, 42), 'humidity': (60, 80),  'ph': (6.0, 7.0), 'rainfall': (20, 90),    'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'apple':        {'temp': (7, 24),  'humidity': (50, 85),  'ph': (5.5, 6.8), 'rainfall': (100, 250),  'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'orange':       {'temp': (12, 35), 'humidity': (45, 80),  'ph': (6.0, 7.5), 'rainfall': (75, 200),   'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'papaya':       {'temp': (22, 40), 'humidity': (60, 85),  'ph': (6.0, 7.0), 'rainfall': (75, 250),   'n': 'high',   'p': 'medium', 'k': 'medium'},
    'coconut':      {'temp': (20, 38), 'humidity': (60, 90),  'ph': (5.0, 8.0), 'rainfall': (100, 300),  'n': 'medium', 'p': 'medium', 'k': 'high'},
    'cotton':       {'temp': (22, 40), 'humidity': (50, 80),  'ph': (5.8, 8.0), 'rainfall': (60, 200),   'n': 'medium', 'p': 'medium', 'k': 'medium'},
    'jute':         {'temp': (24, 40), 'humidity': (70, 90),  'ph': (6.0, 7.5), 'rainfall': (150, 250),  'n': 'high',   'p': 'medium', 'k': 'medium'},
    'coffee':       {'temp': (15, 28), 'humidity': (65, 90),  'ph': (5.5, 6.5), 'rainfall': (100, 250),  'n': 'medium', 'p': 'medium', 'k': 'medium'},
}


def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f'Model file not found at {MODEL_PATH}. '
            'Run training script: python backend/training/train_optimized_final.py'
        )
    bundle = joblib.load(MODEL_PATH)
    for key in ('model', 'feature_order', 'scaler', 'label_encoder'):
        if key not in bundle:
            raise ValueError(f'Invalid model bundle: missing key "{key}"')
    return bundle


def _validate_and_parse(payload: dict) -> dict:
    """Validate presence and range of required fields."""
    parsed = {}
    for field in REQUIRED_FIELDS:
        if field not in payload:
            raise ValueError(f'Missing required field: {field}')
        try:
            value = float(payload[field])
        except (TypeError, ValueError):
            raise ValueError(f'Field "{field}" must be a number')
        if not pd.notna(value):
            raise ValueError(f'Invalid numeric value for {field}')

        lo, hi, unit = INPUT_RANGES[field]
        if not (lo <= value <= hi):
            label = field.capitalize()
            raise ValueError(
                f'{label} value {value} is out of valid range [{lo}\u2013{hi}{(" " + unit) if unit else ""}].'
            )
        parsed[field] = value
    return parsed


def _build_explanation(crop_key: str, p: dict) -> str:
    """Return a natural-language explanation for why this crop was recommended."""
    profile = CROP_PROFILES.get(crop_key)
    if not profile:
        return f'{crop_key.title()} suits the provided soil and climate conditions.'

    reasons = []

    # Temperature
    t_lo, t_hi = profile['temp']
    if t_lo <= p['temperature'] <= t_hi:
        reasons.append(f'temperature of {p["temperature"]:.1f}°C is in the ideal range for {crop_key.title()}')
    elif p['temperature'] < t_lo:
        reasons.append(f'relatively cool temperature ({p["temperature"]:.1f}°C) suits {crop_key.title()}')
    else:
        reasons.append(f'warm temperature ({p["temperature"]:.1f}°C) is suitable for {crop_key.title()}')

    # Rainfall
    r_lo, r_hi = profile['rainfall']
    if r_lo <= p['rainfall'] <= r_hi:
        reasons.append(f'rainfall of {p["rainfall"]:.1f} mm matches its water requirements')
    elif p['rainfall'] > r_hi:
        reasons.append(f'high rainfall ({p["rainfall"]:.1f} mm) supports its growth')
    else:
        reasons.append(f'low rainfall ({p["rainfall"]:.1f} mm) is manageable for this crop')

    # pH
    ph_lo, ph_hi = profile['ph']
    if ph_lo <= p['ph'] <= ph_hi:
        reasons.append(f'soil pH of {p["ph"]:.1f} is within its preferred range')
    else:
        reasons.append(f'soil pH of {p["ph"]:.1f} is acceptable')

    # Humidity
    h_lo, h_hi = profile['humidity']
    if h_lo <= p['humidity'] <= h_hi:
        reasons.append(f'humidity of {p["humidity"]:.1f}% supports healthy growth')

    # NPK narrative
    npk_notes = []
    n_lvl = profile['n']
    if n_lvl == 'high' and p['nitrogen'] >= 80:
        npk_notes.append('adequate Nitrogen')
    elif n_lvl == 'low' and p['nitrogen'] <= 40:
        npk_notes.append('low Nitrogen, as preferred')
    elif n_lvl == 'medium' and 40 <= p['nitrogen'] <= 80:
        npk_notes.append('moderate Nitrogen')

    if p['phosphorus'] >= 20:
        npk_notes.append('sufficient Phosphorus')
    if p['potassium'] >= 20:
        npk_notes.append('adequate Potassium')

    if npk_notes:
        reasons.append('soil has ' + ' and '.join(npk_notes))

    return (
        f'{crop_key.title()} is recommended because the '
        + ', '.join(reasons[:4])
        + '.'
    )


def main() -> None:
    if len(sys.argv) < 2:
        raise ValueError('Missing input payload')

    payload = json.loads(sys.argv[1])
    p = _validate_and_parse(payload)

    bundle = _load_model()
    model = bundle['model']
    feature_order = bundle['feature_order']
    scaler = bundle['scaler']
    label_encoder = bundle['label_encoder']

    input_df = pd.DataFrame([p])[feature_order]
    input_scaled = scaler.transform(input_df)
    input_scaled_df = pd.DataFrame(input_scaled, columns=feature_order)

    probabilities = model.predict_proba(input_scaled_df)[0]
    classes = label_encoder.classes_

    # Top 3 predictions sorted by descending probability
    top_indices = probabilities.argsort()[-3:][::-1]
    top_predictions = [
        {
            'crop': str(classes[idx]).title(),
            'confidence': round(float(probabilities[idx]), 4),
        }
        for idx in top_indices
    ]

    best_idx = int(top_indices[0])
    best_crop_key = str(classes[best_idx]).lower()
    explanation = _build_explanation(best_crop_key, p)

    output = {
        'recommended_crop': top_predictions[0]['crop'],
        'confidence': top_predictions[0]['confidence'],
        'top_predictions': top_predictions,
        'explanation': explanation,
        'alternatives': top_predictions[1:],
    }

    print(json.dumps(output))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
