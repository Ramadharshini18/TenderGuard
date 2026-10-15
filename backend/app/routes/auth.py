from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.common import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    UserCreate,
    ApiResponse,
)
from app.utils.security import (
    verify_password,
    hash_password,
    create_access_token,
)
from app.routes.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Admin Login",
    description="Authenticates administrator credentials, verifies account status, and issues a signed JWT access token."
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    # 1. Basic input validation
    clean_email = payload.email.strip().lower()
    if not clean_email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )

    # 2. Find user in database
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Verify password hash
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Check account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This administrator account has been deactivated."
        )

    # 5. Generate JWT token with configurable expiration
    if payload.remember_me:
        # 7 days expiration for remembered terminals
        expires_delta = timedelta(days=7)
        expires_in = int(expires_delta.total_seconds())
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role
    }
    access_token = create_access_token(data=token_claims, expires_delta=expires_delta)

    # 6. Return standard token response (password hash NEVER returned)
    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current Authenticated User",
    description="Returns the profile details of the administrator associated with the active JWT bearer token."
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=ApiResponse[dict],
    summary="Admin Logout",
    description="Signals session termination. The client discards the stored JWT token."
)
def logout(current_user: User = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse[dict](
        success=True,
        message="Session successfully terminated.",
        data={"user_id": current_user.id}
    )


@router.post(
    "/register",
    response_model=UserResponse,
    summary="Register Administrator (Provisioning)",
    description="Registers a new administrator account with a securely hashed password."
)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db)
) -> UserResponse:
    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{clean_email}' already exists."
        )

    new_user = User(
        name=payload.name.strip(),
        email=clean_email,
        password_hash=hash_password(payload.password),
        role=payload.role or "admin",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)
