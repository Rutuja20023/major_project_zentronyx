from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token, LoginRequest
from app.services.auth_service import AuthService
from app.security.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new platform user"
)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Registers a new user with email, username, and password."""
    auth_service = AuthService(db)
    return await auth_service.register_user(user_in)


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive JWT access token (JSON payload)"
)
async def login_json(login_in: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates user with username or email and password."""
    auth_service = AuthService(db)
    return await auth_service.authenticate_user(
        username_or_email=login_in.username_or_email,
        password=login_in.password
    )


@router.post(
    "/login/form",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Authenticate via OAuth2 Form Data (Swagger UI compatibility)",
    include_in_schema=False
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 Form compatible login endpoint for Swagger UI testing."""
    auth_service = AuthService(db)
    return await auth_service.authenticate_user(
        username_or_email=form_data.username,
        password=form_data.password
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile"
)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Returns profile information for the authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User logout"
)
async def logout(current_user: User = Depends(get_current_active_user)):
    """Logs out user and invalidates client session context."""
    return {"message": "Successfully logged out"}
