from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.security.password import hash_password


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_username_or_email(self, username_or_email: str) -> Optional[User]:
        val = username_or_email.lower()
        result = await self.db.execute(
            select(User).where(
                or_(
                    User.email == val,
                    User.username == username_or_email
                )
            )
        )
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate, role: UserRole = UserRole.USER) -> User:
        user = User(
            email=user_in.email.lower(),
            username=user_in.username,
            full_name=user_in.full_name,
            hashed_password=hash_password(user_in.password),
            role=role,
            is_active=True
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        result = await self.db.execute(select(User).offset(skip).limit(limit))
        return list(result.scalars().all())
