import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from shared.utils.ai_integration import AIClient
from shared.utils.web_search import perform_news_search, perform_web_search

logger = logging.getLogger(__name__)

# Global In-Memory Cache
_trend_cache: Dict[str, tuple[Dict[str, Any], datetime]] = {}
CACHE_TTL = timedelta(hours=4)

async def analyze_trends_live(tenant_id: str, platform: str, country: str, state: str, city: str, niche: str = "") -> Dict[str, Any]:
    """
    Uses web search and LLM to analyze live trends for a specific platform and location.
    """
    # 1. Check Cache
    cache_key = f"{platform}_{country}_{state}_{city}_{niche}".lower()
    if cache_key in _trend_cache:
        cached_data, timestamp = _trend_cache[cache_key]
        if datetime.now() - timestamp < CACHE_TTL:
            logger.info(f"Returning cached trends for {cache_key}")
            return cached_data

    # 2. Build search query
    location_parts = [p for p in [city, state, country] if p]
    location_str = ", ".join(location_parts) if location_parts else "Global"
    
    current_date = datetime.now().strftime("%B %d, %Y")
    
    niche_str = f" {niche}" if niche else ""
    base_query = f"trending{niche_str} topics {platform} {location_str}"
    
    # Agentic Reasoning Loop (Max 2 attempts)
    max_attempts = 2
    for attempt in range(max_attempts):
        if attempt == 0:
            query = base_query
        else:
            # Broaden query on second attempt
            query = f"viral {niche_str} {platform} {location_str}"
            
        logger.info(f"Attempt {attempt+1}: Performing web search for trends: {query}")
    
        # 2. Execute Web Search
        web_results = perform_web_search(query, max_results=5, timelimit="w")
        news_results = perform_news_search(query, max_results=3, timelimit="w")
        
        combined_results = []
        for r in web_results:
            combined_results.append(f"Source: {r.get('title')} - {r.get('body')}")
        for r in news_results:
            combined_results.append(f"News: {r.get('title')} - {r.get('body')}")
            
        if not combined_results:
            return {
                "trending_topics": [],
                "trending_styles": [],
                "trending_music": [],
                "growth_tips": ["Search engine rate limit hit (403). Please wait a minute and try again."]
            }
            
        search_context = "\n".join(combined_results)
    
        # 3. Prompt the LLM
        system_prompt = (
            "You are an elite Social Media Trend Analyst. You have direct access to live search results.\n"
            "Analyze the provided search context and your own knowledge to synthesize the current real-time trends.\n"
            "Return the response strictly as valid JSON without markdown formatting."
        )
        
        prompt = f"""
        Today's date is {current_date}.
        Analyze the REAL CURRENT trends for {platform} in {location_str}. Do not invent old trends.
        
        Here is the live web search context we just pulled:
        {search_context}
        
        Based on the live data and your knowledge, provide a JSON object with EXACTLY the following structure:
        {{
            "insufficient_data": false, // Set to true ONLY if the search context is completely irrelevant or empty
            "trending_topics": [
                {{"topic": "Name of topic/hashtag", "context": "Why it's trending", "engagement_level": "High/Medium"}}
            ],
            "trending_styles": [
                {{"style": "Name of visual style/format", "description": "How to execute it"}}
            ],
            "trending_music": [
                {{
                    "track_or_genre": "EXACT Name of specific track or trending sound",
                    "vibe": "What emotion it conveys",
                    "spotify_link": "https://open.spotify.com/search/...",
                    "youtube_link": "https://www.youtube.com/results?search_query=..."
                }}
            ],
            "growth_tips": [
                "Tip 1 specific to this platform and location",
                "Tip 2 specific to this platform and location"
            ]
        }}
        """
        
        try:
            raw_response = await AIClient.generate_completion(tenant_id, prompt, system_prompt)
            
            # Clean JSON
            cleaned = raw_response
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
                
            parsed = json.loads(cleaned)
            
            if parsed.get("insufficient_data", False) and attempt < max_attempts - 1:
                logger.warning(f"LLM reported insufficient data for query '{query}'. Retrying with broader query.")
                continue # Try loop again with broader query
            
            # Successful parsing and sufficient data
            _trend_cache[cache_key] = (parsed, datetime.now())
            return parsed
            
        except Exception as e:
            logger.error(f"Failed to analyze trends: {e}")
            if attempt == max_attempts - 1:
                return {
                    "trending_topics": [],
                    "trending_styles": [],
                    "trending_music": [],
                    "growth_tips": [f"Could not load trends due to an error: {e}"]
                }


async def generate_idea_from_trend(tenant_id: str, platform: str, trend_topic: str) -> Dict[str, Any]:
    """
    Generates a specific content idea based on a single trend topic.
    """
    system_prompt = (
        "You are an elite Social Media Content Creator.\n"
        "Generate a highly engaging content idea based on a specific trending topic.\n"
        "Return the response strictly as valid JSON without markdown formatting."
    )
    
    prompt = f"""
    The current trending topic on {platform} is: "{trend_topic}"
    
    Generate a highly actionable content idea that capitalizes on this trend.
    Return a JSON object with EXACTLY the following structure:
    {{
        "title": "Catchy title for the content piece",
        "description": "Step by step description of the video/post",
        "caption_hook": "A strong hook for the first line of the caption",
        "format": "e.g., Reel, Carousel, Tweet, Short",
        "impact": "Expected impact"
    }}
    """
    
    try:
        raw_response = await AIClient.generate_completion(tenant_id, prompt, system_prompt)
        
        # Clean JSON
        cleaned = raw_response
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        parsed = json.loads(cleaned)
        return parsed
    except Exception as e:
        logger.error(f"Failed to generate content idea from trend: {e}")
        return {
            "title": "Error generating idea",
            "description": str(e),
            "caption_hook": "",
            "format": "Post",
            "impact": "None"
        }
