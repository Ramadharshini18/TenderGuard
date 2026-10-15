from datetime import datetime
from typing import Optional, Dict, Any, Generic, TypeVar
from pydantic import BaseModel, Field, EmailStr

DataT = TypeVar("DataT")


class DatabaseStatus(BaseModel):
    status: str
    connected: bool
    database_type: Optional[str] = None
    message: str


class HealthCheckResponse(BaseModel):
    status: str = Field(..., example="healthy")
    app_name: str = Field(..., example="TenderGuard")
    version: str = Field(..., example="1.0.0")
    environment: str = Field(..., example="development")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    database: DatabaseStatus


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[DataT] = None


# --- Authentication & User Schemas ---

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "admin"
    is_active: bool = True


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: Optional[str] = "admin"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse


# Compatibility aliases
LoginPlaceholderRequest = LoginRequest
LoginPlaceholderResponse = TokenResponse
