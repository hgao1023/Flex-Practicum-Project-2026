"""
Document processing pipeline for new SEC filings.
Extracts text, chunks, embeds, and upserts into ChromaDB.
"""
import re
from pathlib import Path
from typing import Optional

from backend.core.database import get_collection, embed_texts


def _extract_text(filepath: Path) -> str:
    """Extract text from HTML or PDF files."""
    suffix = filepath.suffix.lower()

    if suffix in (".html", ".htm"):
        from bs4 import BeautifulSoup
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
        for el in soup(["script", "style", "head", "meta"]):
            el.decompose()
        return soup.get_text(separator="\n", strip=True)

    elif suffix == ".pdf":
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            if text.strip():
                return text
        except Exception:
            pass

        try:
            import PyPDF2
            text = ""
            with open(filepath, "rb") as f:
                for page in PyPDF2.PdfReader(f).pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
            return text
        except Exception:
            pass

    return ""


def _chunk_text(text: str, chunk_words: int = 250, overlap_words: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i:i + chunk_words]).strip())
        i += chunk_words - overlap_words
    return [c for c in chunks if len(c) > 50]


def process_filing(
    filepath: Path,
    company: str,
    filing_type: str,
    fiscal_year: str = "Unknown",
    quarter: str = "",
) -> int:
    """
    Process a single filing: extract, chunk, embed, and upsert into ChromaDB.

    Returns the number of chunks added.
    """
    text = _extract_text(filepath)
    if not text or len(text.strip()) < 100:
        return 0

    chunks = _chunk_text(text)
    if not chunks:
        return 0

    collection = get_collection()
    safe_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", filepath.stem)

    ids = []
    metadatas = []
    for i, chunk in enumerate(chunks):
        ids.append(f"{company}_{safe_stem}_chunk{i:04d}")
        metadatas.append({
            "company": company,
            "source_file": filepath.name,
            "filing_type": filing_type,
            "fiscal_year": fiscal_year,
            "quarter": quarter,
            "chunk_index": i,
            "total_chunks": len(chunks),
        })

    embeddings = embed_texts(chunks)

    # Upsert in batches
    batch_size = 64
    for start in range(0, len(chunks), batch_size):
        end = start + batch_size
        collection.upsert(
            ids=ids[start:end],
            embeddings=embeddings[start:end],
            documents=chunks[start:end],
            metadatas=metadatas[start:end],
        )

    return len(chunks)


def process_new_filings(filings: list[dict]) -> dict:
    """
    Process a batch of newly downloaded filings.

    Args:
        filings: List of dicts with keys: filepath, company, filing_type, etc.

    Returns:
        Summary dict with counts
    """
    total_files = 0
    total_chunks = 0
    errors = []

    for filing in filings:
        filepath = Path(filing.get("filepath", ""))
        if not filepath.exists():
            errors.append(f"File not found: {filepath}")
            continue

        try:
            chunks = process_filing(
                filepath=filepath,
                company=filing.get("company", "Unknown"),
                filing_type=filing.get("filing_type", "Unknown"),
                fiscal_year=filing.get("fiscal_year", "Unknown"),
                quarter=filing.get("quarter", ""),
            )
            total_files += 1
            total_chunks += chunks
            print(f"  Processed {filepath.name}: {chunks} chunks")
        except Exception as e:
            errors.append(f"{filepath.name}: {e}")

    return {
        "files_processed": total_files,
        "chunks_added": total_chunks,
        "errors": errors,
    }
