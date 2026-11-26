from pathlib import Path
import os, secrets, json
import joblib
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
app=FastAPI(title="LeadFlow ML")
ROOT=Path(__file__).parent/"artifacts"
class Lead(BaseModel):
    source:str=Field(max_length=100)
    product_interest:str=Field(max_length=200)
    enquiry_length:int=Field(ge=0,le=3000)
def authorize(key):
    expected=os.getenv("ML_API_KEY")
    if not expected or not secrets.compare_digest(key or "",expected):
        raise HTTPException(401,"Unauthorized")
@app.get("/health")
def health():
    return {"ready":all((ROOT/f).exists() for f in ["random_forest.joblib","segments.joblib","metrics.json"])}
@app.post("/predict")
def predict(lead:Lead,x_api_key:str|None=Header(default=None)):
    authorize(x_api_key)
    if not health()["ready"]:
        raise HTTPException(503,"Train models first")
    x=pd.DataFrame([lead.model_dump()])
    model=joblib.load(ROOT/"random_forest.joblib")
    prep,km=joblib.load(ROOT/"segments.joblib")
    p=float(model.predict_proba(x)[0,1])
    return {"conversion_probability":p,"segment":int(km.predict(prep.transform(x))[0]),"model":"random_forest","temperature":"HOT" if p>=.75 else "WARM" if p>=.4 else "COLD"}
@app.get("/metrics")
def metrics(x_api_key:str|None=Header(default=None)):
    authorize(x_api_key)
    if not (ROOT/"metrics.json").exists():
        raise HTTPException(503,"Train models first")
    return json.loads((ROOT/"metrics.json").read_text())
