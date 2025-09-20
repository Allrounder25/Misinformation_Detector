from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from gemini_client import get_gemini_response, get_gemini_response_for_image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    text: str | None = None
    image: str | None = None
    url: str | None = None
    model: str | None = None

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    if not request:
        return {"error": "Invalid request"}
    if request.text and request.url:
        try:
            return get_gemini_response(request.text, request.url, request.model)
        except Exception as e:
            return {"error": f"An error occurred: {e}"}
    return {"error": "No text or url provided"}

@app.post("/analyze_image")
async def analyze_image(request: AnalysisRequest):
    if request.image and request.url:
        try:
            return get_gemini_response_for_image(request.image, request.url, request.model)
        except Exception as e:
            return {"error": f"An error occurred: {e}"}
    return {"error": "No image or url provided"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)