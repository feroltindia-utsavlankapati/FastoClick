"""
REST endpoints for media upload and management.
Images/videos are stored locally under server/media_uploads/.
"""
import os
import json
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.future import select
from sqlalchemy import desc
from shared.database import async_session_maker
from shared.models.tenant import MediaAsset
from shared.dependencies import get_current_tenant, TenantContext

logger = logging.getLogger(__name__)
router = APIRouter()

# Media upload directory
MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "media_uploads")
THUMB_DIR = os.path.join(MEDIA_DIR, "thumbnails")


def ensure_dirs():
    os.makedirs(MEDIA_DIR, exist_ok=True)
    os.makedirs(THUMB_DIR, exist_ok=True)


@router.get("/media/{tenant_id}")
async def list_media(
    tenant_id: str,
    media_type: str = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """List media assets with optional type filter (image/video)."""
    try:
        async with async_session_maker() as session:
            query = select(MediaAsset).where(
                MediaAsset.tenant_id == tenant_id
            ).order_by(desc(MediaAsset.created_at))

            result = await session.execute(query)
            assets = result.scalars().all()

            data = []
            for a in assets:
                if media_type:
                    if media_type == "image" and not (a.mime_type or "").startswith("image/"):
                        continue
                    if media_type == "video" and not (a.mime_type or "").startswith("video/"):
                        continue

                data.append({
                    "id": a.id,
                    "filename": a.filename,
                    "original_filename": a.original_filename or "",
                    "mime_type": a.mime_type or "",
                    "file_size_bytes": a.file_size_bytes or 0,
                    "width": a.width,
                    "height": a.height,
                    "duration_seconds": a.duration_seconds,
                    "has_thumbnail": bool(a.thumbnail_path),
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                })

            return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Failed to list media: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Upload a media file (image or video)."""
    ensure_dirs()

    # Validate file type
    allowed_types = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"
    ]

    content_type = file.content_type or ""
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}. Allowed: {', '.join(allowed_types)}")

    try:
        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)

        # Max 100MB
        if file_size > 100 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum 100MB.")

        # Generate unique filename
        ext = os.path.splitext(file.filename or "file")[1] or ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(MEDIA_DIR, unique_name)

        # Save file
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Get dimensions for images
        width = None
        height = None
        thumbnail_path = None
        duration = None

        if content_type.startswith("image/"):
            try:
                from PIL import Image
                img = Image.open(file_path)
                width, height = img.size

                # Generate thumbnail
                thumb_name = f"thumb_{unique_name}"
                thumb_path = os.path.join(THUMB_DIR, thumb_name)
                img.thumbnail((300, 300))
                img.save(thumb_path, quality=85)
                thumbnail_path = thumb_path
            except Exception as e:
                logger.warning(f"Could not process image: {e}")

        # Save to database
        async with async_session_maker() as session:
            asset = MediaAsset(
                tenant_id=tenant_id,
                filename=unique_name,
                original_filename=file.filename,
                mime_type=content_type,
                file_size_bytes=file_size,
                file_path=file_path,
                thumbnail_path=thumbnail_path,
                width=width,
                height=height,
                duration_seconds=duration,
            )
            session.add(asset)
            await session.commit()
            await session.refresh(asset)

            return {
                "success": True,
                "message": "File uploaded successfully",
                "data": {
                    "id": asset.id,
                    "filename": asset.filename,
                    "original_filename": asset.original_filename,
                    "mime_type": asset.mime_type,
                    "file_size_bytes": asset.file_size_bytes,
                    "width": width,
                    "height": height,
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Media upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Delete a media asset and its files."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(MediaAsset).where(MediaAsset.id == media_id)
            )
            asset = result.scalars().first()
            if not asset:
                raise HTTPException(status_code=404, detail="Media not found")

            # Delete physical files
            if asset.file_path and os.path.exists(asset.file_path):
                os.remove(asset.file_path)
            if asset.thumbnail_path and os.path.exists(asset.thumbnail_path):
                os.remove(asset.thumbnail_path)

            await session.delete(asset)
            await session.commit()

        return {"success": True, "message": "Media deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete media: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/media/file/{media_id}")
async def serve_media(media_id: str):
    """Serve a media file for preview."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(MediaAsset).where(MediaAsset.id == media_id)
            )
            asset = result.scalars().first()
            if not asset or not asset.file_path or not os.path.exists(asset.file_path):
                raise HTTPException(status_code=404, detail="File not found")

            return FileResponse(
                asset.file_path,
                media_type=asset.mime_type or "application/octet-stream",
                filename=asset.original_filename or asset.filename
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve media: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/media/thumbnail/{media_id}")
async def serve_thumbnail(media_id: str):
    """Serve a media thumbnail."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(MediaAsset).where(MediaAsset.id == media_id)
            )
            asset = result.scalars().first()
            if not asset:
                raise HTTPException(status_code=404, detail="Media not found")

            thumb = asset.thumbnail_path
            if not thumb or not os.path.exists(thumb):
                # Fall back to original file for non-image assets
                if asset.file_path and os.path.exists(asset.file_path):
                    return FileResponse(asset.file_path, media_type=asset.mime_type)
                raise HTTPException(status_code=404, detail="Thumbnail not found")

            return FileResponse(thumb, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve thumbnail: {e}")
        raise HTTPException(status_code=500, detail=str(e))
