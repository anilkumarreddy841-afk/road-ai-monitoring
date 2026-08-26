from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel
import os

app = FastAPI(title='AI Service')


class VideoCompareRequest(BaseModel):
    before_files: Optional[List[str]] = None
    after_video: Optional[str] = None
    after_photos: Optional[List[str]] = None


class EvidenceVideoRequest(BaseModel):
    case_id: Optional[int] = None
    road_name: Optional[str] = None
    damage_type: Optional[str] = None
    severity: Optional[str] = None
    date_reported: Optional[str] = None
    contractor_response: Optional[dict] = None
    authority_review: Optional[dict] = None
    accepted_deadline: Optional[str] = None
    current_status: Optional[str] = None
    before_files: Optional[List[str]] = None
    after_video: Optional[str] = None
    after_photos: Optional[List[str]] = None
    disclaimer: Optional[str] = None


@app.post('/predict')
async def predict(files: List[UploadFile] | None = None):
    # Placeholder AI service stub for road damage detection and repair estimation.
    results = []
    if files:
        for f in files:
            results.append(
                {
                    "filename": f.filename,
                    "detections": [
                        {
                            "type": "pothole",
                            "severity": "moderate",
                            "confidence": 0.82,
                            "area_m2": 1.6,
                            "length_m": 1.3,
                            "width_m": 1.2,
                        }
                    ],
                    "damage_type": "pothole",
                    "severity": "Moderate",
                    "confidence": 0.82,
                    "damage_area": 1.6,
                    "damage_length": 1.3,
                    "damage_width": 1.2,
                    "damage_depth": 0.18,
                    "damage_percentage": 4.5,
                    "repair_priority": "High",
                    "predicted_failure_risk": 0.72,
                    "estimated_repair_cost": 480.0,
                    "material_estimates": {
                        "asphalt_mtons": 0.14,
                        "concrete_mtons": 0.09,
                        "gravel_tons": 0.07,
                        "sand_tons": 0.05,
                        "cement_bags": 0.1,
                        "steel_tons": 0.01,
                        "water_liters": 18,
                    },
                    "cost_breakdown": {
                        "material_cost": 120.0,
                        "labor_cost": 240.0,
                        "equipment_cost": 220.0,
                        "transportation_cost": 50.0,
                        "safety_cost": 15.0,
                        "environmental_cost": 2.5,
                        "contingency_cost": 72.0,
                        "taxes": 71.4,
                        "total_cost": 790.9,
                        "cost_per_square_meter": 494.31,
                    },
                }
            )
    return JSONResponse({"predictions": results})


@app.post('/compare-videos')
async def compare_videos(
    video: UploadFile = File(...),
    before_files: List[UploadFile] = File([]),
):
    """
    Compare before-repair and after-repair videos/images.

    Returns a similarity score, damage reduction percentage, and confidence.
    This is a stub — real implementation would use computer vision (e.g., YOLOv8 +
    video frame analysis) to detect and quantify road damage before and after repair.
    """
    # TODO: Implement real before/after video comparison using:
    #   - Frame extraction from the after-repair video
    #   - Damage detection on each frame (YOLOv8)
    #   - Comparison with before-repair images
    #   - Blur faces and license plates in all output frames
    #   - Return damage reduction percentage and confidence score

    return JSONResponse({
        "comparison": {
            "before_files_count": len(before_files),
            "after_video_filename": video.filename,
            "damage_reduction_percentage": 85.0,
            "similarity_score": 0.92,
            "confidence": 0.88,
            "before_damage_detected": True,
            "after_damage_detected": False,
            "severity_before": "Major",
            "severity_after": "Minor",
            "repair_quality": "Good",
            "notes": "Stub comparison: significant damage reduction detected. Real implementation requires computer vision pipeline.",
        }
    })


@app.post('/generate-evidence-video')
async def generate_evidence_video(request: EvidenceVideoRequest):
    """
    Generate an AI evidence/awareness video for a road damage case.

    The video includes:
      - Road damage footage (before and after)
      - Case ID, date reported, contractor response
      - Promised completion date, accepted deadline
      - Current status (overdue/failed/resolved)
      - Official case verification status
      - Timestamps and captions
      - Road damage severity
      - Face and vehicle number plate blurring
      - Verified project/contractor information (only when approved)
      - Disclaimer that case status is subject to official review

    This is a stub — real implementation would use ffmpeg/moviepy to:
      - Select important video clips
      - Add timestamps and captions
      - Apply face/plate blurring
      - Overlay text and graphics
      - Export the final video
    """
    # TODO: Implement real video generation using ffmpeg or moviepy:
    #   1. Load before/after video clips
    #   2. Select key frames showing damage
    #   3. Apply face and license plate blurring (OpenCV + YOLO for detection)
    #   4. Add text overlays: case ID, dates, status, severity
    #   5. Add before/after comparison split-screen
    #   6. Add disclaimer overlay
    #   7. Export final video to uploads directory

    video_filename = f"evidence_video_{request.case_id or 'unknown'}_{int(__import__('time').time())}.mp4"

    return JSONResponse({
        "video_filename": video_filename,
        "status": "ready",
        "privacy_applied": True,
        "moderator_approved": False,
        "details": {
            "case_id": request.case_id,
            "road_name": request.road_name,
            "damage_type": request.damage_type,
            "severity": request.severity,
            "date_reported": request.date_reported,
            "contractor_response": request.contractor_response,
            "accepted_deadline": request.accepted_deadline,
            "current_status": request.current_status,
            "disclaimer": request.disclaimer or "This case status is subject to official review.",
            "before_files": request.before_files or [],
            "after_video": request.after_video,
            "after_photos": request.after_photos or [],
        },
        "message": "Evidence video generated (stub). Real implementation requires ffmpeg/moviepy pipeline.",
    })


@app.post('/blur-privacy')
async def blur_privacy(
    video: UploadFile = File(...),
    blur_faces: bool = Form(True),
    blur_plates: bool = Form(True),
):
    """
    Blur faces and vehicle number plates in a video.

    This is a stub — real implementation would use:
      - OpenCV for video frame processing
      - YOLOv8 or MTCNN for face detection
      - OpenALPR or YOLOv8 for license plate detection
      - Gaussian blur applied to detected regions
    """
    # TODO: Implement real privacy blurring using OpenCV + face/plate detection models

    return JSONResponse({
        "status": "complete",
        "input_video": video.filename,
        "blur_faces": blur_faces,
        "blur_plates": blur_plates,
        "output_video": f"blurred_{video.filename}",
        "faces_blurred": 0,
        "plates_blurred": 0,
        "message": "Privacy blurring applied (stub). Real implementation requires OpenCV + detection models.",
    })


@app.get('/health')
async def health():
    return {"status": "ai-service ok"}
