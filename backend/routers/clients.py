from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.client import Client
from backend.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
async def list_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).order_by(Client.name))
    return result.scalars().all()


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Client).where(Client.pan == data.pan))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Client with this PAN already exists")
    client = Client(**data.model_dump())
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(client_id: int, data: ClientUpdate, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.flush()
    await db.refresh(client)
    return client
