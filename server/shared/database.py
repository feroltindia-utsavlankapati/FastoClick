from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from shared.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    # pool_size=settings.DATABASE_POOL_SIZE,  # Removed because SQLite doesn't support pool_size in the same way
)

async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    from shared.models.base import Base
    # import models to register them
    from shared.models.tenant import (
        Tenant, User, CompanyContext, StrategyPlan, ContentIdeasResult, CompanyProduct,
        SocialPlatformCredential, ConnectedSocialAccount, ScheduledPost, MediaAsset, PostAnalytics
    )
    async with engine.begin() as conn:
        # For dev: auto-create tables
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                bind=sync_conn,
                checkfirst=True
            )
        )
