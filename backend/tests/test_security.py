import pytest
from httpx import AsyncClient
from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token, decode_access_token


def test_password_hashing():
    raw_pwd = "MySecretPassword123!"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_encode_decode():
    payload = {"sub": "user-uuid-1234", "username": "secdev", "role": "USER"}
    token = create_access_token(data=payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == payload["sub"]
    assert decoded["username"] == payload["username"]
    assert decoded["role"] == payload["role"]


@pytest.mark.asyncio
async def test_rbac_admin_endpoint_as_regular_user(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/users", headers=auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_rbac_admin_endpoint_as_admin(client: AsyncClient, admin_auth_headers):
    response = await client.get("/api/v1/users", headers=admin_auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
