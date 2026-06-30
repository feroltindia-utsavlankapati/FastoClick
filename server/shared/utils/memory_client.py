import os
import json
import logging
import networkx as nx
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Directory for local persistence
MEMORY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../data/memory")
os.makedirs(MEMORY_DIR, exist_ok=True)

class MemoryClient:
    """
    Dual Memory Module providing:
    1. Vector RAG: Unstructured semantic search via ChromaDB
    2. Graph RAG (Index Memory): Structured relational memory via NetworkX
    """
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        
        # 1. Initialize Vector DB (Chroma)
        self.chroma_client = chromadb.PersistentClient(
            path=os.path.join(MEMORY_DIR, f"vector_{tenant_id}")
        )
        self.collection = self.chroma_client.get_or_create_collection(name="tenant_memory")
        
        # 2. Initialize Graph DB (NetworkX)
        self.graph_path = os.path.join(MEMORY_DIR, f"graph_{tenant_id}.json")
        self.graph = nx.DiGraph()
        self._load_graph()

    def _load_graph(self):
        """Loads the graph from disk if it exists."""
        if os.path.exists(self.graph_path):
            try:
                with open(self.graph_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.graph = nx.node_link_graph(data)
            except Exception as e:
                logger.error(f"Failed to load graph memory: {e}")

    def _save_graph(self):
        """Persists the graph to disk."""
        try:
            data = nx.node_link_data(self.graph)
            with open(self.graph_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save graph memory: {e}")

    async def add_document(self, text: str, metadata: Dict[str, Any], entities: List[Dict[str, str]] = None):
        """
        Adds a document to both the Vector DB and the Graph DB.
        
        :param text: The raw unstructured text content.
        :param metadata: Metadata dictionary (e.g. source, campaign_id).
        :param entities: List of dicts representing relationships:
                         [{"source": "AgentA", "target": "StrategyX", "relation": "used"}]
        """
        # 1. Add to Vector RAG
        doc_id = str(hash(text))
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        # 2. Add to Graph RAG
        if entities:
            for rel in entities:
                src = rel.get("source")
                tgt = rel.get("target")
                relation = rel.get("relation", "related_to")
                
                if src and tgt:
                    self.graph.add_node(src)
                    self.graph.add_node(tgt)
                    self.graph.add_edge(src, tgt, relation=relation, metadata=metadata)
            
            self._save_graph()

    async def retrieve_context(self, query: str, n_results: int = 3) -> str:
        """
        Retrieves context using both semantic search and graph traversal.
        """
        context_parts = []

        # 1. Vector Retrieval
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            if results and results.get("documents") and results["documents"][0]:
                context_parts.append("--- UNSTRUCTURED MEMORY (Vector RAG) ---")
                for doc in results["documents"][0]:
                    context_parts.append(doc)
        except Exception as e:
            logger.error(f"Vector search failed: {e}")

        # 2. Graph Retrieval (Naive extraction of entities from query)
        # In a real setup, use an LLM/NER to extract entities from the query first.
        # Here we do a basic keyword match against graph nodes.
        graph_context = []
        for node in self.graph.nodes():
            if str(node).lower() in query.lower():
                # Get neighbors
                neighbors = list(self.graph.successors(node)) + list(self.graph.predecessors(node))
                for neighbor in neighbors:
                    # Look up edge data
                    if self.graph.has_edge(node, neighbor):
                        rel = self.graph.edges[node, neighbor].get("relation", "related to")
                        graph_context.append(f"{node} {rel} {neighbor}")
                    if self.graph.has_edge(neighbor, node):
                        rel = self.graph.edges[neighbor, node].get("relation", "related to")
                        graph_context.append(f"{neighbor} {rel} {node}")

        if graph_context:
            context_parts.append("--- STRUCTURED MEMORY (Graph RAG) ---")
            # Remove duplicates
            context_parts.extend(list(set(graph_context)))

        if not context_parts:
            return "No historical context found."

        return "\n".join(context_parts)
