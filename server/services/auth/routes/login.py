from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from shared.schemas.responses import APIResponse
from shared.dependencies import get_db
from shared.models.tenant import User, Tenant
from shared.utils.security import get_password_hash, verify_password, create_access_token

router = APIRouter(tags=["Auth"])

class SignupRequest(BaseModel):
    tenant_name: str
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/signup", response_model=APIResponse[dict])
async def signup_user(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already registered")
        
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new Tenant
    new_tenant = Tenant(name=request.tenant_name)
    db.add(new_tenant)
    await db.flush() # flush to get the tenant ID
    
    # Create new User
    hashed_password = get_password_hash(request.password)
    new_user = User(
        tenant_id=new_tenant.id,
        username=request.username,
        email=request.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    await db.commit()
    
    return APIResponse(success=True, data={"message": "User created successfully", "user_id": new_user.id})

@router.post("/login", response_model=APIResponse[dict])
async def login_user(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalars().first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
        
    access_token = create_access_token(data={"sub": user.id, "tenant_id": user.tenant_id})
    return APIResponse(success=True, data={"access_token": access_token, "token_type": "bearer"})

