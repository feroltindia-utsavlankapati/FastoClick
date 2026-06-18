import re

with open("c:/Utsav/ferolt/FastoClick/server/services/tenant/routes/projects.py", "r") as f:
    content = f.read()

# Add imports
imports_to_add = """
import os
import io
import json
import zipfile
import logging
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "media_uploads")
THUMB_DIR = os.path.join(MEDIA_DIR, "thumbnails")

"""
content = content.replace("router = APIRouter()", imports_to_add + "\nrouter = APIRouter()")

# Replace backup_project
backup_pattern = re.compile(r"@router\.get\(\"\/\{project_id\}\/backup\"\).*?return backup_data\n", re.DOTALL)

new_backup = """@router.get("/{project_id}/backup")
async def backup_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(Project).where(Project.id == project_id, Project.tenant_id == tenant.id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    backup_data = {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "goals": project.goals,
            "target_audience": project.target_audience,
            "kpis": project.kpis,
            "status": project.status,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None
        }
    }
    
    def serialize(obj):
        d = {}
        for c in obj.__table__.columns:
            val = getattr(obj, c.name)
            if isinstance(val, datetime):
                d[c.name] = val.isoformat()
            else:
                d[c.name] = val
        return d
        
    models_with_project_id = {
        "contacts": Contact,
        "email_templates": EmailTemplate,
        "email_campaigns": EmailCampaign,
        "company_contexts": CompanyContext,
        "strategy_plans": StrategyPlan,
        "content_ideas_results": ContentIdeasResult,
        "company_products": CompanyProduct,
        "social_platform_credentials": SocialPlatformCredential,
        "connected_social_accounts": ConnectedSocialAccount,
        "scheduled_posts": ScheduledPost,
        "media_assets": MediaAsset,
        "post_analytics": PostAnalytics
    }
    
    for key, model in models_with_project_id.items():
        res = await db.execute(select(model).where(model.project_id == project_id))
        backup_data[key] = [serialize(item) for item in res.scalars().all()]
        
    # Extra entities
    camp_ids = [c["id"] for c in backup_data["email_campaigns"]]
    if camp_ids:
        cc_res = await db.execute(select(EmailCampaignContact).where(EmailCampaignContact.campaign_id.in_(camp_ids)))
        backup_data["email_campaign_contacts"] = [serialize(item) for item in cc_res.scalars().all()]
        
        log_res = await db.execute(select(EmailLog).where(EmailLog.campaign_id.in_(camp_ids)))
        backup_data["email_logs"] = [serialize(item) for item in log_res.scalars().all()]
    else:
        backup_data["email_campaign_contacts"] = []
        backup_data["email_logs"] = []
        
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("backup.json", json.dumps(backup_data))
        
        for asset in backup_data.get("media_assets", []):
            if asset.get("file_path") and os.path.exists(asset["file_path"]):
                zip_file.write(asset["file_path"], arcname=f"media/{os.path.basename(asset['file_path'])}")
            if asset.get("thumbnail_path") and os.path.exists(asset["thumbnail_path"]):
                zip_file.write(asset["thumbnail_path"], arcname=f"thumbnails/{os.path.basename(asset['thumbnail_path'])}")
                
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=backup.zip"}
    )

@router.post("/restore")
async def restore_project(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    zip_bytes = await file.read()
    zip_buffer = io.BytesIO(zip_bytes)
    
    try:
        with zipfile.ZipFile(zip_buffer, "r") as zip_file:
            if "backup.json" not in zip_file.namelist():
                raise HTTPException(status_code=400, detail="Invalid backup file: backup.json missing")
            
            backup_data = json.loads(zip_file.read("backup.json"))
            project_data = backup_data.get("project")
            if not project_data:
                raise HTTPException(status_code=400, detail="Invalid backup file: project data missing")
                
            project_id = project_data["id"]
            
            # Check if project exists
            stmt = select(Project).where(Project.id == project_id)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=400, detail="A workspace with this exact ID already exists. Please delete it first before restoring.")
                
            os.makedirs(MEDIA_DIR, exist_ok=True)
            os.makedirs(THUMB_DIR, exist_ok=True)
            
            for name in zip_file.namelist():
                if name.startswith("media/") and name != "media/":
                    target_path = os.path.join(MEDIA_DIR, os.path.basename(name))
                    with open(target_path, "wb") as f:
                        f.write(zip_file.read(name))
                elif name.startswith("thumbnails/") and name != "thumbnails/":
                    target_path = os.path.join(THUMB_DIR, os.path.basename(name))
                    with open(target_path, "wb") as f:
                        f.write(zip_file.read(name))
            
            # Reconstruct project
            project = Project(**project_data)
            project.tenant_id = tenant.id
            if isinstance(project.created_at, str):
                project.created_at = datetime.fromisoformat(project.created_at)
            if isinstance(project.updated_at, str):
                project.updated_at = datetime.fromisoformat(project.updated_at)
            
            db.add(project)
            
            def parse_dates_and_tenant(d):
                for k, v in d.items():
                    if isinstance(v, str) and len(v) >= 19 and v[10] == 'T':
                        try:
                            d[k] = datetime.fromisoformat(v)
                        except:
                            pass
                if "tenant_id" in d:
                    d["tenant_id"] = tenant.id
                return d
            
            for ma_dict in backup_data.get("media_assets", []):
                if ma_dict.get("file_path"):
                    ma_dict["file_path"] = os.path.join(MEDIA_DIR, os.path.basename(ma_dict["file_path"]))
                if ma_dict.get("thumbnail_path"):
                    ma_dict["thumbnail_path"] = os.path.join(THUMB_DIR, os.path.basename(ma_dict["thumbnail_path"]))
            
            restore_order = [
                ("company_contexts", CompanyContext),
                ("company_products", CompanyProduct),
                ("social_platform_credentials", SocialPlatformCredential),
                ("connected_social_accounts", ConnectedSocialAccount),
                ("media_assets", MediaAsset),
                ("strategy_plans", StrategyPlan),
                ("content_ideas_results", ContentIdeasResult),
                ("scheduled_posts", ScheduledPost),
                ("post_analytics", PostAnalytics),
                ("contacts", Contact),
                ("email_templates", EmailTemplate),
                ("email_campaigns", EmailCampaign),
                ("email_campaign_contacts", EmailCampaignContact),
                ("email_logs", EmailLog)
            ]
            
            for key, model in restore_order:
                items = backup_data.get(key, [])
                for item_dict in items:
                    item_dict = parse_dates_and_tenant(item_dict)
                    db.add(model(**item_dict))
            
            await db.commit()
            return {"message": "Project restored successfully", "project_id": project.id}
            
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
"""

content = backup_pattern.sub(new_backup, content)

with open("c:/Utsav/ferolt/FastoClick/server/services/tenant/routes/projects.py", "w") as f:
    f.write(content)
