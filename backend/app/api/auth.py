from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from app.db import get_db
from app import crud, schemas
from app.deps import get_current_user
from app.security import create_access_token, verify_password
from app.firebase import verify_id_token

router = APIRouter()


class RegisterIn(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str | None = 'citizen'


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class FirebaseSessionIn(BaseModel):
    id_token: str


@router.post('/firebase', response_model=TokenOut)
def firebase_session(payload: FirebaseSessionIn, db: Session = Depends(get_db)):
    try:
        firebase_user = verify_id_token(payload.id_token)
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid Firebase authentication token')

    firebase_uid = firebase_user.get('uid')
    email = firebase_user.get('email')
    if not firebase_uid or not email:
        raise HTTPException(status_code=400, detail='Firebase account must include an email address')

    user = crud.get_user_by_firebase_uid(db, firebase_uid) or crud.get_user_by_email(db, email)
    if user:
        user.firebase_uid = firebase_uid
        db.commit()
        db.refresh(user)
    else:
        user = crud.create_firebase_user(db, firebase_uid, email, firebase_user.get('name'))

    return {'access_token': create_access_token(user.email, role=user.role), 'token_type': 'bearer'}


@router.post('/register', response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user = crud.create_user(db, schemas.UserCreate(**payload.dict()))
    token = create_access_token(user.email, role=user.role)
    return {'access_token': token, 'token_type': 'bearer'}


class LoginIn(BaseModel):
    email: str
    password: str


@router.post('/login', response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=400, detail='Invalid credentials')
    token = create_access_token(user.email, role=user.role)
    return {'access_token': token, 'token_type': 'bearer'}


@router.get('/me', response_model=schemas.UserOut)
def me(user=Depends(get_current_user)):
    return user
