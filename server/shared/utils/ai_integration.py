import httpx
import logging
from typing import Optional
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import CompanyContext
from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class AIClient:
    """
    Centralized AI Integration Service that pulls company context
    and injects it into AI requests.
    """
    @staticmethod
    async def get_company_context(tenant_id: str) -> str:
        """Fetches and formats the company context from the DB."""
        async with async_session_maker() as session:
            result = await session.execute(select(CompanyContext).where(CompanyContext.tenant_id == tenant_id))
            context = result.scalars().first()
            
            if not context:
                return "No company context provided."
                
            context_parts = ["--- COMPANY CONTEXT ---"]
            if context.link:
                context_parts.append(f"Website/Link: {context.link}")
            if context.focus:
                context_parts.append(f"Primary Focus: {context.focus}")
            if context.product_details:
                context_parts.append(f"Products: {context.product_details}")
            if context.service_details:
                context_parts.append(f"Services: {context.service_details}")
            if context.company_details:
                context_parts.append(f"General Details: {context.company_details}")
            if context.extracted_document_text:
                # Limit extracted text to avoid exceeding token limits, e.g., max 10000 chars
                text = context.extracted_document_text[:10000]
                context_parts.append(f"Extracted Documents:\n{text}")
                
            return "\n".join(context_parts)

    @staticmethod
    async def generate_completion(tenant_id: str, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generates a completion using OpenRouter and injects company context."""
        company_info = await AIClient.get_company_context(tenant_id)
        
        base_system = system_prompt or "You are an AI assistant that processes and uses company context."
        
        full_system_prompt = (
            f"{base_system}\n\n"
            "Always use the following stored company memory/context in your responses when relevant:\n"
            f"{company_info}"
        )
        
        if not settings.OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY is not set. Returning mock response.")
            return f"[MOCK AI RESPONSE based on context: {company_info[:100]}...]"
            
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                logger.info(f"Sending prompt to OpenRouter for tenant {tenant_id}")
                
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "X-Title": "FastoClick"
                    },
                    json={
                        "model": "openai/gpt-oss-120b:free",
                        "messages": [
                            {
                                "role": "system",
                                "content": full_system_prompt
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.1
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"AI Completion Error: {str(e)}")
            raise
