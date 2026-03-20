# Crop Recommendation FastAPI Service

## Files
- `train.py`: trains `XGBClassifier`, evaluates accuracy, saves model artifacts.
- `predict.py`: loads artifacts, runs prediction, applies rule-based boosts, computes business metrics.
- `main.py`: FastAPI app exposing `POST /predict`.

## 1) Install dependencies
```bash
pip install -r requirements.txt
```

## 2) Train model
```bash
python train.py
```

## 3) Start API
```bash
uvicorn main:app --reload
```

## Request body
```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.9,
  "humidity": 82,
  "ph": 6.5,
  "rainfall": 202.9,
  "budget": 50000
}
```

## Notes
- Set `CROP_DATASET_PATH` if your dataset is in a custom location.
- Artifacts are saved to `crop_reco_api/artifacts/`.
