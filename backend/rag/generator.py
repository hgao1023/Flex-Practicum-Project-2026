"""
LLM generation module for RAG pipeline.
Handles response generation using Anthropic Claude with context from retrieved documents.
"""
from typing import Optional
import anthropic

from backend.core.config import ANTHROPIC_API_KEY, LLM_MODEL


SYSTEM_PROMPT = """You are an expert competitive intelligence analyst specializing in the Electronics Manufacturing Services (EMS) industry. You analyze SEC filings, earnings transcripts, and financial data for Flex, Jabil, Celestica, Benchmark Electronics, and Sanmina.

Rules:
- Answer directly and concisely based on the provided context.
- Use tables when comparing companies or presenting multi-row data.
- Do NOT use inline citations like [1] or (Source: ...). The user knows the data comes from SEC filings.
- When asked about CapEx or capital expenditures, look for:
  * "capital expenditures" or "CapEx" mentions with dollar amounts
  * "purchases of property and equipment" or "property, plant and equipment"
  * Cash flow statement line items for investing activities
  * Any dollar amounts near these terms (e.g., "$X million", "$X billion")
- When data is unavailable, say so clearly rather than guessing.
- Use bullet points for lists, bold for emphasis, and keep responses focused.
- For financial figures, always include the unit (millions, billions) and fiscal period."""


def _build_prompt(query: str, context: str, web_context: str = "") -> str:
    """Build the user prompt combining query, RAG context, and optional web results."""
    parts = []
    if context:
        parts.append(f"## Retrieved Documents\n{context}")
    if web_context:
        parts.append(f"## Web Search Results\n{web_context}")
    parts.append(f"## Question\n{query}")
    return "\n\n".join(parts)


def generate_response(
    query: str,
    context: str,
    web_context: str = "",
) -> str:
    """
    Generate a response using Claude (blocking call).

    Args:
        query: The user question
        context: Retrieved document context
        web_context: Optional web search context

    Returns:
        Generated response text
    """
    if not ANTHROPIC_API_KEY:
        return "Error: ANTHROPIC_API_KEY is not configured."

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_prompt = _build_prompt(query, context, web_context)

    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text
    except Exception as e:
        return f"Error generating response: {e}"


def generate_response_streaming(
    query: str,
    context: str,
    web_context: str = "",
):
    """
    Generate a streaming response using Claude.

    Yields text chunks as they arrive from the API. Uses
    client.messages.stream with max_tokens=2000, no extended thinking.
    """
    if not ANTHROPIC_API_KEY:
        yield "Error: ANTHROPIC_API_KEY is not configured."
        return

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_prompt = _build_prompt(query, context, web_context)

    try:
        with client.messages.stream(
            model=LLM_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception as e:
        yield f"\n\nError during streaming: {e}"


def generate_summary(text: str) -> str:
    """
    Generate a brief summary of the given text.
    Useful for summarising long document chunks.
    """
    if not ANTHROPIC_API_KEY:
        return text[:500] + "..."

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=300,
            system="Summarize the following financial/business text in 2-3 concise sentences.",
            messages=[{"role": "user", "content": text[:8000]}],
        )
        return response.content[0].text
    except Exception as e:
        return text[:500] + "..."
