from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import upload, dashboard, classify, query, explain

app = FastAPI(title="LogHunt AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(classify.router)
app.include_router(query.router)
app.include_router(explain.router)
