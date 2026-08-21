from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.security.password import verify_password
from app.security.jwt import create_access_token
from app.models.user import User, UserRole


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_user(self, user_in: UserCreate) -> UserResponse:
        existing_email = await self.user_repo.get_by_email(user_in.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists"
            )

        existing_username = await self.user_repo.get_by_username(user_in.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken"
            )

        # Check if first user in DB, assign ADMIN if first, else USER
        all_users = await self.user_repo.list_all(limit=1)
        role = UserRole.ADMIN if len(all_users) == 0 else UserRole.USER

        user = await self.user_repo.create(user_in, role=role)
        return UserResponse.model_validate(user)

    async def authenticate_user(self, username_or_email: str, password: str) -> Token:
        user = await self.user_repo.get_by_username_or_email(username_or_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"}
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"}
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive"
            )

        token_data = {
            "sub": user.id,
            "username": user.username,
            "role": user.role.value
        }
        access_token = create_access_token(data=token_data)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=3600
        )
