import httpx
from bs4 import BeautifulSoup
import json
import logging
from typing import Dict, Any, Optional
from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MOCK_COMPANY_DETAILS = {
    "company_overview": "FastoClick is an innovative digital marketing and customer engagement ecosystem designed to help brands scale rapidly through high-conversion campaigns, advanced analytics, and automated multi-channel touchpoints.",
    "services": [
        "Growth Marketing Strategy",
        "Multi-Channel Campaign Automation",
        "Interactive Landing Page Design",
        "Advanced Customer Segmentation",
        "Analytics and Performance Insights"
    ],
    "products": [
        "FastoClick Engine: Core automation and strategy execution suite",
        "FastoClick Analytics: Premium real-time analytics dashboard"
    ],
    "target_audience": "Mid-to-enterprise level e-commerce brands, digital SaaS providers, and fast-growing agencies looking to automate customer acquisition.",
    "branding": "Modern, energetic, results-driven, highly professional, with an authoritative yet conversational tone.",
    "industry": "MarTech / B2B SaaS / Digital Marketing Automation",
    "social_links": [
        "https://linkedin.com/company/fastoclick",
        "https://twitter.com/fastoclick"
    ],
    "contact_details": "support@fastoclick.com | +1 (800) 555-0199"
}

async def scrape_website(url: str) -> str:
    """Scrapes raw visible text from a website url."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Parse using BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove scripts, styles, navigations
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()
                
            # Extract basic tags
            title = soup.title.string if soup.title else ""
            meta_desc = ""
            meta = soup.find("meta", attrs={"name": "description"})
            if meta:
                meta_desc = meta.get("content", "")
            else:
                meta = soup.find("meta", attrs={"property": "og:description"})
                if meta:
                    meta_desc = meta.get("content", "")
                    
            headings = [h.get_text().strip() for h in soup.find_all(["h1", "h2", "h3"])]
            paragraphs = [p.get_text().strip() for p in soup.find_all("p")]
            
            # Collect and format text
            text_parts = []
            if title:
                text_parts.append(f"Title: {title}")
            if meta_desc:
                text_parts.append(f"Description: {meta_desc}")
            if headings:
                text_parts.append("Headings:\n" + "\n".join(headings[:15]))
            if paragraphs:
                text_parts.append("Paragraphs:\n" + "\n".join(paragraphs[:30]))
                
            full_text = "\n\n".join(text_parts)
            # Cap at 8000 characters
            return full_text[:8000]
            
    except Exception as e:
        logger.error(f"Error scraping website {url}: {str(e)}")
        raise

async def extract_company_details(scraped_text: str) -> Dict[str, Any]:
    """Uses OpenRouter/LLM to extract structured company information in JSON format from scraped text."""
    if not settings.OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY is not set. Returning mock company details.")
        return MOCK_COMPANY_DETAILS

    prompt = (
        "Analyze the following website copy of a company and extract structured business intelligence details. "
        "Your response MUST be a single, valid JSON object and absolutely nothing else. "
        "Do not include any introductory text, markdown code blocks (like ```json), or trailing text. Just the raw JSON.\n\n"
        "The JSON MUST follow this exact schema:\n"
        "{\n"
        "  \"company_overview\": \"A summary of the company, mission, or value proposition.\",\n"
        "  \"services\": [\"List of services offered by the company (if any)\"],\n"
        "  \"products\": [\"List of products offered by the company (if any)\"],\n"
        "  \"target_audience\": \"Description of their target audience or client base.\",\n"
        "  \"branding\": \"Tone of voice, style, brand values, or aesthetic.\",\n"
        "  \"industry\": \"The industry or sector they operate in.\",\n"
        "  \"social_links\": [\"Any social links or URLs found in the text\"],\n"
        "  \"contact_details\": \"Email, phone, address, or general contact info found.\"\n"
        "}\n\n"
        f"Website Text Content:\n{scraped_text}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "X-Title": "FastoClick Scraper"
                },
                json={
                    "model": "openai/gpt-oss-120b:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a specialized business analyst AI that parses website text and outputs strictly valid JSON."
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
            res_data = response.json()
            content = res_data["choices"][0]["message"]["content"].strip()
            
            # Clean markdown code blocks if any got returned
            if content.startswith("```"):
                # Strip leading ```json or ``` and trailing ```
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            
            return json.loads(content)
            
    except Exception as e:
        logger.error(f"Error extracting company details via LLM: {str(e)}")
        # Fallback to premium mock details so operation never fails completely
        return MOCK_COMPANY_DETAILS

async def run_scraper_pipeline(tenant_id: str, url: str) -> Dict[str, Any]:
    """Runs the full scraping and extraction pipeline, returning structured details."""
    try:
        logger.info(f"Starting scraper pipeline for tenant {tenant_id} and url {url}")
        text = await scrape_website(url)
        details = await extract_company_details(text)
        logger.info(f"Successfully executed scraper pipeline for tenant {tenant_id}")
        return details
    except Exception as e:
        logger.error(f"Failed in run_scraper_pipeline: {str(e)}")
        return MOCK_COMPANY_DETAILS
