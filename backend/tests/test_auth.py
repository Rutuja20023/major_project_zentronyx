import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    payload = {
        "email": "newuser@zentronyx.com",
        "username": "newuser",
        "password": "SecurePassword123!",
        "full_name": "New User"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["username"] == payload["username"]
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_duplicate_user_registration(client: AsyncClient, test_user):
    payload = {
        "email": test_user.email,
        "username": "different_username",
        "password": "SecurePassword123!",
        "full_name": "Duplicate Email"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_user_login(client: AsyncClient, test_user):
    login_payload = {
        "username_or_email": test_user.username,
        "password": "Password123!"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient, test_user):
    login_payload = {
        "username_or_email": test_user.username,
        "password": "WrongPassword123!"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, auth_headers, test_user):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.id
    assert data["username"] == test_user.username
