from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import json
import os
import aiofiles
import httpx
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_user, require_role
from app import crud, schemas

router = APIRouter()


class ReportIn(BaseModel):
    title: str | None = None
    description: str | None = None
    road_id: str | None = None
    road_name: str | None = None
    latitude: float
    longitude: float
    city: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    weather: str | None = None
    weather_conditions: str | None = None
    device_info: dict | None = None
    report_source: str | None = None
    analysis_source: str | None = None
    satellite_verified: bool | None = None
    vehicle_speed: float | None = None
    direction: str | None = None
    reported_at: datetime | None = None
    damage_type: str | None = None
    severity: str | None = None
    status: str | None = None
    repair_priority: str | None = None
    damage_count: int | None = None
    pothole_count: int | None = None
    average_pothole_size: float | None = None
    crack_length: float | None = None
    damage_area: float | None = None
    damage_length: float | None = None
    damage_width: float | None = None
    damage_depth: float | None = None
    damage_percentage: float | None = None
    road_health_index: float | None = None
    predicted_failure_risk: float | None = None
    repair_difficulty: str | None = None
    estimated_repair_cost: float | None = None
    estimated_duration: str | None = None
    expected_completion_date: datetime | None = None
    assigned_engineer: str | None = None
    assigned_contractor: str | None = None
    contractor_assignment: str | None = None
    engineer_verified: bool | None = None
    budget_utilization: float | None = None
    material_estimates: dict | None = None
    cost_breakdown: dict | None = None


class RepairEstimateIn(BaseModel):
    damage_area: float | None = None
    damage_length: float | None = None
    damage_width: float | None = None
    damage_depth: float | None = None
    damage_type: str | None = None
    severity: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    budget_limit: float | None = None


@router.post('', summary='Create a report')
async def create_report(
    title: str = Form(None),
    description: str = Form(None),
    road_id: str = Form(None),
    road_name: str = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    city: str = Form(None),
    district: str = Form(None),
    state: str = Form(None),
    pincode: str = Form(None),
    weather: str = Form(None),
    weather_conditions: str = Form(None),
    device_info: str = Form(None),
    report_source: str | None = Form('citizen'),
    analysis_source: str | None = Form('ai'),
    satellite_verified: bool | None = Form(None),
    vehicle_speed: float | None = Form(None),
    direction: str | None = Form(None),
    reported_at: str | None = Form(None),
    damage_type: str | None = Form(None),
    severity: str | None = Form(None),
    status: str | None = Form(None),
    repair_priority: str | None = Form(None),
    damage_count: int | None = Form(None),
    pothole_count: int | None = Form(None),
    average_pothole_size: float | None = Form(None),
    crack_length: float | None = Form(None),
    damage_area: float | None = Form(None),
    damage_length: float | None = Form(None),
    damage_width: float | None = Form(None),
    damage_depth: float | None = Form(None),
    damage_percentage: float | None = Form(None),
    road_health_index: float | None = Form(None),
    predicted_failure_risk: float | None = Form(None),
    repair_difficulty: str | None = Form(None),
    estimated_repair_cost: float | None = Form(None),
    estimated_duration: str | None = Form(None),
    expected_completion_date: str | None = Form(None),
    assigned_engineer: str | None = Form(None),
    assigned_contractor: str | None = Form(None),
    contractor_assignment: str | None = Form(None),
    engineer_verified: bool | None = Form(None),
    budget_utilization: float | None = Form(None),
    material_estimates: str | None = Form(None),
    cost_breakdown: str | None = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    upload_dir = os.path.join(os.getcwd(), 'backend', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    saved = []

    for f in files:
        dest = os.path.join(upload_dir, f.filename)
        async with aiofiles.open(dest, 'wb') as out_file:
            content = await f.read()
            await out_file.write(content)
        saved.append(dest)

    ai_url = os.getenv('AI_SERVICE_URL')
    predictions = {}
    files_payload = []
    if ai_url and saved:
        try:
            async with httpx.AsyncClient() as client:
                for p in saved:
                    files_payload.append(("files", (os.path.basename(p), open(p, 'rb'), 'image/jpeg')))
                resp = await client.post(ai_url, files=files_payload, timeout=30.0)
                predictions = resp.json() if resp.status_code == 200 else {'error': f'ai service returned {resp.status_code}'}
        except Exception:
            predictions = {'error': 'ai service unavailable'}
        finally:
            for _, file_tuple in files_payload:
                file_tuple[1].close()
    else:
        predictions = {
            'tool': 'local-fallback',
            'severity': severity or 'unknown',
            'message': 'No AI service configured or no media attached; using fallback detection.',
        }

    device_info_json = None
    if device_info:
        try:
            device_info_json = json.loads(device_info)
        except json.JSONDecodeError:
            device_info_json = {'raw': device_info}

    material_estimates_json = None
    if material_estimates:
        try:
            material_estimates_json = json.loads(material_estimates)
        except json.JSONDecodeError:
            material_estimates_json = {'raw': material_estimates}

    cost_breakdown_json = None
    if cost_breakdown:
        try:
            cost_breakdown_json = json.loads(cost_breakdown)
        except json.JSONDecodeError:
            cost_breakdown_json = {'raw': cost_breakdown}

    report_in = schemas.ReportCreate(
        title=title,
        description=description,
        road_id=road_id,
        road_name=road_name,
        latitude=latitude,
        longitude=longitude,
        city=city,
        district=district,
        state=state,
        pincode=pincode,
        weather=weather,
        weather_conditions=weather_conditions,
        device_info=device_info_json,
        report_source=report_source,
        analysis_source=analysis_source,
        satellite_verified=satellite_verified,
        vehicle_speed=vehicle_speed,
        direction=direction,
        reported_at=datetime.fromisoformat(reported_at) if reported_at else None,
        damage_type=damage_type,
        severity=severity,
        status=status,
        repair_priority=repair_priority,
        damage_count=damage_count,
        pothole_count=pothole_count,
        average_pothole_size=average_pothole_size,
        crack_length=crack_length,
        damage_area=damage_area,
        damage_length=damage_length,
        damage_width=damage_width,
        damage_depth=damage_depth,
        damage_percentage=damage_percentage,
        road_health_index=road_health_index,
        predicted_failure_risk=predicted_failure_risk,
        repair_difficulty=repair_difficulty,
        estimated_repair_cost=estimated_repair_cost,
        estimated_duration=estimated_duration,
        expected_completion_date=datetime.fromisoformat(expected_completion_date) if expected_completion_date else None,
        assigned_engineer=assigned_engineer,
        assigned_contractor=assigned_contractor,
        contractor_assignment=contractor_assignment,
        engineer_verified=engineer_verified,
        budget_utilization=budget_utilization,
        material_estimates=material_estimates_json,
        cost_breakdown=cost_breakdown_json,
    )
    db_report = crud.create_report(
        db,
        user.id,
        report_in,
        severity=predictions.get('severity') if isinstance(predictions, dict) else None,
        files=[os.path.basename(p) for p in saved],
        predictions=predictions,
        material_estimates=material_estimates_json,
        cost_breakdown=cost_breakdown_json,
        estimated_repair_cost=estimated_repair_cost,
        repair_difficulty=repair_difficulty,
        budget_utilization=budget_utilization,
    )

    return {
        'id': db_report.id,
        'road_id': db_report.road_id,
        'title': db_report.title,
        'description': db_report.description,
        'road_name': db_report.road_name,
        'latitude': db_report.latitude,
        'longitude': db_report.longitude,
        'city': db_report.city,
        'district': db_report.district,
        'state': db_report.state,
        'pincode': db_report.pincode,
        'weather': db_report.weather,
        'weather_conditions': db_report.weather_conditions,
        'device_info': db_report.device_info,
        'report_source': db_report.report_source,
        'analysis_source': db_report.analysis_source,
        'satellite_verified': db_report.satellite_verified,
        'vehicle_speed': db_report.vehicle_speed,
        'direction': db_report.direction,
        'reported_at': db_report.reported_at,
        'damage_type': db_report.damage_type,
        'severity': db_report.severity,
        'status': db_report.status,
        'repair_priority': db_report.repair_priority,
        'damage_count': db_report.damage_count,
        'pothole_count': db_report.pothole_count,
        'average_pothole_size': db_report.average_pothole_size,
        'crack_length': db_report.crack_length,
        'damage_area': db_report.damage_area,
        'damage_length': db_report.damage_length,
        'damage_width': db_report.damage_width,
        'damage_depth': db_report.damage_depth,
        'damage_percentage': db_report.damage_percentage,
        'road_health_index': db_report.road_health_index,
        'predicted_failure_risk': db_report.predicted_failure_risk,
        'repair_difficulty': db_report.repair_difficulty,
        'estimated_repair_cost': db_report.estimated_repair_cost,
        'estimated_duration': db_report.estimated_duration,
        'expected_completion_date': db_report.expected_completion_date,
        'assigned_engineer': db_report.assigned_engineer,
        'assigned_contractor': db_report.assigned_contractor,
        'contractor_assignment': db_report.contractor_assignment,
        'engineer_verified': db_report.engineer_verified,
        'budget_utilization': db_report.budget_utilization,
        'material_estimates': db_report.material_estimates,
        'cost_breakdown': db_report.cost_breakdown,
        'files': db_report.files,
        'predictions': db_report.predictions,
        'created_at': db_report.created_at,
        'last_updated': db_report.last_updated,
    }


@router.post('/estimate', summary='Estimate repair cost and materials')
async def estimate_repair(payload: RepairEstimateIn):
    damage_area = payload.damage_area or ((payload.damage_length or 0.0) * (payload.damage_width or 0.0))
    damage_length = payload.damage_length or 0.0
    damage_width = payload.damage_width or 0.0
    damage_depth = payload.damage_depth or 0.15
    repair_factor = {
        'minor': 1.0,
        'moderate': 1.2,
        'major': 1.5,
        'critical': 2.0,
    }.get((payload.severity or '').lower(), 1.3)

    volume_m3 = max(damage_area, 0.0) * max(damage_depth, 0.1)
    asphalt_qty = round(volume_m3 * 0.08 * repair_factor, 2)
    concrete_qty = round(volume_m3 * 0.05 * repair_factor, 2)
    gravel_qty = round(damage_area * 0.04 * repair_factor, 2)
    sand_qty = round(damage_area * 0.03 * repair_factor, 2)
    cement_qty = round(volume_m3 * 0.06 * repair_factor, 2)
    steel_qty = round(volume_m3 * 0.01 * repair_factor, 2)
    water_qty = round(volume_m3 * 0.12 * repair_factor, 2)

    labor_hours = round((damage_area * 0.5 + volume_m3 * 10) * repair_factor, 2)
    engineers = max(1, int(labor_hours // 80) if labor_hours > 0 else 1)
    workers = max(2, int(labor_hours // 8) if labor_hours > 0 else 2)

    equipment = {
        'roller': 1,
        'paver': 1,
        'excavator': 1 if volume_m3 > 5 else 0,
        'truck': max(1, int(volume_m3 // 10) + 1),
    }

    material_cost = round(asphalt_qty * 80 + concrete_qty * 90 + gravel_qty * 20 + sand_qty * 15 + cement_qty * 75 + steel_qty * 120 + water_qty * 2, 2)
    labor_cost = round(labor_hours * 20, 2)
    equipment_cost = round(equipment['roller'] * 250 + equipment['paver'] * 300 + equipment['excavator'] * 400 + equipment['truck'] * 120, 2)
    transportation_cost = round(equipment['truck'] * 50, 2)
    safety_cost = round(100 + damage_area * 2, 2)
    contingency_cost = round((material_cost + labor_cost + equipment_cost) * 0.12, 2)
    environmental_cost = round(damage_area * 1.5, 2)
    taxes = round((material_cost + labor_cost + equipment_cost + transportation_cost + safety_cost + contingency_cost + environmental_cost) * 0.18, 2)

    total_cost = round(material_cost + labor_cost + equipment_cost + transportation_cost + safety_cost + environmental_cost + contingency_cost + taxes, 2)
    cost_per_sqm = round(total_cost / max(damage_area, 1.0), 2)
    cost_per_km = round(total_cost / max(damage_length / 1000.0, 0.001), 2)
    budget_utilization = None
    if payload.budget_limit and payload.budget_limit > 0:
        budget_utilization = round(min(100.0, total_cost / payload.budget_limit * 100.0), 2)

    priority = 'High' if repair_factor >= 1.5 else 'Medium' if repair_factor >= 1.2 else 'Low'
    expected_duration = f"{max(1, int((damage_area or 1) / 50 * repair_factor))} days"
    risk_level = 'Critical' if priority == 'High' else 'Moderate' if priority == 'Medium' else 'Low'

    return {
        'damage_area': round(damage_area, 2),
        'damage_length': round(damage_length, 2),
        'damage_width': round(damage_width, 2),
        'damage_depth': round(damage_depth, 2),
        'repair_priority': priority,
        'expected_repair_duration': expected_duration,
        'risk_level': risk_level,
        'material_estimates': {
            'asphalt_mtons': asphalt_qty,
            'concrete_mtons': concrete_qty,
            'gravel_tons': gravel_qty,
            'sand_tons': sand_qty,
            'cement_bags': cement_qty,
            'steel_tons': steel_qty,
            'water_liters': water_qty,
        },
        'labor': {
            'engineers': engineers,
            'workers': workers,
            'labor_hours': labor_hours,
        },
        'equipment': equipment,
        'cost_breakdown': {
            'material_cost': material_cost,
            'labor_cost': labor_cost,
            'equipment_cost': equipment_cost,
            'transportation_cost': transportation_cost,
            'safety_cost': safety_cost,
            'environmental_cost': environmental_cost,
            'contingency_cost': contingency_cost,
            'taxes': taxes,
            'total_cost': total_cost,
            'cost_per_square_meter': cost_per_sqm,
            'cost_per_kilometer': cost_per_km,
            'budget_utilization_percentage': budget_utilization,
        },
    }


@router.get('', summary='List reports')
async def list_reports(db: Session = Depends(get_db)):
    reports = crud.get_reports(db)
    return [
        {
            'id': report.id,
            'road_id': report.road_id,
            'title': report.title,
            'description': report.description,
            'road_name': report.road_name,
            'latitude': report.latitude,
            'longitude': report.longitude,
            'city': report.city,
            'district': report.district,
            'state': report.state,
            'pincode': report.pincode,
            'weather': report.weather,
            'weather_conditions': report.weather_conditions,
            'device_info': report.device_info,
            'report_source': report.report_source,
            'analysis_source': report.analysis_source,
            'satellite_verified': report.satellite_verified,
            'vehicle_speed': report.vehicle_speed,
            'direction': report.direction,
            'reported_at': report.reported_at,
            'damage_type': report.damage_type,
            'severity': report.severity,
            'status': report.status,
            'repair_priority': report.repair_priority,
            'damage_count': report.damage_count,
            'pothole_count': report.pothole_count,
            'average_pothole_size': report.average_pothole_size,
            'crack_length': report.crack_length,
            'damage_area': report.damage_area,
            'damage_length': report.damage_length,
            'damage_width': report.damage_width,
            'damage_depth': report.damage_depth,
            'damage_percentage': report.damage_percentage,
            'road_health_index': report.road_health_index,
            'predicted_failure_risk': report.predicted_failure_risk,
            'repair_difficulty': report.repair_difficulty,
            'estimated_repair_cost': report.estimated_repair_cost,
            'estimated_duration': report.estimated_duration,
            'expected_completion_date': report.expected_completion_date,
            'assigned_engineer': report.assigned_engineer,
            'assigned_contractor': report.assigned_contractor,
            'contractor_assignment': report.contractor_assignment,
            'engineer_verified': report.engineer_verified,
            'budget_utilization': report.budget_utilization,
            'material_estimates': report.material_estimates or {},
            'cost_breakdown': report.cost_breakdown or {},
            'files': report.files or [],
            'predictions': report.predictions or {},
            'created_at': report.created_at,
            'last_updated': report.last_updated,
        }
        for report in reports
    ]


class ReportUpdateIn(BaseModel):
    status: str | None = None
    severity: str | None = None
    repair_priority: str | None = None
    assigned_engineer: str | None = None
    assigned_contractor: str | None = None
    contractor_assignment: str | None = None
    estimated_repair_cost: float | None = None
    expected_completion_date: datetime | None = None
    engineer_verified: bool | None = None
    budget_utilization: float | None = None
    material_estimates: dict | None = None
    cost_breakdown: dict | None = None


@router.put('/{report_id}', summary='Update report details')
async def update_report(report_id: int, payload: ReportUpdateIn, db: Session = Depends(get_db), user=Depends(require_role(['engineer', 'contractor', 'government', 'finance', 'admin']))):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    updates = payload.dict(exclude_unset=True)
    updated = crud.update_report(db, report_id, updates)
    return {
        'id': updated.id,
        'road_id': updated.road_id,
        'title': updated.title,
        'description': updated.description,
        'road_name': updated.road_name,
        'latitude': updated.latitude,
        'longitude': updated.longitude,
        'city': updated.city,
        'district': updated.district,
        'state': updated.state,
        'pincode': updated.pincode,
        'weather': updated.weather,
        'weather_conditions': updated.weather_conditions,
        'device_info': updated.device_info,
        'report_source': updated.report_source,
        'analysis_source': updated.analysis_source,
        'satellite_verified': updated.satellite_verified,
        'vehicle_speed': updated.vehicle_speed,
        'direction': updated.direction,
        'reported_at': updated.reported_at,
        'damage_type': updated.damage_type,
        'severity': updated.severity,
        'status': updated.status,
        'repair_priority': updated.repair_priority,
        'damage_count': updated.damage_count,
        'pothole_count': updated.pothole_count,
        'average_pothole_size': updated.average_pothole_size,
        'crack_length': updated.crack_length,
        'damage_area': updated.damage_area,
        'damage_length': updated.damage_length,
        'damage_width': updated.damage_width,
        'damage_depth': updated.damage_depth,
        'damage_percentage': updated.damage_percentage,
        'road_health_index': updated.road_health_index,
        'predicted_failure_risk': updated.predicted_failure_risk,
        'repair_difficulty': updated.repair_difficulty,
        'estimated_repair_cost': updated.estimated_repair_cost,
        'estimated_duration': updated.estimated_duration,
        'expected_completion_date': updated.expected_completion_date,
        'assigned_engineer': updated.assigned_engineer,
        'assigned_contractor': updated.assigned_contractor,
        'contractor_assignment': updated.contractor_assignment,
        'engineer_verified': updated.engineer_verified,
        'budget_utilization': updated.budget_utilization,
        'material_estimates': updated.material_estimates or {},
        'cost_breakdown': updated.cost_breakdown or {},
        'files': updated.files or [],
        'predictions': updated.predictions or {},
        'created_at': updated.created_at,
        'last_updated': updated.last_updated,
    }


@router.get('/summary', summary='Report summary for dashboard')
async def report_summary(db: Session = Depends(get_db)):
    return crud.get_report_summary(db)
