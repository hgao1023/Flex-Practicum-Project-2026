"""
Agentic RAG module with tool-use for multi-step retrieval.
Uses Claude tool calling to iteratively search documents and build comprehensive answers.
"""
import json
from typing import AsyncGenerator

import anthropic

from backend.core.config import ANTHROPIC_API_KEY, LLM_MODEL
from backend.rag.retriever import search_documents


TOOLS = [
    {
        "name": "search_documents",
        "description": (
            "Search the internal SEC filings and earnings transcript database. "
            "Use this to find information about company financials, CapEx, AI investments, "
            "revenue, guidance, and other business metrics. You can filter by company name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query describing the information you need",
                },
                "company_filter": {
                    "type": "string",
                    "description": "Optional company name to filter results (e.g. 'Flex', 'Jabil', 'Celestica', 'Benchmark', 'Sanmina')",
                },
                "n_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10)",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    }
]

SYSTEM_PROMPT = """You are an expert EMS industry analyst with access to a document search tool.
When asked to compare companies or answer questions requiring data from multiple sources, use the search_documents tool to gather information for EACH company separately.

Strategy:
1. For comparison queries, search for each company individually to get focused results.
2. Synthesize findings into a clear, structured answer with tables when appropriate.
3. Always specify the fiscal year/quarter when citing figures.
4. If data is missing for a company, note that explicitly.

You have a maximum of 3 tool-use rounds, so plan your searches efficiently."""


def _execute_tool(name: str, args: dict) -> str:
    """Execute a tool call and return the result as a string."""
    if name == "search_documents":
        docs = search_documents(
            query=args["query"],
            company_filter=args.get("company_filter"),
            n_results=args.get("n_results", 10),
        )
        if not docs:
            return "No documents found for this query."

        parts = []
        for d in docs:
            header = f"[{d['company']} | {d['filing_type']} | {d['fiscal_year']}"
            if d.get("quarter"):
                header += f" {d['quarter']}"
            header += "]"
            parts.append(f"{header}\n{d['content'][:800]}")
        return "\n\n---\n\n".join(parts)

    return f"Unknown tool: {name}"


def _make_serializable(content):
    """Ensure content blocks are JSON-serializable dicts (not SDK objects)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        out = []
        for block in content:
            if isinstance(block, dict):
                out.append(block)
            elif hasattr(block, "model_dump"):
                out.append(block.model_dump())
            elif hasattr(block, "__dict__"):
                out.append({k: v for k, v in block.__dict__.items() if not k.startswith("_")})
            else:
                out.append({"type": "text", "text": str(block)})
        return out
    if hasattr(content, "model_dump"):
        return [content.model_dump()]
    return [{"type": "text", "text": str(content)}]


async def agentic_stream(
    query: str,
    context: str = "",
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Agentic RAG generator that uses tool calling for multi-step retrieval.

    Yields (event_type, event_data) tuples suitable for SSE streaming.
    Max iterations: 3 to prevent runaway loops.
    """
    if not ANTHROPIC_API_KEY:
        yield ("token", {"text": "Error: ANTHROPIC_API_KEY is not configured."})
        return

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    messages = []
    if context:
        messages.append({
            "role": "user",
            "content": f"Background context:\n{context}\n\nQuestion: {query}",
        })
    else:
        messages.append({"role": "user", "content": query})

    max_iterations = 3

    for iteration in range(max_iterations):
        try:
            response = client.messages.create(
                model=LLM_MODEL,
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )
        except Exception as e:
            yield ("token", {"text": f"Error calling Claude: {e}"})
            return

        # Check if there are tool-use blocks
        tool_calls = [b for b in response.content if getattr(b, "type", None) == "tool_use"]

        if not tool_calls:
            # Final text response — stream it
            for block in response.content:
                if getattr(block, "type", None) == "text":
                    yield ("token", {"text": block.text})
            yield ("done", {})
            return

        # Process tool calls
        assistant_content = _make_serializable(response.content)
        messages.append({"role": "assistant", "content": assistant_content})

        tool_results = []
        for tc in tool_calls:
            tool_name = tc.name
            tool_input = tc.input if isinstance(tc.input, dict) else {}
            tool_id = tc.id

            yield ("step", {
                "icon": "🔧",
                "label": f"Tool: {tool_name}",
                "detail": json.dumps(tool_input, default=str)[:200],
            })

            result_text = _execute_tool(tool_name, tool_input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_id,
                "content": result_text[:4000],
            })

        messages.append({"role": "user", "content": tool_results})

    # If we exhausted iterations, do a final generation without tools
    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        for block in response.content:
            if getattr(block, "type", None) == "text":
                yield ("token", {"text": block.text})
    except Exception as e:
        yield ("token", {"text": f"Error in final generation: {e}"})

    yield ("done", {})
