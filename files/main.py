from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dss_backend import decision_support
import uvicorn

app = FastAPI()

# Allow frontend to make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestBody(BaseModel):
    N: float
    P: float
    K: float
    ph: float
    temperature: float
    humidity: float
    rainfall: float

@app.post("/predict")
def get_prediction(req: RequestBody):
    # Call the ML backend
    result = decision_support(
        n=req.N,
        p=req.P,
        k=req.K,
        ph=req.ph,
        temperature=req.temperature,
        humidity=req.humidity,
        rainfall=req.rainfall
    )
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", port=8000, reload=True)
