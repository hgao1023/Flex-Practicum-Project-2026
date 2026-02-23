# Person 1 Findings: Text Extraction & PDF Parsing

## Overview

This document summarizes the issues found, fixes applied, and quality metrics for the text extraction pipeline used in the Flex 10-K RAG system.

**Files modified:** `extractor.py` (formerly `extract_text.py`)  
**Libraries used:** pdfplumber (replacing PyPDF2 for PDF parsing), BeautifulSoup (HTML parsing)

---

## Task 1: Set Up Test Environment

- Installed `pdfplumber>=0.10.0` (actual version: 0.11.8)
- Verified extraction scripts run successfully
- Tested on 5 HTML files (Flex 10-K 2021–2025) and 4 PDF files (Benchmark 2022–2024 Annual Reports + Flex Practicum Abstract)

**Input files tested:**

| File | Type | Size |
|------|------|------|
| Flex_10-K_2021-05-19.html | HTML | 3.1 MB |
| Flex_10-K_2022-05-20.html | HTML | 3.2 MB |
| Flex_10-K_2023-05-19.html | HTML | 3.2 MB |
| Flex_10-K_2024-05-17.html | HTML | 2.7 MB |
| Flex_10-K_2025-05-21.html | HTML | 2.6 MB |
| Benchmark-2022-Annual-Report.pdf | PDF | 2.8 MB |
| Benchmark-2023-Annual-Report.pdf | PDF | 4.5 MB |
| Benchmark-2024-Annual-Report.pdf | PDF | 4.2 MB |
| Flex Practicum Abstract v1.0.pdf | PDF | 0.1 MB |

---

## Task 2: Fix Multi-Column PDF Extraction

### Problem (Before)

The original extraction used `page.extract_text()` without layout awareness. Multi-column pages in Benchmark annual reports produced **text in wrong reading order** — left and right column content was interleaved incorrectly.

**Example (Before):**
```
EXECUTIVE OFFICERS INDEPENDENT REGISTERED Exchange under the symbol BHE.
PUBLIC ACCOUNTANTS
Jeffrey W. Benck (1)
Stock Transfer Agent and Registrar
President and KPMG LLP
```
Left column (Officers) and right column (Shareholder Data) were merged on the same lines.

### Fix Applied

1. Switched to **word-level extraction** using `page.extract_words()` with tuned `x_tolerance` and `y_tolerance`
2. Words are grouped by y-position (line detection) and sorted by x-position (left-to-right reading order)
3. Added **smart fallback**: if word-level extraction produces mostly single-character tokens (decorative pages), falls back to `extract_text(layout=True)`

### Result (After)
```
Stock Trading
Corporate and Shareholder Data
The common shares of Benchmark
Electronics, Inc. trade on the New York Stock Exchange under the symbol BHE.
```
Text now follows correct reading order within each column.

---

## Task 3: Improve Table Extraction

### Problem (Before)

Cash flow statements and financial tables were **garbled** — words concatenated without spaces, columns misaligned, numbers unreadable.

**Example (Before):**
```
Cashflowsfromoperatingactivities:
Netincome $ 68,229 $ 35,770 $ 14,055
Adjustmentstoreconcilenetincometonetcash
```

### Fix Applied

1. Used pdfplumber's `page.find_tables()` to detect table bounding boxes on each page
2. Used `page.extract_tables()` to extract table data as structured lists
3. Formatted tables as **Markdown tables** with proper column alignment
4. Extracted non-table text separately using `page.outside_bbox()` to avoid duplication
5. Added bbox clipping to handle tables extending beyond page boundaries

### Result (After)

Tables are now extracted as structured Markdown:

```
| (in thousands) | 2022 | 2021 | 2020 |
| --- | --- | --- | --- |
| Cash flows from operating activities: | | | |
| Net income | $ 68,229 | $ 35,770 | $ 14,055 |
```

**Tables detected across all PDFs: 156 total**
- Benchmark 2022: 4 tables
- Benchmark 2023: 85 tables
- Benchmark 2024: 67 tables

### Additional Fix: Missing Word Spacing

Many pages in the Benchmark PDFs had text stored without word boundaries at the PDF encoding level (all words concatenated). Applied two post-processing steps:

1. **Character-spaced text collapsing** — Decorative text like `S t o c k T r a d i n g` collapsed to `Stock Trading`
2. **CamelCase / punctuation boundary insertion** — Patterns like `theCompany` split to `the Company`, `operations.The` split to `operations. The`

---

## Task 4: Test and Validate Fixes

### Extraction Quality Metrics

Re-ran extraction on all 9 documents. Quality measured by **garbled word ratio** (words >40 characters that are not URLs, indicating concatenated/missing-space text).

#### HTML Files (Flex 10-K)

| File | Words | Garbled | Ratio | Tables | Quality |
|------|------:|--------:|------:|-------:|---------|
| Flex_10-K_2021-05-19.md | 64,133 | 2 | 0.00% | 0 | GOOD |
| Flex_10-K_2022-05-20.md | 63,895 | 2 | 0.00% | 0 | GOOD |
| Flex_10-K_2023-05-19.md | 62,095 | 2 | 0.00% | 0 | GOOD |
| Flex_10-K_2024-05-17.md | 63,101 | 2 | 0.00% | 0 | GOOD |
| Flex_10-K_2025-05-21.md | 61,209 | 1 | 0.00% | 0 | GOOD |

HTML extraction quality is excellent — near-zero garbled text.

#### PDF Files (Benchmark Annual Reports)

| File | Words | Garbled | Ratio | Tables | Quality |
|------|------:|--------:|------:|-------:|---------|
| Benchmark-2022-Annual-Report.md | 38,800 | 1,797 | 4.63% | 4 | FAIR |
| Benchmark-2023-Annual-Report.md | 38,530 | 1,850 | 4.80% | 85 | FAIR |
| Benchmark-2024-Annual-Report.md | 38,774 | 1,871 | 4.83% | 67 | FAIR |
| Flex Practicum Abstract v1.0.md | 551 | 22 | 3.99% | 0 | GOOD |

#### Overall Summary

| Metric | Before Fix | After Fix | Improvement |
|--------|-----------|-----------|-------------|
| Benchmark-2022 garbled ratio | 29.17% | 4.63% | -84% |
| Benchmark-2023 garbled ratio | 11.82% | 4.80% | -59% |
| Benchmark-2024 garbled ratio | 12.19% | 4.83% | -60% |
| Tables detected | 0 | 156 | +156 |
| Table format | garbled text | Markdown tables | structured |
| Multi-column reading order | incorrect | correct | fixed |

**Overall quality rating: FAIR (4.75% garbled)**

### Remaining Issues

1. **Benchmark PDF encoding limitation**: The 10-K sections embedded within Benchmark annual reports are encoded at the PDF level without proper word boundaries. Approximately 4.8% of words remain concatenated despite post-processing. This is a source PDF quality issue, not an extraction limitation.
2. **Cover page decorative text**: Some annual report cover pages use extremely wide letter-spacing for visual effect. The character collapse heuristic handles most cases but occasionally misses complex layouts.
3. **Financial statement number spacing**: Some numeric values in financial tables have extra character spacing (e.g., `$ 6 8 , 2 2 9`). The table extraction via `extract_tables()` handles this correctly when tables are detected, but some in-line numbers may still have spacing artifacts.

---

## Task 5: Deliverables

### Updated Files

| Deliverable | File | Description |
|-------------|------|-------------|
| Updated extractor | `extractor.py` | PDF (pdfplumber) + HTML (BeautifulSoup) extraction with table support, multi-column fix, quality metrics |
| Embedding pipeline | `embed.py` | Reads from `extracted_html/` + `extracted_pdf/`, outputs to ChromaDB |
| Ingestion pipeline | `ingest.py` | All-in-one: extract + chunk + embed |
| Query pipeline | `query_rag.py` | RAG query with OpenAI GPT |
| Startup script | `start.sh` | Supports `--full` (complete pipeline) and `--query` (daily use) |
| Dependencies | `requirements.txt` | Includes pdfplumber>=0.10.0 |
| This document | `Person1_Findings.md` | Findings, before/after comparison, quality metrics |

### Project Structure

```
Practicum_Test/
├── input_html/           # HTML source files (Flex 10-K)
├── input_pdf/            # PDF source files (Benchmark annual reports)
├── extracted_html/       # Extracted .md files from HTML
├── extracted_pdf/        # Extracted .md files from PDF
├── chromadb_store/       # Vector database (generated by embed.py)
├── extractor.py          # Step 1: HTML/PDF -> .md extraction
├── embed.py              # Step 2: .md -> ChromaDB embedding
├── ingest.py             # Combined Step 1+2
├── query_rag.py          # Step 3: RAG query interface
├── start.sh              # Startup script
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variable template
└── Person1_Findings.md   # This document
```

### How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Full pipeline (first time)
bash start.sh --full

# 3. Daily query (data already embedded)
bash start.sh --query
```
