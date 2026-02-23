"""
Vector retrieval module for RAG pipeline.
Handles document search with year detection, recency boosting, and re-ranking.
"""
import re
from typing import Optional

from backend.core.database import get_collection, embed_text


def _extract_year_from_query(query: str) -> Optional[str]:
    """Extract a 4-digit year from the query string."""
    match = re.search(r'\b(20[1-3]\d)\b', query)
    if match:
        return match.group(1)

    fy_match = re.search(r'\bFY\s*(\d{2,4})\b', query, re.IGNORECASE)
    if fy_match:
        y = fy_match.group(1)
        if len(y) == 2:
            return f"20{y}"
        return y

    return None


def _fiscal_year_variants(year: str) -> list[str]:
    """Generate all common fiscal-year string variants for a given year."""
    short = year[-2:]
    return [
        year,
        f"FY{year}",
        f"FY{short}",
        f"fiscal {year}",
        f"fiscal year {year}",
        f"Fiscal Year {year}",
        f"FY {year}",
        f"FY {short}",
    ]


def _should_auto_detect_year(query: str) -> bool:
    """Determine whether the query contains an explicit year reference."""
    if re.search(r'\b(20[1-3]\d)\b', query):
        return True
    if re.search(r'\bFY\s*\d{2,4}\b', query, re.IGNORECASE):
        return True
    if re.search(r'\bfiscal\s+(year\s+)?\d{4}\b', query, re.IGNORECASE):
        return True
    return False


_RECENCY_KEYWORDS = {
    "latest", "recent", "newest", "most recent", "current", "last quarter",
    "this year", "this quarter", "updated", "new",
}


def _wants_latest(query: str) -> bool:
    """Check if the query implies the user wants the most recent data."""
    q_lower = query.lower()
    for kw in _RECENCY_KEYWORDS:
        if kw in q_lower:
            return True
    if re.search(r'\brecent\b', q_lower):
        return True
    return False


def _fy_sort_key(doc: dict) -> str:
    """Sort key that orders documents by fiscal year descending."""
    fy = doc.get("fiscal_year", "") or ""
    match = re.search(r'(\d{4})', str(fy))
    return match.group(1) if match else "0000"


def _quarter_sort_key(doc: dict) -> int:
    """Sort key that orders documents by quarter descending."""
    q = doc.get("quarter", "") or ""
    match = re.search(r'Q(\d)', str(q))
    return int(match.group(1)) if match else 0


def search_documents(
    query: str,
    company_filter: Optional[str] = None,
    filing_type_filter: Optional[str] = None,
    n_results: int = 20,
) -> list[dict]:
    """
    Search ChromaDB for relevant document chunks with re-ranking.

    Applies year boosting when a year is detected in the query and
    recency boosting when the query implies the user wants recent data.
    """
    collection = get_collection()
    if collection.count() == 0:
        return []

    query_embedding = embed_text(query)

    where_filter = None
    if company_filter and filing_type_filter:
        where_filter = {
            "$and": [
                {"company": company_filter},
                {"filing_type": filing_type_filter},
            ]
        }
    elif company_filter:
        where_filter = {"company": company_filter}
    elif filing_type_filter:
        where_filter = {"filing_type": filing_type_filter}

    fetch_n = min(n_results * 3, collection.count())

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_n,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_n,
            include=["documents", "metadatas", "distances"],
        )

    if not results or not results["documents"] or not results["documents"][0]:
        return []

    docs = []
    for doc_text, metadata, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        similarity = 1 - distance
        docs.append({
            "content": doc_text,
            "company": metadata.get("company", "Unknown"),
            "source": metadata.get("source_file", metadata.get("source", "Unknown")),
            "filing_type": metadata.get("filing_type", "Unknown"),
            "fiscal_year": metadata.get("fiscal_year", "Unknown"),
            "quarter": metadata.get("quarter", ""),
            "similarity": round(similarity, 4),
        })

    # Year boosting
    detected_year = _extract_year_from_query(query)
    if detected_year:
        variants = _fiscal_year_variants(detected_year)
        for doc in docs:
            fy = str(doc.get("fiscal_year", ""))
            if any(v.lower() in fy.lower() for v in variants):
                doc["similarity"] += 0.15

    # Recency boosting
    if _wants_latest(query):
        docs.sort(key=lambda d: (_fy_sort_key(d), _quarter_sort_key(d)), reverse=True)
        for i, doc in enumerate(docs):
            doc["similarity"] += max(0, 0.10 - i * 0.005)

    docs.sort(key=lambda d: d["similarity"], reverse=True)
    return docs[:n_results]


def search_by_company(
    query: str,
    company: str,
    n_results: int = 20,
) -> list[dict]:
    """Convenience wrapper to search within a single company."""
    return search_documents(query, company_filter=company, n_results=n_results)


def search_cross_company(
    query: str,
    n_results: int = 50,
) -> list[dict]:
    """Search across all companies without a company filter."""
    return search_documents(query, n_results=n_results)


def get_company_documents(company: str, limit: int = 100) -> list[dict]:
    """
    Retrieve raw document chunks for a company (no query embedding needed).

    Returns dicts with 'content' and 'metadata' keys, matching the format
    expected by analytics modules.
    """
    collection = get_collection()
    if collection.count() == 0:
        return []

    try:
        results = collection.get(
            where={"company": company},
            include=["documents", "metadatas"],
            limit=limit,
        )
    except Exception:
        return []

    docs = []
    for doc_text, metadata in zip(
        results.get("documents", []),
        results.get("metadatas", []),
    ):
        docs.append({
            "content": doc_text,
            "metadata": metadata,
        })

    return docs
