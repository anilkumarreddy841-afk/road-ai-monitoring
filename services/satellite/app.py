from fastapi import FastAPI

app = FastAPI(title='Satellite Service')

@app.get('/compare')
async def compare(area_id: str = None):
    # TODO: integrate with Google Earth Engine or Sentinel data
    return {"area_id": area_id, "changes_detected": False, "notes": "stub"}

@app.get('/health')
async def health():
    return {"status": "satellite-service ok"}
