import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

def perform_web_search(query: str, max_results: int = 10, timelimit: str = "w") -> list[dict]:
    """
    Perform a live web search using DuckDuckGo.
    Returns a list of dicts with 'title', 'href', and 'body' (snippet).
    """
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, timelimit=timelimit):
                results.append(r)
        return results
    except Exception as e:
        logger.error(f"Failed to perform web search for query '{query}': {e}")
        return []

def perform_news_search(query: str, max_results: int = 10, timelimit: str = "w") -> list[dict]:
    """
    Perform a live news search using DuckDuckGo.
    Returns a list of dicts with 'title', 'url', 'body', 'date', 'source'.
    """
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.news(query, max_results=max_results, timelimit=timelimit):
                results.append(r)
        return results
    except Exception as e:
        logger.error(f"Failed to perform news search for query '{query}': {e}")
        return []
