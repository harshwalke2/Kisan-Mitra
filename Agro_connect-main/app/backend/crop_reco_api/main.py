from __future__ import annotations

import os
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from predict import load_artifacts, predict_top_crops
from train import DEFAULT_DATASET_PATH, train_model


class PredictRequest(BaseModel):
    N: float = Field(..., ge=0)
    P: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    temperature: float = Field(..., ge=0)
    humidity: float = Field(..., ge=0)
    ph: float = Field(..., ge=0)
    rainfall: float = Field(..., ge=0)
    budget: float = Field(..., ge=0)


app = FastAPI(title="Crop Recommendation API", version="1.0.0")


@app.on_event("startup")
def startup_load_model() -> None:
    try:
        load_artifacts()
    except FileNotFoundError:
        dataset_env = os.getenv("CROP_DATASET_PATH", "").strip()
        dataset_path = Path(dataset_env).resolve() if dataset_env else DEFAULT_DATASET_PATH
        train_model(dataset_path)
        load_artifacts()
    except Exception as exc:  # pragma: no cover
        # Keep startup explicit: service should show a clear error if artifacts are missing.
        raise RuntimeError(str(exc)) from exc


@app.post("/predict")
def predict(payload: PredictRequest) -> Dict[str, object]:
    try:
        request_data = payload.model_dump()
        result = predict_top_crops(request_data)
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
