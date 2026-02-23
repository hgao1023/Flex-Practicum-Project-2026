"""
Hybrid RAG pipeline combining document retrieval, web search, and conversation memory.
"""
from typing import Optional

from backend.rag.retriever import search_documents
from backend.rag.generator import generate_response, generate_response_streaming
from backend.rag.web_search import search_web
from backend.rag.memory import add_message, get_conversation_history


def _format_docs(docs: list[dict]) -> str:
    """Format retrieved documents into context string."""
    if not docs:
        return ""
    parts = []
    for i, doc in enumerate(docs, 1):
        header = f"[{doc.get('company', '?')} | {doc.get('filing_type', '?')} | {doc.get('fiscal_year', '?')} {doc.get('quarter', '')}]"
        parts.append(f"--- Document {i} {header} ---\n{doc['content']}")
    return "\n\n".join(parts)


def _format_web_results(results: list[dict]) -> str:
    """Format web search results into context string."""
    if not results:
        return ""
    parts = []
    for r in results:
        parts.append(f"**{r.get('title', '')}**\n{r.get('description', '')}\nSource: {r.get('url', '')}")
    return "\n\n".join(parts)


async def process_query(
    query: str,
    mode: str = "rag",
    company_filter: Optional[str] = None,
    session_id: Optional[str] = None,
    n_results: int = 15,
) -> dict:
    """
    Process a user query through the hybrid pipeline.

    Args:
        query: User question
        mode: "rag" | "web" | "hybrid"
        company_filter: Optional company to filter by
        session_id: Optional session for conversation memory
        n_results: Number of documents to retrieve

    Returns:
        Dict with response, sources, mode used
    """
    context = ""
    web_context = ""
    sources = []

    if mode in ("rag", "hybrid"):
        docs = search_documents(query, company_filter=company_filter, n_results=n_results)
        context = _format_docs(docs)
        sources = [
            {
                "company": d.get("company"),
                "source": d.get("source"),
                "filing_type": d.get("filing_type"),
                "fiscal_year": d.get("fiscal_year"),
                "similarity": d.get("similarity"),
            }
            for d in docs[:5]
        ]

    if mode in ("web", "hybrid"):
        try:
            web_results = await search_web(query)
            web_context = _format_web_results(web_results)
        except Exception:
            web_context = ""

    # Include conversation history if session exists
    if session_id:
        history = get_conversation_history(session_id)
        if history:
            history_text = "\n".join(
                f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
                for m in history[-4:]
            )
            context = f"## Conversation Context\n{history_text}\n\n{context}"

    response = generate_response(query, context, web_context)

    if session_id:
        add_message(session_id, "user", query)
        add_message(session_id, "assistant", response)

    return {
        "response": response,
        "sources": sources,
        "mode": mode,
    }


def process_query_sync(
    query: str,
    mode: str = "rag",
    company_filter: Optional[str] = None,
    session_id: Optional[str] = None,
    n_results: int = 15,
) -> dict:
    """Synchronous version of process_query."""
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    process_query(query, mode, company_filter, session_id, n_results),
                )
                return future.result()
        else:
            return loop.run_until_complete(
                process_query(query, mode, company_filter, session_id, n_results)
            )
    except RuntimeError:
        return asyncio.run(
            process_query(query, mode, company_filter, session_id, n_results)
        )
