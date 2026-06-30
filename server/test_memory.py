import asyncio
import os
import shutil
from shared.utils.memory_client import MemoryClient

async def main():
    tenant_id = "test_tenant_123"
    
    # Cleanup old test memory
    memory_path = os.path.join(os.path.dirname(__file__), "../data/memory")
    vector_path = os.path.join(memory_path, f"vector_{tenant_id}")
    graph_path = os.path.join(memory_path, f"graph_{tenant_id}.json")
    
    if os.path.exists(vector_path):
        shutil.rmtree(vector_path)
    if os.path.exists(graph_path):
        os.remove(graph_path)

    print("Initializing Dual Memory Client...")
    memory = MemoryClient(tenant_id)
    
    print("\nAdding Document 1...")
    await memory.add_document(
        text="The Summer 2024 campaign targeted millennial users and successfully achieved a 40% open rate using the 'FOMO' strategy.",
        metadata={"campaign": "summer_24"},
        entities=[
            {"source": "Summer 2024 Campaign", "target": "Millennial Users", "relation": "targeted"},
            {"source": "Summer 2024 Campaign", "target": "FOMO Strategy", "relation": "used"}
        ]
    )
    
    print("Adding Document 2...")
    await memory.add_document(
        text="The Winter 2025 campaign will focus heavily on retention and upselling existing premium users.",
        metadata={"campaign": "winter_25"},
        entities=[
            {"source": "Winter 2025 Campaign", "target": "Premium Users", "relation": "upsells"}
        ]
    )
    
    print("\n--- RETRIEVAL TEST: 'What do we know about the Summer 2024 Campaign?' ---")
    query = "What do we know about the Summer 2024 Campaign?"
    context = await memory.retrieve_context(query)
    print("\n[RETRIEVED CONTEXT]")
    print(context)
    
    print("\n--- RETRIEVAL TEST: 'Who did we target in Winter?' ---")
    query2 = "Who did we target in Winter?"
    context2 = await memory.retrieve_context(query2)
    print("\n[RETRIEVED CONTEXT]")
    print(context2)

if __name__ == "__main__":
    asyncio.run(main())
