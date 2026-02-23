# AI Prompt: PDF & HTML Text Extraction Improvements

Copy and paste this prompt into your AI assistant to apply the extraction fixes to your codebase.

---

## Prompt

You are helping me update a text extraction pipeline for SEC 10-K filings and annual reports. Below are the key findings and required changes based on our Person 1 analysis. The main file to modify is the **extractor** (originally `extract_text.py`, now `extractor.py`).

### Context

We have a RAG (Retrieval-Augmented Generation) system that:
1. Extracts text from HTML (Flex 10-K filings) and PDF (Benchmark annual reports) files
2. Chunks and embeds text into ChromaDB
3. Queries via OpenAI GPT

### Problems Found

1. **Multi-column PDF text in wrong order**: PDF pages with 2-3 columns had text interleaved across columns instead of reading left-to-right within each column.
2. **Table extraction garbled**: Cash flow statements and financial tables were extracted as concatenated text without spaces or column alignment (e.g., `Cashflowsfromoperatingactivities:Netincome$68,229`).
3. **Missing word spacing in PDF**: Some PDFs (especially Benchmark annual reports) encode text without word boundaries at the PDF level, causing all words to merge together.

### Fixes to Apply

#### Fix 1: Use pdfplumber instead of PyPDF2

Replace any `PyPDF2` usage with `pdfplumber`. Add to requirements.txt:
```
pdfplumber>=0.10.0
```

#### Fix 2: Word-level extraction for proper spacing

Instead of `page.extract_text()`, use `page.extract_words()` to detect word boundaries:

```python
def _extract_page_text_words(page):
    """Extract page text using word-level detection for proper spacing."""
    try:
        words = page.extract_words(
            x_tolerance=3,
            y_tolerance=3,
            keep_blank_chars=False,
            extra_attrs=["top", "x0"],
        )
    except Exception:
        return page.extract_text(layout=True) or ""

    if not words:
        return page.extract_text(layout=True) or ""

    # Group words by line (similar y-position)
    lines_dict = {}
    for w in words:
        line_key = round(w["top"] / 3) * 3
        if line_key not in lines_dict:
            lines_dict[line_key] = []
        lines_dict[line_key].append(w)

    text_lines = []
    for key in sorted(lines_dict.keys()):
        line_words = sorted(lines_dict[key], key=lambda w: w["x0"])
        text_lines.append(" ".join(w["text"] for w in line_words))

    return "\n".join(text_lines)
```

#### Fix 3: Table extraction as Markdown

Use `page.find_tables()` and `page.extract_tables()` to detect and extract tables separately, then format as Markdown tables:

```python
def _extract_tables_from_page(page):
    """Extract all tables from a page as formatted markdown."""
    tables = page.extract_tables()
    formatted = []
    for table in (tables or []):
        if not table or not table[0]:
            continue
        # Clean cells
        cleaned = []
        for row in table:
            cleaned.append([(cell or "").strip().replace("\n", " ") for cell in row])
        # Build markdown
        num_cols = max(len(r) for r in cleaned)
        lines = []
        for i, row in enumerate(cleaned):
            padded = [row[j] if j < len(row) else "" for j in range(num_cols)]
            lines.append("| " + " | ".join(padded) + " |")
            if i == 0:
                lines.append("| " + " | ".join("---" for _ in range(num_cols)) + " |")
        formatted.append("\n".join(lines))
    return formatted
```

When extracting text, exclude table regions to avoid duplication:

```python
table_bboxes = [t.bbox for t in page.find_tables()]
if table_bboxes:
    filtered_page = page
    for bbox in table_bboxes:
        # Clip bbox to page bounds
        clipped = (
            max(bbox[0], page.bbox[0]), max(bbox[1], page.bbox[1]),
            min(bbox[2], page.bbox[2]), min(bbox[3], page.bbox[3]),
        )
        if clipped[2] > clipped[0] and clipped[3] > clipped[1]:
            filtered_page = filtered_page.outside_bbox(clipped)
    page_text = _extract_page_text_words(filtered_page)
else:
    page_text = _extract_page_text_words(page)
```

#### Fix 4: Post-processing for garbled text

Apply two post-processing steps after extraction:

```python
import re

def _collapse_spaced_chars(text):
    """Fix decorative text like 'S t o c k' -> 'Stock'."""
    output_lines = []
    for line in text.split("\n"):
        tokens = line.strip().split(" ")
        single_chars = sum(1 for t in tokens if len(t) == 1 and t.isalpha())
        if len(tokens) > 5 and single_chars > len(tokens) * 0.6:
            collapsed = ""
            i = 0
            while i < len(tokens):
                if len(tokens[i]) == 1 and tokens[i].isalpha():
                    word = tokens[i]
                    j = i + 1
                    while j < len(tokens) and len(tokens[j]) == 1 and tokens[j].isalpha():
                        word += tokens[j]
                        j += 1
                    collapsed += word + " "
                    i = j
                else:
                    collapsed += tokens[i] + " "
                    i += 1
            output_lines.append(collapsed.rstrip())
        else:
            output_lines.append(line)
    return "\n".join(output_lines)

def _fix_missing_spaces(text):
    """Insert spaces at camelCase and punctuation boundaries."""
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([.;,])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\)([A-Z])", r") \1", text)
    return text
```

Apply in order: `_collapse_spaced_chars()` first, then `_fix_missing_spaces()`.

#### Fix 5: Recursive file discovery

Support subfolders in input directories:

```python
import glob

def find_files(root_dir, extensions):
    """Recursively find files with given extensions."""
    found = []
    for ext in extensions:
        found.extend(glob.glob(os.path.join(root_dir, "**", f"*{ext}"), recursive=True))
    return sorted(set(found))
```

### Quality Metrics After Fixes

| File | Garbled Before | Garbled After | Improvement |
|------|---------------|--------------|-------------|
| Benchmark-2022 | 29.17% | 4.63% | -84% |
| Benchmark-2023 | 11.82% | 4.80% | -59% |
| Benchmark-2024 | 12.19% | 4.83% | -60% |
| Tables detected | 0 | 156 | +156 |

### Directory Structure

```
input_html/       -> HTML source files
input_pdf/        -> PDF source files
extracted_html/   -> Extracted .md from HTML
extracted_pdf/    -> Extracted .md from PDF
```

### Important Notes

- The `embed.py`, `ingest.py`, `query_rag.py` files keep the same core logic; only update directory paths from `extracted_text/` to `extracted_html/` + `extracted_pdf/`, and file extension from `.txt` to `.md`.
- The remaining ~4.8% garbled text in Benchmark PDFs is a **source PDF encoding issue**, not an extraction limitation. The PDF files themselves store text without proper word boundaries in the 10-K sections.
