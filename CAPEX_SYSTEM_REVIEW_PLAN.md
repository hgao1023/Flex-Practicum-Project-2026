# CapEx Intelligence System - Code Review & Improvement Plan

> **Team Size:** 3 people  
> **System:** Python + Ollama (llama3.1:8b) + ChromaDB + Streamlit  
> **Goal:** Systematically identify and fix accuracy issues

---

## Table of Contents
1. [Part 1: Person 1 - Text Extraction & Classification Review](#part-1-person-1---text-extraction--classification-review)
2. [Part 2: Person 2 - RAG & Vector Search Review](#part-2-person-2---rag--vector-search-review)
3. [Part 3: Person 3 - AI Extraction & Data Quality Review](#part-3-person-3---ai-extraction--data-quality-review)
4. [Part 4: Accuracy Measurement Framework](#part-4-accuracy-measurement-framework)
5. [Part 5: Issue Prioritization](#part-5-issue-prioritization)

---

# PART 1: Person 1 - Text Extraction & Classification Review

## 1.1 Files to Review

```
project/
├── extraction/
│   ├── pdf_extractor.py          # PRIMARY - PDF text extraction
│   ├── html_extractor.py         # HTML/web content extraction
│   ├── table_extractor.py        # Table extraction logic
│   └── document_classifier.py    # Document type classification
├── processors/
│   ├── text_cleaner.py           # Text preprocessing
│   ├── chunker.py                # Text chunking logic
│   └── metadata_extractor.py     # Fiscal year, quarter extraction
├── utils/
│   └── file_handlers.py          # File I/O operations
└── tests/
    └── test_extraction.py        # Existing tests
```

## 1.2 Review Checklist

### A. PDF/HTML Text Extraction Quality

| Check | Status | Notes |
|-------|--------|-------|
| Multi-column text extracted in correct reading order | ☐ | |
| Tables extracted with structure preserved | ☐ | |
| Headers/footers properly excluded | ☐ | |
| Page numbers removed | ☐ | |
| Special characters handled (§, ®, ™, ©) | ☐ | |
| Unicode characters preserved | ☐ | |
| Footnotes linked to correct context | ☐ | |
| Embedded images with text (OCR needed?) | ☐ | |
| Scanned PDFs handled | ☐ | |
| Password-protected PDFs handled | ☐ | |

### B. Document Classification Accuracy

| Check | Status | Notes |
|-------|--------|-------|
| 10-K vs 10-Q correctly distinguished | ☐ | |
| 8-K filings identified | ☐ | |
| Proxy statements (DEF 14A) identified | ☐ | |
| Press releases identified | ☐ | |
| Earnings presentations identified | ☐ | |
| Company name extraction accurate | ☐ | |
| Ticker symbol extraction accurate | ☐ | |
| Fiscal year correctly identified | ☐ | |
| Quarter correctly identified | ☐ | |
| Filing date extracted | ☐ | |

### C. Code Quality Issues

| Check | Status | Notes |
|-------|--------|-------|
| Error handling for corrupted files | ☐ | |
| Memory management for large PDFs | ☐ | |
| Timeout handling for slow extractions | ☐ | |
| Logging implemented | ☐ | |
| Hard-coded paths removed | ☐ | |
| Hard-coded company names removed | ☐ | |
| Unit tests exist | ☐ | |
| Type hints used | ☐ | |

## 1.3 Test Cases to Run

### Test Case 1: Multi-Column PDF Extraction

```python
# test_multicolumn.py
import pytest
from extraction.pdf_extractor import extract_text

def test_multicolumn_extraction():
    """Test that multi-column PDFs are extracted in correct reading order."""
    
    # Use a known 10-K with multi-column layout
    test_file = "test_data/flex_10k_2024.pdf"
    
    extracted_text = extract_text(test_file)
    
    # Check that a sentence that spans columns is correctly joined
    # In the original PDF: "Capital expenditures were" (col 1) "$505 million" (col 2)
    expected_phrase = "Capital expenditures were $505 million"
    
    assert expected_phrase in extracted_text, \
        f"Multi-column text not properly joined. Looking for: {expected_phrase}"
    
    # Check reading order - "Item 7" should come before "Item 8"
    item7_pos = extracted_text.find("Item 7")
    item8_pos = extracted_text.find("Item 8")
    
    assert item7_pos < item8_pos, "Reading order incorrect: Item 8 appears before Item 7"

def test_multicolumn_numbers_preserved():
    """Ensure numbers aren't split across columns."""
    
    test_file = "test_data/flex_10k_2024.pdf"
    extracted_text = extract_text(test_file)
    
    # Check that dollar amounts are complete (not split like "$505" and "million")
    import re
    
    # Pattern for complete dollar amounts
    dollar_pattern = r'\$[\d,]+(?:\.\d+)?\s*(?:million|billion|thousand)?'
    matches = re.findall(dollar_pattern, extracted_text, re.IGNORECASE)
    
    assert len(matches) > 0, "No complete dollar amounts found"
    
    # Check for orphaned "million" or "billion" without preceding number
    orphan_pattern = r'(?<!\d\s)(?<![\d,]\s)(million|billion)\b'
    orphans = re.findall(orphan_pattern, extracted_text, re.IGNORECASE)
    
    assert len(orphans) < 5, f"Too many orphaned units found: {orphans[:5]}"
```

### Test Case 2: Table Extraction

```python
# test_table_extraction.py
import pytest
from extraction.table_extractor import extract_tables

def test_financial_table_extraction():
    """Test extraction of financial tables from cash flow statement."""
    
    test_file = "test_data/flex_10k_2024.pdf"
    
    tables = extract_tables(test_file)
    
    # Find cash flow statement table
    cash_flow_table = None
    for table in tables:
        if "cash flow" in str(table).lower() or "operating activities" in str(table).lower():
            cash_flow_table = table
            break
    
    assert cash_flow_table is not None, "Cash flow statement table not found"
    
    # Check structure
    assert len(cash_flow_table) > 5, "Table has too few rows"
    
    # Check for expected line items
    table_text = str(cash_flow_table).lower()
    expected_items = [
        "net income",
        "depreciation",
        "capital expenditures",
    ]
    
    for item in expected_items:
        assert item in table_text, f"Expected line item '{item}' not found in table"

def test_table_numeric_values():
    """Test that numeric values in tables are correctly extracted."""
    
    test_file = "test_data/flex_10k_2024.pdf"
    tables = extract_tables(test_file)
    
    # Find a table with known values
    for table in tables:
        table_str = str(table)
        
        # Check for proper number formatting
        # Numbers should not have spaces in wrong places: "1 ,234" is wrong
        import re
        bad_number_pattern = r'\d\s+,\s*\d'
        bad_matches = re.findall(bad_number_pattern, table_str)
        
        assert len(bad_matches) == 0, f"Malformed numbers found: {bad_matches}"
```

### Test Case 3: Document Classification

```python
# test_classification.py
import pytest
from extraction.document_classifier import classify_document

# Ground truth test cases
CLASSIFICATION_TEST_CASES = [
    {
        "file": "test_data/flex_10k_2024.pdf",
        "expected": {
            "company": "Flex Ltd",
            "ticker": "FLEX",
            "doc_type": "10-K",
            "fiscal_year": 2024,
            "quarter": None,  # 10-K is annual
        }
    },
    {
        "file": "test_data/jabil_10q_q2_2024.pdf",
        "expected": {
            "company": "Jabil Inc",
            "ticker": "JBL",
            "doc_type": "10-Q",
            "fiscal_year": 2024,
            "quarter": 2,
        }
    },
    {
        "file": "test_data/celestica_8k_2024.pdf",
        "expected": {
            "company": "Celestica Inc",
            "ticker": "CLS",
            "doc_type": "8-K",
            "fiscal_year": 2024,
            "quarter": None,
        }
    },
]

@pytest.mark.parametrize("test_case", CLASSIFICATION_TEST_CASES)
def test_document_classification(test_case):
    """Test document classification accuracy."""
    
    result = classify_document(test_case["file"])
    expected = test_case["expected"]
    
    errors = []
    
    for field, expected_value in expected.items():
        actual_value = result.get(field)
        if actual_value != expected_value:
            errors.append(f"{field}: expected '{expected_value}', got '{actual_value}'")
    
    assert len(errors) == 0, f"Classification errors:\n" + "\n".join(errors)

def test_10k_vs_10q_distinction():
    """Specifically test 10-K vs 10-Q distinction."""
    
    # These are often confused because they have similar structure
    test_cases = [
        ("test_data/flex_10k_2024.pdf", "10-K"),
        ("test_data/flex_10q_q1_2024.pdf", "10-Q"),
        ("test_data/flex_10q_q2_2024.pdf", "10-Q"),
        ("test_data/flex_10q_q3_2024.pdf", "10-Q"),
    ]
    
    errors = []
    for file_path, expected_type in test_cases:
        result = classify_document(file_path)
        if result.get("doc_type") != expected_type:
            errors.append(f"{file_path}: expected {expected_type}, got {result.get('doc_type')}")
    
    assert len(errors) == 0, f"10-K/10-Q distinction errors:\n" + "\n".join(errors)
```

## 1.4 Accuracy Metrics

### Classification Accuracy Calculation

```python
# metrics/classification_accuracy.py
from dataclasses import dataclass
from typing import Dict, List
import json

@dataclass
class ClassificationResult:
    file: str
    field: str
    expected: str
    actual: str
    correct: bool

def calculate_classification_accuracy(
    ground_truth_file: str,
    classifier_func
) -> Dict:
    """
    Calculate classification accuracy across all fields.
    
    Args:
        ground_truth_file: JSON file with expected classifications
        classifier_func: Function that takes file path and returns classification
    
    Returns:
        Dictionary with accuracy metrics
    """
    
    with open(ground_truth_file, 'r') as f:
        ground_truth = json.load(f)
    
    results: List[ClassificationResult] = []
    field_correct = {}
    field_total = {}
    
    for entry in ground_truth:
        file_path = entry["file"]
        expected = entry["expected"]
        
        try:
            actual = classifier_func(file_path)
        except Exception as e:
            # Count as wrong for all fields
            for field in expected:
                results.append(ClassificationResult(
                    file=file_path,
                    field=field,
                    expected=str(expected[field]),
                    actual=f"ERROR: {e}",
                    correct=False
                ))
            continue
        
        for field, expected_value in expected.items():
            actual_value = actual.get(field)
            correct = actual_value == expected_value
            
            results.append(ClassificationResult(
                file=file_path,
                field=field,
                expected=str(expected_value),
                actual=str(actual_value),
                correct=correct
            ))
            
            field_correct[field] = field_correct.get(field, 0) + (1 if correct else 0)
            field_total[field] = field_total.get(field, 0) + 1
    
    # Calculate metrics
    field_accuracy = {
        field: field_correct[field] / field_total[field] * 100
        for field in field_total
    }
    
    overall_correct = sum(1 for r in results if r.correct)
    overall_accuracy = overall_correct / len(results) * 100 if results else 0
    
    return {
        "overall_accuracy": round(overall_accuracy, 2),
        "field_accuracy": {k: round(v, 2) for k, v in field_accuracy.items()},
        "total_tests": len(results),
        "total_correct": overall_correct,
        "errors": [
            {
                "file": r.file,
                "field": r.field,
                "expected": r.expected,
                "actual": r.actual
            }
            for r in results if not r.correct
        ]
    }

# Usage
if __name__ == "__main__":
    from extraction.document_classifier import classify_document
    
    results = calculate_classification_accuracy(
        "test_data/ground_truth_classification.json",
        classify_document
    )
    
    print(f"Overall Accuracy: {results['overall_accuracy']}%")
    print("\nField-level Accuracy:")
    for field, acc in results['field_accuracy'].items():
        print(f"  {field}: {acc}%")
    
    if results['errors']:
        print(f"\nErrors ({len(results['errors'])}):")
        for error in results['errors'][:10]:
            print(f"  {error['file']}: {error['field']} - expected '{error['expected']}', got '{error['actual']}'")
```

## 1.5 Common Issues to Look For

### Issue 1: PyPDF2 Multi-Column Extraction

**Problem:** PyPDF2 extracts text left-to-right across the page, not column-by-column.

```python
# BAD - Default PyPDF2 extraction
from PyPDF2 import PdfReader

def extract_text_bad(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()  # This often garbles multi-column text
    return text

# GOOD - Use pdfplumber or layout-aware extraction
import pdfplumber

def extract_text_good(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Extract with layout preservation
            text += page.extract_text(layout=True) or ""
    return text

# BETTER - Use layout analysis
def extract_text_best(pdf_path):
    import pdfplumber
    
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Detect columns based on whitespace
            width = page.width
            
            # Try to detect if page has multiple columns
            chars = page.chars
            if chars:
                x_positions = [c['x0'] for c in chars]
                
                # If there's a gap in the middle, it's likely multi-column
                mid_point = width / 2
                left_chars = [x for x in x_positions if x < mid_point - 50]
                right_chars = [x for x in x_positions if x > mid_point + 50]
                
                if left_chars and right_chars:
                    # Extract left column first, then right
                    left_bbox = (0, 0, mid_point, page.height)
                    right_bbox = (mid_point, 0, width, page.height)
                    
                    left_text = page.within_bbox(left_bbox).extract_text() or ""
                    right_text = page.within_bbox(right_bbox).extract_text() or ""
                    
                    text_parts.append(left_text + "\n" + right_text)
                else:
                    text_parts.append(page.extract_text() or "")
            else:
                text_parts.append(page.extract_text() or "")
    
    return "\n".join(text_parts)
```

### Issue 2: 10-K vs 10-Q Confusion

**Problem:** Document type misclassified due to similar structure.

```python
# BAD - Simple keyword matching
def classify_doc_type_bad(text):
    if "10-K" in text:
        return "10-K"
    elif "10-Q" in text:
        return "10-Q"
    return "Unknown"

# GOOD - Check for definitive markers
def classify_doc_type_good(text):
    text_upper = text.upper()
    
    # Look for FORM type declaration (usually in first few pages)
    # SEC filings have "FORM 10-K" or "FORM 10-Q" as headers
    
    import re
    
    # Pattern for form declaration
    form_pattern = r'FORM\s+(10-[KQ])'
    matches = re.findall(form_pattern, text_upper[:5000])  # Check first 5000 chars
    
    if matches:
        return matches[0]
    
    # Fallback: Check for annual vs quarterly indicators
    annual_indicators = [
        "ANNUAL REPORT",
        "FOR THE FISCAL YEAR ENDED",
        "FOR THE YEAR ENDED",
    ]
    
    quarterly_indicators = [
        "QUARTERLY REPORT",
        "FOR THE QUARTERLY PERIOD",
        "FOR THE FISCAL QUARTER",
    ]
    
    annual_count = sum(1 for ind in annual_indicators if ind in text_upper[:10000])
    quarterly_count = sum(1 for ind in quarterly_indicators if ind in text_upper[:10000])
    
    if annual_count > quarterly_count:
        return "10-K"
    elif quarterly_count > annual_count:
        return "10-Q"
    
    return "Unknown"
```

### Issue 3: Fiscal Year Extraction

**Problem:** Calendar year vs fiscal year confusion.

```python
# BAD - Just find any year
def extract_fiscal_year_bad(text):
    import re
    years = re.findall(r'20\d{2}', text)
    return int(years[0]) if years else None

# GOOD - Find fiscal year from context
def extract_fiscal_year_good(text):
    import re
    
    # Look for explicit fiscal year statements
    patterns = [
        r'(?:fiscal|fy)\s*(?:year)?\s*(\d{4})',
        r'for\s+the\s+(?:fiscal\s+)?year\s+ended\s+\w+\s+\d+,?\s+(\d{4})',
        r'(?:fiscal|fy)\s*\'?(\d{2})\b',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text.lower()[:10000])
        if matches:
            year = matches[0]
            if len(year) == 2:
                year = "20" + year
            return int(year)
    
    # Check filing date as fallback
    filing_date_pattern = r'filed\s+(?:as\s+of\s+)?(\w+\s+\d+,?\s+\d{4})'
    filing_match = re.search(filing_date_pattern, text.lower()[:5000])
    if filing_match:
        # Parse date and extract year
        from dateutil.parser import parse
        try:
            date = parse(filing_match.group(1))
            return date.year
        except:
            pass
    
    return None
```

## 1.6 Findings Documentation Template

```markdown
# Person 1: Text Extraction & Classification Findings

## Summary
- **Review Date:** YYYY-MM-DD
- **Files Reviewed:** [list files]
- **Overall Assessment:** [Critical/High/Medium/Low]

## Extraction Quality

### PDF Extraction
| Test | Result | Details |
|------|--------|---------|
| Multi-column text | PASS/FAIL | |
| Table extraction | PASS/FAIL | |
| Number preservation | PASS/FAIL | |
| Error handling | PASS/FAIL | |

### Accuracy Metrics
| Field | Accuracy | Sample Size |
|-------|----------|-------------|
| Company Name | XX% | N |
| Document Type | XX% | N |
| Fiscal Year | XX% | N |
| Quarter | XX% | N |

## Issues Found

### Issue 1: [Title]
- **Severity:** Critical/High/Medium/Low
- **File:** path/to/file.py
- **Line:** XX-XX
- **Description:** 
- **Impact:** 
- **Proposed Fix:**
```python
# Code fix here
```
- **Estimated Fix Time:** X hours

### Issue 2: [Title]
...

## Recommendations
1. 
2. 
3. 

## Test Results
[Attach test output]
```

---

# PART 2: Person 2 - RAG & Vector Search Review

## 2.1 Files to Review

```
project/
├── rag/
│   ├── embeddings.py             # Embedding generation
│   ├── vector_store.py           # ChromaDB operations
│   ├── retriever.py              # Document retrieval logic
│   └── chunker.py                # Text chunking strategy
├── config/
│   ├── chromadb_config.py        # ChromaDB settings
│   └── embedding_config.py       # Embedding model settings
└── tests/
    └── test_retrieval.py         # Retrieval tests
```

## 2.2 Review Checklist

### A. RAG Retrieval Accuracy

| Check | Status | Notes |
|-------|--------|-------|
| Correct documents returned for specific queries | ☐ | |
| Relevant chunks ranked in top-k | ☐ | |
| Company filtering works correctly | ☐ | |
| Document type filtering works correctly | ☐ | |
| Fiscal year filtering works correctly | ☐ | |
| No cross-company contamination | ☐ | |
| Metadata properly stored and queryable | ☐ | |

### B. Embedding Quality

| Check | Status | Notes |
|-------|--------|-------|
| Similar concepts have similar embeddings | ☐ | |
| Financial terms properly embedded | ☐ | |
| Company names don't cause confusion | ☐ | |
| Embedding model appropriate for financial text | ☐ | |

### C. ChromaDB Configuration

| Check | Status | Notes |
|-------|--------|-------|
| Chunk size appropriate (not too large/small) | ☐ | |
| Chunk overlap prevents context loss | ☐ | |
| Top-k setting returns enough relevant docs | ☐ | |
| Distance metric appropriate (cosine vs L2) | ☐ | |
| Metadata indexed for filtering | ☐ | |
| Collection properly persisted | ☐ | |

## 2.3 Test Queries

### Test Query Set

```python
# test_queries.py

RAG_TEST_QUERIES = [
    # Basic CapEx queries
    {
        "query": "What was Flex's capital expenditure in fiscal year 2024?",
        "expected_company": "Flex",
        "expected_doc_type": ["10-K", "10-Q"],
        "expected_content_keywords": ["capital expenditure", "capex", "505", "million"],
        "expected_fiscal_year": 2024,
    },
    {
        "query": "Jabil CapEx spending Q2 2024",
        "expected_company": "Jabil",
        "expected_doc_type": ["10-Q"],
        "expected_content_keywords": ["capital expenditure", "property", "equipment"],
        "expected_fiscal_year": 2024,
        "expected_quarter": 2,
    },
    
    # Cross-company query (should return multiple companies)
    {
        "query": "Compare capital expenditure across EMS companies",
        "expected_companies": ["Flex", "Jabil", "Celestica", "Benchmark", "Sanmina"],
        "expected_content_keywords": ["capital expenditure", "capex"],
    },
    
    # Specific financial metric
    {
        "query": "Flex depreciation and amortization 2024",
        "expected_company": "Flex",
        "expected_content_keywords": ["depreciation", "amortization"],
    },
    
    # Test for cross-company contamination
    {
        "query": "Flex revenue 2024",
        "expected_company": "Flex",
        "not_expected_company": ["Jabil", "Celestica", "Benchmark", "Sanmina"],
        "expected_content_keywords": ["revenue", "net sales"],
    },
    
    # Alternative CapEx terminology
    {
        "query": "Additions to property plant and equipment Celestica",
        "expected_company": "Celestica",
        "expected_content_keywords": ["property", "plant", "equipment", "additions", "purchases"],
    },
    
    # YTD vs Quarterly distinction
    {
        "query": "Flex Q3 2024 capital expenditure for the quarter only",
        "expected_company": "Flex",
        "expected_doc_type": ["10-Q"],
        "expected_quarter": 3,
        "expected_content_keywords": ["three months", "quarter"],
    },
]
```

### Retrieval Test Code

```python
# test_retrieval_accuracy.py
import pytest
from typing import List, Dict, Any
from rag.retriever import retrieve_documents

def test_basic_retrieval():
    """Test that basic queries return relevant documents."""
    
    query = "What was Flex's capital expenditure in fiscal year 2024?"
    
    results = retrieve_documents(query, top_k=10)
    
    assert len(results) > 0, "No documents retrieved"
    
    # Check top result is from correct company
    top_result = results[0]
    assert top_result["metadata"]["company"] == "Flex", \
        f"Wrong company in top result: {top_result['metadata']['company']}"
    
    # Check content relevance
    content = top_result["content"].lower()
    assert any(kw in content for kw in ["capital expenditure", "capex", "property"]), \
        "Top result doesn't contain CapEx-related content"

def test_company_filtering():
    """Test that company filter works correctly."""
    
    query = "capital expenditure 2024"
    
    # With company filter
    results_filtered = retrieve_documents(
        query, 
        top_k=10,
        filter={"company": "Flex"}
    )
    
    # All results should be from Flex
    for result in results_filtered:
        assert result["metadata"]["company"] == "Flex", \
            f"Company filter failed: got {result['metadata']['company']}"

def test_no_cross_company_contamination():
    """Test that company-specific queries don't return wrong companies."""
    
    query = "Flex Ltd capital expenditure fiscal 2024"
    
    results = retrieve_documents(query, top_k=10)
    
    # Count companies in results
    companies = [r["metadata"]["company"] for r in results]
    flex_count = companies.count("Flex")
    other_count = len(companies) - flex_count
    
    # At least 70% should be Flex for a Flex-specific query
    flex_ratio = flex_count / len(companies) if companies else 0
    assert flex_ratio >= 0.7, \
        f"Cross-company contamination: only {flex_ratio*100:.1f}% from Flex. Companies: {companies}"

def test_retrieval_ranking():
    """Test that most relevant documents are ranked highest."""
    
    # Query for very specific information
    query = "Flex capital expenditure was $505 million fiscal year 2024"
    
    results = retrieve_documents(query, top_k=10)
    
    # Check that the exact match is in top 3
    found_exact = False
    for i, result in enumerate(results[:3]):
        if "505" in result["content"] and "million" in result["content"].lower():
            found_exact = True
            break
    
    assert found_exact, "Exact match not found in top 3 results"

@pytest.mark.parametrize("test_case", RAG_TEST_QUERIES)
def test_query_accuracy(test_case):
    """Parameterized test for all test queries."""
    
    query = test_case["query"]
    results = retrieve_documents(query, top_k=10)
    
    errors = []
    
    # Check expected company
    if "expected_company" in test_case:
        top_company = results[0]["metadata"]["company"] if results else None
        if top_company != test_case["expected_company"]:
            errors.append(f"Expected company {test_case['expected_company']}, got {top_company}")
    
    # Check not expected company
    if "not_expected_company" in test_case:
        for result in results[:5]:
            if result["metadata"]["company"] in test_case["not_expected_company"]:
                errors.append(f"Unexpected company {result['metadata']['company']} in top 5")
    
    # Check content keywords
    if "expected_content_keywords" in test_case:
        top_content = results[0]["content"].lower() if results else ""
        missing_keywords = [
            kw for kw in test_case["expected_content_keywords"]
            if kw.lower() not in top_content
        ]
        if len(missing_keywords) > len(test_case["expected_content_keywords"]) / 2:
            errors.append(f"Missing keywords in top result: {missing_keywords}")
    
    assert len(errors) == 0, f"Query '{query}' errors:\n" + "\n".join(errors)
```

## 2.4 Chunk Size Optimization Tests

```python
# test_chunk_optimization.py
from typing import List, Tuple
import numpy as np
from rag.chunker import chunk_text
from rag.embeddings import get_embedding
from rag.retriever import retrieve_documents

def test_chunk_sizes():
    """Test different chunk sizes and measure retrieval quality."""
    
    # Test document
    test_text = open("test_data/flex_10k_2024_extracted.txt").read()
    
    chunk_sizes = [256, 512, 1024, 2048]
    overlaps = [0, 64, 128, 256]
    
    results = []
    
    for chunk_size in chunk_sizes:
        for overlap in overlaps:
            if overlap >= chunk_size:
                continue
                
            chunks = chunk_text(test_text, chunk_size=chunk_size, overlap=overlap)
            
            # Measure chunk quality
            metrics = evaluate_chunks(chunks)
            
            results.append({
                "chunk_size": chunk_size,
                "overlap": overlap,
                "num_chunks": len(chunks),
                "avg_chunk_length": np.mean([len(c) for c in chunks]),
                **metrics
            })
    
    return results

def evaluate_chunks(chunks: List[str]) -> dict:
    """Evaluate chunk quality."""
    
    metrics = {
        "complete_sentences": 0,
        "split_numbers": 0,
        "context_preserved": 0,
    }
    
    for chunk in chunks:
        # Check for complete sentences
        if chunk.strip().endswith(('.', '!', '?', '"')):
            metrics["complete_sentences"] += 1
        
        # Check for split numbers (number at end or start without context)
        import re
        if re.search(r'^\s*[\d,]+\s*$', chunk[:50]):  # Number at start without context
            metrics["split_numbers"] += 1
        if re.search(r'[\d,]+\s*$', chunk[-50:]) and not re.search(r'[.!?]\s*$', chunk):
            metrics["split_numbers"] += 1
        
        # Check if CapEx context is preserved
        if "capital expenditure" in chunk.lower() or "capex" in chunk.lower():
            # Should have a number nearby
            if re.search(r'\$[\d,]+', chunk):
                metrics["context_preserved"] += 1
    
    # Normalize
    total = len(chunks)
    return {
        "complete_sentence_ratio": metrics["complete_sentences"] / total,
        "split_number_ratio": metrics["split_numbers"] / total,
        "context_preserved_ratio": metrics["context_preserved"] / max(1, sum(1 for c in chunks if "capex" in c.lower() or "capital" in c.lower())),
    }

def test_optimal_chunk_configuration():
    """Recommend optimal chunk configuration."""
    
    results = test_chunk_sizes()
    
    # Score each configuration
    for r in results:
        # Higher is better for complete sentences and context
        # Lower is better for split numbers
        r["score"] = (
            r["complete_sentence_ratio"] * 0.3 +
            (1 - r["split_number_ratio"]) * 0.3 +
            r["context_preserved_ratio"] * 0.4
        )
    
    # Find best configuration
    best = max(results, key=lambda x: x["score"])
    
    print(f"Recommended configuration:")
    print(f"  Chunk size: {best['chunk_size']}")
    print(f"  Overlap: {best['overlap']}")
    print(f"  Score: {best['score']:.3f}")
    
    return best
```

## 2.5 Retrieval Accuracy Measurement

```python
# metrics/retrieval_accuracy.py
from typing import List, Dict, Any
import json
from dataclasses import dataclass

@dataclass
class RetrievalResult:
    query: str
    expected_doc_ids: List[str]
    retrieved_doc_ids: List[str]
    precision_at_k: float
    recall: float
    mrr: float  # Mean Reciprocal Rank

def calculate_retrieval_metrics(
    ground_truth_file: str,
    retriever_func,
    k: int = 10
) -> Dict:
    """
    Calculate retrieval accuracy metrics.
    
    Ground truth format:
    [
        {
            "query": "...",
            "relevant_doc_ids": ["doc1", "doc2"],
            "expected_top_doc": "doc1"
        }
    ]
    """
    
    with open(ground_truth_file, 'r') as f:
        ground_truth = json.load(f)
    
    results = []
    
    for entry in ground_truth:
        query = entry["query"]
        relevant_ids = set(entry["relevant_doc_ids"])
        expected_top = entry.get("expected_top_doc")
        
        # Retrieve documents
        retrieved = retriever_func(query, top_k=k)
        retrieved_ids = [doc["id"] for doc in retrieved]
        
        # Calculate Precision@K
        relevant_in_top_k = len(set(retrieved_ids) & relevant_ids)
        precision_at_k = relevant_in_top_k / k
        
        # Calculate Recall
        recall = relevant_in_top_k / len(relevant_ids) if relevant_ids else 0
        
        # Calculate MRR (Mean Reciprocal Rank)
        mrr = 0
        for i, doc_id in enumerate(retrieved_ids):
            if doc_id in relevant_ids:
                mrr = 1 / (i + 1)
                break
        
        results.append(RetrievalResult(
            query=query,
            expected_doc_ids=list(relevant_ids),
            retrieved_doc_ids=retrieved_ids,
            precision_at_k=precision_at_k,
            recall=recall,
            mrr=mrr
        ))
    
    # Aggregate metrics
    avg_precision = sum(r.precision_at_k for r in results) / len(results)
    avg_recall = sum(r.recall for r in results) / len(results)
    avg_mrr = sum(r.mrr for r in results) / len(results)
    
    # Calculate retrieval success rate (at least one relevant doc in top-k)
    success_count = sum(1 for r in results if r.precision_at_k > 0)
    success_rate = success_count / len(results)
    
    return {
        "avg_precision_at_k": round(avg_precision, 4),
        "avg_recall": round(avg_recall, 4),
        "avg_mrr": round(avg_mrr, 4),
        "success_rate": round(success_rate, 4),
        "total_queries": len(results),
        "k": k,
        "failed_queries": [
            {"query": r.query, "retrieved": r.retrieved_doc_ids[:3]}
            for r in results if r.precision_at_k == 0
        ]
    }
```

## 2.6 Common Issues to Look For

### Issue 1: Cross-Company Contamination

**Problem:** Query for one company returns documents from another.

```python
# BAD - No company context in embedding
def retrieve_bad(query: str, top_k: int = 10):
    embedding = get_embedding(query)
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k
    )
    return results

# GOOD - Use metadata filtering
def retrieve_good(query: str, company: str = None, top_k: int = 10):
    embedding = get_embedding(query)
    
    where_filter = None
    if company:
        where_filter = {"company": company}
    
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=where_filter
    )
    return results

# BETTER - Detect company from query and filter
def retrieve_best(query: str, top_k: int = 10):
    # Detect company mentions in query
    companies = ["Flex", "Jabil", "Celestica", "Benchmark", "Sanmina"]
    detected_company = None
    
    query_upper = query.upper()
    for company in companies:
        if company.upper() in query_upper:
            detected_company = company
            break
    
    embedding = get_embedding(query)
    
    where_filter = None
    if detected_company:
        where_filter = {"company": detected_company}
    
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=where_filter
    )
    return results
```

### Issue 2: Chunk Boundary Issues

**Problem:** Numbers separated from their context.

```python
# BAD - Fixed character chunking
def chunk_bad(text: str, chunk_size: int = 1000):
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i+chunk_size])
    return chunks

# GOOD - Sentence-aware chunking
def chunk_good(text: str, chunk_size: int = 1000, overlap: int = 200):
    import re
    
    # Split by sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += " " + sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # Add overlap
    if overlap > 0:
        overlapped_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                # Add end of previous chunk
                prev_overlap = chunks[i-1][-overlap:]
                chunk = prev_overlap + " " + chunk
            overlapped_chunks.append(chunk)
        return overlapped_chunks
    
    return chunks

# BEST - Semantic chunking that keeps financial context together
def chunk_best(text: str, chunk_size: int = 1000):
    import re
    
    # Define section patterns to keep together
    section_patterns = [
        r'Capital Expenditures.*?(?=\n[A-Z]|\Z)',
        r'Cash Flow.*?(?=\n[A-Z]|\Z)',
        r'Liquidity.*?(?=\n[A-Z]|\Z)',
    ]
    
    chunks = []
    remaining_text = text
    
    # First, extract important sections as whole chunks
    for pattern in section_patterns:
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
        for match in matches:
            if len(match) <= chunk_size * 2:  # Allow slightly larger for important sections
                chunks.append(match)
                remaining_text = remaining_text.replace(match, "")
    
    # Chunk remaining text with sentence awareness
    chunks.extend(chunk_good(remaining_text, chunk_size))
    
    return chunks
```

### Issue 3: Metadata Not Properly Indexed

**Problem:** Filters don't work or are slow.

```python
# BAD - Metadata stored but not indexed
def add_documents_bad(documents):
    for doc in documents:
        collection.add(
            ids=[doc["id"]],
            embeddings=[doc["embedding"]],
            documents=[doc["text"]],
            metadatas=[doc["metadata"]]  # Metadata stored but not optimized
        )

# GOOD - Ensure metadata is properly structured
def add_documents_good(documents):
    # ChromaDB requires flat metadata (no nested dicts)
    for doc in documents:
        metadata = {
            "company": doc["metadata"]["company"],
            "doc_type": doc["metadata"]["doc_type"],
            "fiscal_year": doc["metadata"]["fiscal_year"],
            "quarter": doc["metadata"].get("quarter", 0),  # 0 for annual
            "source_file": doc["metadata"]["source_file"],
        }
        
        collection.add(
            ids=[doc["id"]],
            embeddings=[doc["embedding"]],
            documents=[doc["text"]],
            metadatas=[metadata]
        )
```

## 2.7 Findings Documentation Template

```markdown
# Person 2: RAG & Vector Search Findings

## Summary
- **Review Date:** YYYY-MM-DD
- **Files Reviewed:** [list files]
- **Overall Assessment:** [Critical/High/Medium/Low]

## Retrieval Accuracy

### Metrics
| Metric | Value | Target |
|--------|-------|--------|
| Precision@10 | XX% | >80% |
| Recall | XX% | >70% |
| MRR | XX | >0.5 |
| Success Rate | XX% | >90% |

### Company-Level Accuracy
| Company | Queries | Success Rate |
|---------|---------|--------------|
| Flex | N | XX% |
| Jabil | N | XX% |
| Celestica | N | XX% |
| Benchmark | N | XX% |
| Sanmina | N | XX% |

## Configuration Review

### Current Settings
| Setting | Value | Recommended |
|---------|-------|-------------|
| Chunk Size | XXX | XXX |
| Overlap | XXX | XXX |
| Top-K | XX | XX |
| Distance Metric | XXX | cosine |
| Embedding Model | XXX | XXX |

## Issues Found

### Issue 1: [Title]
- **Severity:** Critical/High/Medium/Low
- **Description:** 
- **Impact:** 
- **Evidence:** [test results]
- **Proposed Fix:**
```python
# Code fix
```
- **Estimated Fix Time:** X hours

## Failed Queries
| Query | Expected | Retrieved | Issue |
|-------|----------|-----------|-------|
| ... | ... | ... | ... |

## Recommendations
1. 
2. 
3. 
```

---

# PART 3: Person 3 - AI Extraction & Data Quality Review

## 3.1 Files to Review

```
project/
├── extraction/
│   ├── ai_extractor.py           # Main AI extraction logic
│   ├── prompts.py                # Prompt templates
│   └── json_parser.py            # JSON response parsing
├── models/
│   ├── financial_data.py         # Data models/schemas
│   └── validation.py             # Data validation
├── config/
│   └── ollama_config.py          # Ollama settings
└── tests/
    └── test_extraction_accuracy.py
```

## 3.2 Review Checklist

### A. Financial Data Extraction Accuracy

| Check | Status | Notes |
|-------|--------|-------|
| CapEx values match source documents | ☐ | |
| Revenue values correct | ☐ | |
| Net income values correct | ☐ | |
| Cash flow values correct | ☐ | |
| YTD vs quarterly correctly distinguished | ☐ | |
| Negative numbers handled correctly | ☐ | |
| Currency/units consistent | ☐ | |
| Fiscal year/quarter correct | ☐ | |

### B. AI Prompt Quality

| Check | Status | Notes |
|-------|--------|-------|
| Prompts are specific enough | ☐ | |
| Examples provided in prompts | ☐ | |
| Output format clearly specified | ☐ | |
| Edge cases addressed in prompts | ☐ | |
| Prompts handle missing data | ☐ | |

### C. JSON Parsing Robustness

| Check | Status | Notes |
|-------|--------|-------|
| Handles malformed JSON | ☐ | |
| Handles missing fields | ☐ | |
| Handles extra fields | ☐ | |
| Handles null values | ☐ | |
| Handles different number formats | ☐ | |
| Has retry logic | ☐ | |

## 3.3 Ground Truth Dataset Creation

### Step 1: Select Sample Documents

```python
# ground_truth/create_ground_truth.py

GROUND_TRUTH_SAMPLES = [
    # Select diverse samples
    {
        "file": "flex_10k_2024.pdf",
        "company": "Flex",
        "doc_type": "10-K",
        "fiscal_year": 2024,
    },
    {
        "file": "flex_10q_q1_2024.pdf",
        "company": "Flex",
        "doc_type": "10-Q",
        "fiscal_year": 2024,
        "quarter": 1,
    },
    {
        "file": "flex_10q_q2_2024.pdf",
        "company": "Flex",
        "doc_type": "10-Q",
        "fiscal_year": 2024,
        "quarter": 2,
    },
    # Add more samples for each company...
]

# Minimum recommended samples:
# - 2 x 10-K per company (different years)
# - 4 x 10-Q per company (all quarters)
# - Total: ~30 documents for 5 companies
```

### Step 2: Manual Extraction Template

```json
{
  "file": "flex_10k_2024.pdf",
  "company": "Flex",
  "doc_type": "10-K",
  "fiscal_year": 2024,
  "period": "annual",
  "extraction_date": "2024-XX-XX",
  "extracted_by": "Person Name",
  "source_page": 45,
  "source_section": "Consolidated Statements of Cash Flows",
  
  "financial_data": {
    "capital_expenditures": {
      "value": 505,
      "unit": "million",
      "currency": "USD",
      "period_type": "annual",
      "source_text": "Capital expenditures were $505 million for fiscal year 2024",
      "source_location": "MD&A, page 32"
    },
    "depreciation_amortization": {
      "value": 480,
      "unit": "million",
      "currency": "USD",
      "period_type": "annual",
      "source_text": "Depreciation and amortization: $480 million"
    },
    "revenue": {
      "value": 26400,
      "unit": "million",
      "currency": "USD",
      "period_type": "annual"
    },
    "net_income": {
      "value": 650,
      "unit": "million",
      "currency": "USD",
      "period_type": "annual"
    }
  },
  
  "notes": "CapEx includes both purchases of property, plant and equipment AND capitalized software"
}
```

### Step 3: Create Ground Truth File

```python
# ground_truth/build_ground_truth.py
import json
from pathlib import Path

def create_ground_truth_template(samples: list, output_file: str):
    """Generate a template for manual ground truth entry."""
    
    template = []
    
    for sample in samples:
        entry = {
            "file": sample["file"],
            "company": sample["company"],
            "doc_type": sample["doc_type"],
            "fiscal_year": sample["fiscal_year"],
            "quarter": sample.get("quarter"),
            "financial_data": {
                "capital_expenditures": {
                    "value": None,  # TO BE FILLED MANUALLY
                    "unit": "million",
                    "currency": "USD",
                    "period_type": "quarterly" if sample.get("quarter") else "annual",
                    "source_text": "",  # Copy exact text from document
                    "source_page": None,
                },
                "depreciation_amortization": {
                    "value": None,
                    "unit": "million",
                    "currency": "USD",
                    "period_type": "quarterly" if sample.get("quarter") else "annual",
                },
                "revenue": {
                    "value": None,
                    "unit": "million",
                    "currency": "USD",
                },
                "net_income": {
                    "value": None,
                    "unit": "million",
                    "currency": "USD",
                },
            },
            "verified_by": "",
            "verification_date": "",
        }
        template.append(entry)
    
    with open(output_file, 'w') as f:
        json.dump(template, f, indent=2)
    
    print(f"Created template with {len(template)} entries")
    print(f"Output: {output_file}")
    print("\nNext steps:")
    print("1. Open each PDF file")
    print("2. Locate the financial statements section")
    print("3. Find the exact values and fill in the template")
    print("4. Record the source page and exact text")

if __name__ == "__main__":
    create_ground_truth_template(GROUND_TRUTH_SAMPLES, "ground_truth/ground_truth_template.json")
```

## 3.4 Extraction Accuracy Test Code

```python
# test_extraction_accuracy.py
import json
import pytest
from typing import Dict, Any, List
from dataclasses import dataclass
from extraction.ai_extractor import extract_financial_data

@dataclass
class ExtractionComparison:
    file: str
    field: str
    expected: float
    extracted: float
    difference: float
    percentage_error: float
    is_accurate: bool  # Within 1% tolerance

def load_ground_truth(file_path: str) -> List[Dict]:
    with open(file_path, 'r') as f:
        return json.load(f)

def compare_extraction(
    ground_truth: Dict,
    extracted: Dict,
    tolerance: float = 0.01  # 1% tolerance
) -> List[ExtractionComparison]:
    """Compare extracted values against ground truth."""
    
    comparisons = []
    
    financial_fields = [
        "capital_expenditures",
        "depreciation_amortization",
        "revenue",
        "net_income",
    ]
    
    for field in financial_fields:
        expected_data = ground_truth["financial_data"].get(field, {})
        extracted_data = extracted.get("financial_data", {}).get(field, {})
        
        expected_value = expected_data.get("value")
        extracted_value = extracted_data.get("value")
        
        if expected_value is None:
            continue  # Skip if no ground truth
        
        if extracted_value is None:
            comparisons.append(ExtractionComparison(
                file=ground_truth["file"],
                field=field,
                expected=expected_value,
                extracted=0,
                difference=expected_value,
                percentage_error=100.0,
                is_accurate=False
            ))
            continue
        
        difference = abs(expected_value - extracted_value)
        percentage_error = (difference / expected_value * 100) if expected_value != 0 else 0
        is_accurate = percentage_error <= tolerance * 100
        
        comparisons.append(ExtractionComparison(
            file=ground_truth["file"],
            field=field,
            expected=expected_value,
            extracted=extracted_value,
            difference=difference,
            percentage_error=round(percentage_error, 2),
            is_accurate=is_accurate
        ))
    
    return comparisons

def test_extraction_accuracy():
    """Test extraction accuracy against ground truth."""
    
    ground_truth = load_ground_truth("ground_truth/ground_truth.json")
    
    all_comparisons = []
    
    for entry in ground_truth:
        # Run extraction
        extracted = extract_financial_data(entry["file"])
        
        # Compare
        comparisons = compare_extraction(entry, extracted)
        all_comparisons.extend(comparisons)
    
    # Calculate overall accuracy
    accurate_count = sum(1 for c in all_comparisons if c.is_accurate)
    total_count = len(all_comparisons)
    accuracy = accurate_count / total_count * 100 if total_count > 0 else 0
    
    # Print report
    print(f"\n{'='*60}")
    print(f"EXTRACTION ACCURACY REPORT")
    print(f"{'='*60}")
    print(f"Overall Accuracy: {accuracy:.1f}% ({accurate_count}/{total_count})")
    
    # Field-level accuracy
    field_stats = {}
    for c in all_comparisons:
        if c.field not in field_stats:
            field_stats[c.field] = {"accurate": 0, "total": 0, "errors": []}
        field_stats[c.field]["total"] += 1
        if c.is_accurate:
            field_stats[c.field]["accurate"] += 1
        else:
            field_stats[c.field]["errors"].append(c)
    
    print(f"\nField-Level Accuracy:")
    for field, stats in field_stats.items():
        field_acc = stats["accurate"] / stats["total"] * 100
        print(f"  {field}: {field_acc:.1f}% ({stats['accurate']}/{stats['total']})")
    
    # Show errors
    print(f"\nErrors:")
    for c in all_comparisons:
        if not c.is_accurate:
            print(f"  {c.file} - {c.field}:")
            print(f"    Expected: {c.expected}, Extracted: {c.extracted}")
            print(f"    Error: {c.percentage_error}%")
    
    # Assert minimum accuracy
    assert accuracy >= 80, f"Extraction accuracy {accuracy}% is below 80% threshold"

def test_capex_ytd_vs_quarterly():
    """Specifically test YTD vs quarterly CapEx distinction."""
    
    # This is a critical issue - system often confuses YTD with quarterly
    test_cases = [
        {
            "file": "flex_10q_q2_2024.pdf",
            "expected_quarterly_capex": 120,  # Q2 only
            "expected_ytd_capex": 250,  # Q1 + Q2
        },
        {
            "file": "flex_10q_q3_2024.pdf",
            "expected_quarterly_capex": 130,  # Q3 only
            "expected_ytd_capex": 380,  # Q1 + Q2 + Q3
        },
    ]
    
    for case in test_cases:
        extracted = extract_financial_data(case["file"])
        
        capex = extracted.get("financial_data", {}).get("capital_expenditures", {})
        
        # Check period type is correctly identified
        period_type = capex.get("period_type")
        value = capex.get("value")
        
        # If period_type is "quarterly", value should match quarterly
        # If period_type is "ytd", value should match YTD
        if period_type == "quarterly":
            assert abs(value - case["expected_quarterly_capex"]) < 5, \
                f"Quarterly CapEx mismatch: expected ~{case['expected_quarterly_capex']}, got {value}"
        elif period_type == "ytd":
            assert abs(value - case["expected_ytd_capex"]) < 5, \
                f"YTD CapEx mismatch: expected ~{case['expected_ytd_capex']}, got {value}"
        else:
            pytest.fail(f"Period type not identified: {period_type}")

def test_negative_capex_handling():
    """Test that CapEx is correctly handled regardless of sign convention."""
    
    # In cash flow statements, CapEx is often shown as negative
    # (cash outflow), but we want positive values
    
    test_file = "test_data/sample_with_negative_capex.pdf"
    extracted = extract_financial_data(test_file)
    
    capex = extracted.get("financial_data", {}).get("capital_expenditures", {})
    value = capex.get("value")
    
    assert value > 0, f"CapEx should be positive, got {value}"
```

## 3.5 Prompt Improvement Suggestions

### Current Prompt Issues & Fixes

```python
# prompts.py

# BAD - Too vague
PROMPT_BAD = """
Extract the financial data from this document.
Return JSON with capex, revenue, and income.
"""

# GOOD - Specific with examples
PROMPT_GOOD = """
Extract capital expenditure (CapEx) data from this SEC filing.

IMPORTANT INSTRUCTIONS:
1. Look for CapEx in the Cash Flow Statement under "Investing Activities"
2. Common labels include:
   - "Capital expenditures"
   - "Purchases of property, plant and equipment"
   - "Additions to property, plant and equipment"
   - "Payments for property, plant and equipment"

3. CapEx is typically shown as NEGATIVE in cash flow statements (cash outflow)
   - Convert to POSITIVE value in your response
   - Example: If document shows "(505)" or "-505", return 505

4. For 10-Q filings, distinguish between:
   - QUARTERLY: "Three months ended" = single quarter only
   - YTD (Year-to-Date): "Nine months ended" = cumulative

5. Return ONLY the value for the MOST RECENT period in the document

OUTPUT FORMAT (strict JSON):
{
  "capital_expenditures": {
    "value": <number in millions>,
    "unit": "million",
    "currency": "USD",
    "period_type": "quarterly" | "ytd" | "annual",
    "period_description": "<exact period from document>",
    "source_text": "<exact text where value was found>",
    "confidence": "high" | "medium" | "low"
  }
}

EXAMPLE 1 (10-K Annual):
Document text: "Capital expenditures were $505 million for fiscal year 2024"
Response:
{
  "capital_expenditures": {
    "value": 505,
    "unit": "million",
    "currency": "USD",
    "period_type": "annual",
    "period_description": "fiscal year 2024",
    "source_text": "Capital expenditures were $505 million for fiscal year 2024",
    "confidence": "high"
  }
}

EXAMPLE 2 (10-Q with negative notation):
Document text: "Purchases of property and equipment: $(127) million for Q3"
Response:
{
  "capital_expenditures": {
    "value": 127,
    "unit": "million",
    "currency": "USD",
    "period_type": "quarterly",
    "period_description": "Q3",
    "source_text": "Purchases of property and equipment: $(127)",
    "confidence": "high"
  }
}

If CapEx cannot be found, return:
{
  "capital_expenditures": {
    "value": null,
    "error": "CapEx not found in document",
    "confidence": "low"
  }
}

DOCUMENT TEXT:
{document_text}
"""

# BEST - With few-shot examples and validation rules
PROMPT_BEST = """
You are a financial data extraction expert. Extract capital expenditure (CapEx) from SEC filings with high accuracy.

## DEFINITIONS
- Capital Expenditure (CapEx): Cash spent on acquiring or upgrading physical assets
- Location in filings: Cash Flow Statement > Investing Activities section
- Sign convention: Always report as POSITIVE number (even if shown as negative cash outflow)

## LABEL VARIATIONS TO LOOK FOR
Primary labels:
- "Capital expenditures"
- "Purchases of property, plant and equipment"  
- "Payments for property, plant and equipment"

Secondary labels (also valid):
- "Additions to property, plant and equipment"
- "Investments in property, plant and equipment"
- "Expenditures for property and equipment"

NOT CapEx (exclude these):
- "Depreciation and amortization" (this is the opposite - expense recognition)
- "Proceeds from sale of property" (this is a sale, not purchase)
- "Capitalized software costs" (sometimes separate, confirm context)

## PERIOD IDENTIFICATION (CRITICAL FOR 10-Q)
- "Three months ended" → quarterly (single quarter)
- "Six months ended" → ytd (2 quarters)
- "Nine months ended" → ytd (3 quarters)  
- "Year ended" or "Twelve months ended" → annual

## EXTRACTION RULES
1. Find the Cash Flow Statement
2. Locate "Investing Activities" section
3. Find CapEx line item
4. Extract the value for the CURRENT/MOST RECENT period
5. Convert parentheses or minus signs to positive: (505) → 505, -505 → 505
6. Identify the period type from column headers

## OUTPUT FORMAT
```json
{
  "capital_expenditures": {
    "value": <number>,
    "unit": "million",
    "currency": "USD",
    "period_type": "quarterly|ytd|annual",
    "fiscal_year": <YYYY>,
    "fiscal_quarter": <1-4 or null for annual>,
    "source_text": "<exact line from document>",
    "source_section": "Cash Flow Statement - Investing Activities",
    "confidence": "high|medium|low",
    "notes": "<any relevant context>"
  }
}
```

## VALIDATION CHECKLIST (before responding)
☐ Value is positive
☐ Value is in millions (not thousands or billions)
☐ Period type matches document headers
☐ Source text is exact copy from document
☐ Confidence reflects certainty

## DOCUMENT TO ANALYZE:
{document_text}

## YOUR RESPONSE (JSON only, no markdown):
"""
```

## 3.6 JSON Parsing Robustness

```python
# extraction/json_parser.py
import json
import re
from typing import Dict, Any, Optional

def parse_ai_response(response: str) -> Dict[str, Any]:
    """
    Robustly parse AI response to JSON, handling common issues.
    """
    
    # Try direct JSON parsing first
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
    json_patterns = [
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
        r'\{[\s\S]*\}',
    ]
    
    for pattern in json_patterns:
        match = re.search(pattern, response)
        if match:
            try:
                json_str = match.group(1) if '```' in pattern else match.group(0)
                return json.loads(json_str)
            except json.JSONDecodeError:
                continue
    
    # Try to fix common JSON issues
    cleaned = clean_json_string(response)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    
    # Last resort: try to extract key-value pairs
    return extract_key_values(response)

def clean_json_string(s: str) -> str:
    """Fix common JSON formatting issues."""
    
    # Remove leading/trailing whitespace
    s = s.strip()
    
    # Remove markdown code block markers
    s = re.sub(r'^```json\s*', '', s)
    s = re.sub(r'^```\s*', '', s)
    s = re.sub(r'\s*```$', '', s)
    
    # Fix single quotes to double quotes
    # Be careful not to break apostrophes in text
    s = re.sub(r"(?<=[{,\[])\s*'([^']+)'\s*:", r' "\1":', s)
    s = re.sub(r":\s*'([^']*)'(?=[,}\]])", r': "\1"', s)
    
    # Fix trailing commas
    s = re.sub(r',\s*}', '}', s)
    s = re.sub(r',\s*]', ']', s)
    
    # Fix unquoted keys
    s = re.sub(r'(?<=[{,])\s*(\w+)\s*:', r' "\1":', s)
    
    # Fix None/null
    s = re.sub(r':\s*None\b', ': null', s)
    
    # Fix True/False
    s = re.sub(r':\s*True\b', ': true', s)
    s = re.sub(r':\s*False\b', ': false', s)
    
    return s

def extract_key_values(response: str) -> Dict[str, Any]:
    """Extract key-value pairs from semi-structured text."""
    
    result = {"_parse_method": "fallback", "raw_response": response}
    
    # Try to find capital_expenditures value
    capex_patterns = [
        r'capital.?expenditures?.*?(\d+(?:,\d{3})*(?:\.\d+)?)',
        r'capex.*?(\d+(?:,\d{3})*(?:\.\d+)?)',
        r'"value"\s*:\s*(\d+(?:,\d{3})*(?:\.\d+)?)',
    ]
    
    for pattern in capex_patterns:
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            value_str = match.group(1).replace(',', '')
            try:
                result["capital_expenditures"] = {
                    "value": float(value_str),
                    "confidence": "low",
                    "note": "Extracted via fallback parser"
                }
                break
            except ValueError:
                continue
    
    return result

def validate_extraction_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize extraction result."""
    
    validated = result.copy()
    
    # Ensure required fields exist
    if "capital_expenditures" not in validated:
        validated["capital_expenditures"] = {
            "value": None,
            "error": "Field not found in extraction"
        }
    
    capex = validated["capital_expenditures"]
    
    # Validate value
    if capex.get("value") is not None:
        value = capex["value"]
        
        # Convert to number if string
        if isinstance(value, str):
            try:
                value = float(value.replace(',', '').replace('$', ''))
                capex["value"] = value
            except ValueError:
                capex["value"] = None
                capex["error"] = f"Could not parse value: {value}"
        
        # Ensure positive
        if isinstance(value, (int, float)) and value < 0:
            capex["value"] = abs(value)
            capex["note"] = capex.get("note", "") + " (converted from negative)"
        
        # Sanity check: CapEx shouldn't be more than $100B
        if isinstance(capex["value"], (int, float)) and capex["value"] > 100000:
            capex["warning"] = "Value seems unusually high - verify units"
    
    # Default unit and currency
    capex.setdefault("unit", "million")
    capex.setdefault("currency", "USD")
    
    return validated

# Usage with retry logic
def extract_with_retry(document_text: str, max_retries: int = 3) -> Dict[str, Any]:
    """Extract with retry logic for failed parses."""
    
    from extraction.ai_extractor import call_ollama
    from extraction.prompts import PROMPT_BEST
    
    for attempt in range(max_retries):
        prompt = PROMPT_BEST.format(document_text=document_text)
        
        response = call_ollama(prompt)
        result = parse_ai_response(response)
        
        # Validate
        validated = validate_extraction_result(result)
        
        # Check if we got a valid extraction
        capex = validated.get("capital_expenditures", {})
        if capex.get("value") is not None and capex.get("confidence") != "low":
            return validated
        
        # If low confidence or no value, retry with more specific prompt
        if attempt < max_retries - 1:
            print(f"Retry {attempt + 1}: Low confidence extraction, retrying...")
    
    return validated
```

## 3.7 Findings Documentation Template

```markdown
# Person 3: AI Extraction & Data Quality Findings

## Summary
- **Review Date:** YYYY-MM-DD
- **Files Reviewed:** [list files]
- **Ground Truth Samples:** N documents
- **Overall Assessment:** [Critical/High/Medium/Low]

## Extraction Accuracy

### Overall Metrics
| Metric | Value | Target |
|--------|-------|--------|
| Overall Accuracy | XX% | >90% |
| CapEx Accuracy | XX% | >95% |
| Revenue Accuracy | XX% | >95% |
| Period Type Accuracy | XX% | >98% |

### Company-Level Accuracy
| Company | CapEx | Revenue | Period | Overall |
|---------|-------|---------|--------|---------|
| Flex | XX% | XX% | XX% | XX% |
| Jabil | XX% | XX% | XX% | XX% |
| Celestica | XX% | XX% | XX% | XX% |
| Benchmark | XX% | XX% | XX% | XX% |
| Sanmina | XX% | XX% | XX% | XX% |

## Critical Issues

### Issue 1: YTD vs Quarterly Confusion
- **Severity:** Critical
- **Frequency:** X out of N cases
- **Impact:** CapEx values 2-3x higher than actual
- **Root Cause:** Prompt doesn't emphasize period distinction
- **Proposed Fix:** [Updated prompt]
- **Estimated Fix Time:** 2 hours

### Issue 2: Negative Number Handling
- **Severity:** High
- **Frequency:** X out of N cases
- **Impact:** Missing or incorrect values
- **Root Cause:** JSON parser doesn't handle parentheses
- **Proposed Fix:** [Code fix]
- **Estimated Fix Time:** 1 hour

## Prompt Analysis

### Current Prompt Issues
1. 
2. 
3. 

### Recommended Prompt Changes
[Include full updated prompt]

## JSON Parsing Issues

### Test Results
| Edge Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Malformed JSON | | |
| Missing fields | | |
| Negative in parens | | |
| Single quotes | | |
| Trailing commas | | |

## Recommendations
1. 
2. 
3. 
```

---

# PART 4: Accuracy Measurement Framework

## 4.1 Complete Accuracy Test Suite

```python
# accuracy/run_all_tests.py
"""
Complete accuracy measurement framework for CapEx Intelligence System.
Run this to get full system accuracy report.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

# Import test modules
from accuracy.classification_accuracy import calculate_classification_accuracy
from accuracy.retrieval_accuracy import calculate_retrieval_metrics
from accuracy.extraction_accuracy import calculate_extraction_accuracy

@dataclass
class AccuracyReport:
    timestamp: str
    overall_accuracy: float
    classification_accuracy: float
    retrieval_accuracy: float
    extraction_accuracy: float
    
    classification_details: Dict
    retrieval_details: Dict
    extraction_details: Dict
    
    issues_found: List[Dict]
    recommendations: List[str]

def run_classification_tests(ground_truth_file: str) -> Dict:
    """Run classification accuracy tests."""
    print("\n" + "="*60)
    print("RUNNING CLASSIFICATION TESTS")
    print("="*60)
    
    from extraction.document_classifier import classify_document
    
    start_time = time.time()
    results = calculate_classification_accuracy(
        ground_truth_file,
        classify_document
    )
    elapsed = time.time() - start_time
    
    print(f"Classification Accuracy: {results['overall_accuracy']}%")
    print(f"Time: {elapsed:.1f}s")
    
    results['elapsed_seconds'] = elapsed
    return results

def run_retrieval_tests(ground_truth_file: str) -> Dict:
    """Run retrieval accuracy tests."""
    print("\n" + "="*60)
    print("RUNNING RETRIEVAL TESTS")
    print("="*60)
    
    from rag.retriever import retrieve_documents
    
    start_time = time.time()
    results = calculate_retrieval_metrics(
        ground_truth_file,
        retrieve_documents,
        k=10
    )
    elapsed = time.time() - start_time
    
    print(f"Retrieval Success Rate: {results['success_rate']*100}%")
    print(f"Mean Reciprocal Rank: {results['avg_mrr']}")
    print(f"Time: {elapsed:.1f}s")
    
    results['elapsed_seconds'] = elapsed
    return results

def run_extraction_tests(ground_truth_file: str) -> Dict:
    """Run extraction accuracy tests."""
    print("\n" + "="*60)
    print("RUNNING EXTRACTION TESTS")
    print("="*60)
    
    from extraction.ai_extractor import extract_financial_data
    
    start_time = time.time()
    results = calculate_extraction_accuracy(
        ground_truth_file,
        extract_financial_data
    )
    elapsed = time.time() - start_time
    
    print(f"Extraction Accuracy: {results['overall_accuracy']}%")
    print(f"CapEx Accuracy: {results['field_accuracy'].get('capital_expenditures', 0)}%")
    print(f"Time: {elapsed:.1f}s")
    
    results['elapsed_seconds'] = elapsed
    return results

def calculate_overall_accuracy(
    classification_results: Dict,
    retrieval_results: Dict,
    extraction_results: Dict
) -> float:
    """
    Calculate weighted overall system accuracy.
    
    Weights:
    - Classification: 15% (errors here cascade downstream)
    - Retrieval: 25% (critical for RAG quality)
    - Extraction: 60% (end goal - financial data accuracy)
    """
    
    weights = {
        'classification': 0.15,
        'retrieval': 0.25,
        'extraction': 0.60,
    }
    
    classification_score = classification_results.get('overall_accuracy', 0)
    retrieval_score = retrieval_results.get('success_rate', 0) * 100
    extraction_score = extraction_results.get('overall_accuracy', 0)
    
    overall = (
        classification_score * weights['classification'] +
        retrieval_score * weights['retrieval'] +
        extraction_score * weights['extraction']
    )
    
    return round(overall, 2)

def identify_issues(
    classification_results: Dict,
    retrieval_results: Dict,
    extraction_results: Dict
) -> List[Dict]:
    """Identify and categorize issues from test results."""
    
    issues = []
    
    # Classification issues
    if classification_results.get('overall_accuracy', 100) < 90:
        for error in classification_results.get('errors', [])[:5]:
            issues.append({
                'category': 'classification',
                'severity': 'high' if error['field'] in ['company', 'doc_type'] else 'medium',
                'description': f"Misclassified {error['field']}: expected {error['expected']}, got {error['actual']}",
                'file': error['file'],
            })
    
    # Retrieval issues
    if retrieval_results.get('success_rate', 1) < 0.9:
        for failed in retrieval_results.get('failed_queries', [])[:5]:
            issues.append({
                'category': 'retrieval',
                'severity': 'high',
                'description': f"Failed to retrieve relevant documents for: {failed['query'][:50]}...",
                'retrieved': failed.get('retrieved', [])[:3],
            })
    
    # Extraction issues
    for error in extraction_results.get('errors', [])[:5]:
        severity = 'critical' if error['field'] == 'capital_expenditures' else 'medium'
        issues.append({
            'category': 'extraction',
            'severity': severity,
            'description': f"Extraction error in {error['field']}: expected {error['expected']}, got {error['actual']}",
            'file': error['file'],
            'percentage_error': error.get('percentage_error', 'N/A'),
        })
    
    # Sort by severity
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    issues.sort(key=lambda x: severity_order.get(x['severity'], 4))
    
    return issues

def generate_recommendations(issues: List[Dict]) -> List[str]:
    """Generate recommendations based on issues found."""
    
    recommendations = []
    
    # Count issues by category
    category_counts = {}
    for issue in issues:
        cat = issue['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Classification recommendations
    if category_counts.get('classification', 0) > 0:
        recommendations.append(
            "Review document classification logic - consider using SEC filing headers "
            "instead of keyword matching for 10-K vs 10-Q distinction"
        )
    
    # Retrieval recommendations
    if category_counts.get('retrieval', 0) > 0:
        recommendations.append(
            "Implement company-aware filtering in retrieval to prevent cross-company contamination"
        )
        recommendations.append(
            "Review chunk size and overlap settings - consider larger chunks for financial context"
        )
    
    # Extraction recommendations
    if category_counts.get('extraction', 0) > 0:
        recommendations.append(
            "Update extraction prompts with explicit YTD vs quarterly distinction instructions"
        )
        recommendations.append(
            "Add validation for negative number handling in JSON parser"
        )
    
    # Critical issues
    critical_count = sum(1 for i in issues if i['severity'] == 'critical')
    if critical_count > 0:
        recommendations.insert(0, 
            f"URGENT: {critical_count} critical extraction errors found - prioritize fixing CapEx extraction"
        )
    
    return recommendations

def generate_report(
    classification_results: Dict,
    retrieval_results: Dict,
    extraction_results: Dict,
    output_file: str = None
) -> AccuracyReport:
    """Generate comprehensive accuracy report."""
    
    overall = calculate_overall_accuracy(
        classification_results,
        retrieval_results,
        extraction_results
    )
    
    issues = identify_issues(
        classification_results,
        retrieval_results,
        extraction_results
    )
    
    recommendations = generate_recommendations(issues)
    
    report = AccuracyReport(
        timestamp=datetime.now().isoformat(),
        overall_accuracy=overall,
        classification_accuracy=classification_results.get('overall_accuracy', 0),
        retrieval_accuracy=retrieval_results.get('success_rate', 0) * 100,
        extraction_accuracy=extraction_results.get('overall_accuracy', 0),
        classification_details=classification_results,
        retrieval_details=retrieval_results,
        extraction_details=extraction_results,
        issues_found=issues,
        recommendations=recommendations,
    )
    
    # Save report
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(asdict(report), f, indent=2)
        print(f"\nReport saved to: {output_file}")
    
    return report

def print_report(report: AccuracyReport):
    """Print formatted accuracy report."""
    
    print("\n" + "="*60)
    print("CAPEX INTELLIGENCE SYSTEM - ACCURACY REPORT")
    print("="*60)
    print(f"Generated: {report.timestamp}")
    
    print("\n" + "-"*40)
    print("OVERALL SCORES")
    print("-"*40)
    print(f"Overall System Accuracy:    {report.overall_accuracy}%")
    print(f"  Classification:           {report.classification_accuracy}%")
    print(f"  Retrieval:                {report.retrieval_accuracy}%")
    print(f"  Extraction:               {report.extraction_accuracy}%")
    
    print("\n" + "-"*40)
    print(f"ISSUES FOUND ({len(report.issues_found)})")
    print("-"*40)
    
    for i, issue in enumerate(report.issues_found[:10], 1):
        severity_icon = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        }.get(issue['severity'], '⚪')
        print(f"{i}. {severity_icon} [{issue['category'].upper()}] {issue['description'][:60]}...")
    
    print("\n" + "-"*40)
    print("RECOMMENDATIONS")
    print("-"*40)
    for i, rec in enumerate(report.recommendations, 1):
        print(f"{i}. {rec}")
    
    print("\n" + "="*60)

def main():
    """Run complete accuracy test suite."""
    
    # File paths
    classification_gt = "ground_truth/classification_ground_truth.json"
    retrieval_gt = "ground_truth/retrieval_ground_truth.json"
    extraction_gt = "ground_truth/extraction_ground_truth.json"
    
    # Check files exist
    for f in [classification_gt, retrieval_gt, extraction_gt]:
        if not Path(f).exists():
            print(f"ERROR: Ground truth file not found: {f}")
            print("Please create ground truth files before running tests.")
            return
    
    # Run tests
    classification_results = run_classification_tests(classification_gt)
    retrieval_results = run_retrieval_tests(retrieval_gt)
    extraction_results = run_extraction_tests(extraction_gt)
    
    # Generate report
    report = generate_report(
        classification_results,
        retrieval_results,
        extraction_results,
        output_file=f"reports/accuracy_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    
    # Print report
    print_report(report)
    
    return report

if __name__ == "__main__":
    main()
```

## 4.2 Extraction Accuracy Implementation

```python
# accuracy/extraction_accuracy.py
import json
from typing import Dict, List, Any, Callable
from dataclasses import dataclass

@dataclass
class ExtractionResult:
    file: str
    field: str
    expected: Any
    actual: Any
    correct: bool
    percentage_error: float = None

def calculate_extraction_accuracy(
    ground_truth_file: str,
    extractor_func: Callable,
    tolerance: float = 0.02  # 2% tolerance for numeric values
) -> Dict:
    """Calculate extraction accuracy against ground truth."""
    
    with open(ground_truth_file, 'r') as f:
        ground_truth = json.load(f)
    
    results: List[ExtractionResult] = []
    field_stats = {}
    
    for entry in ground_truth:
        file_path = entry["file"]
        expected_data = entry["financial_data"]
        
        # Run extraction
        try:
            extracted = extractor_func(file_path)
            extracted_data = extracted.get("financial_data", {})
        except Exception as e:
            # Mark all fields as failed
            for field in expected_data:
                results.append(ExtractionResult(
                    file=file_path,
                    field=field,
                    expected=expected_data[field].get("value"),
                    actual=f"ERROR: {e}",
                    correct=False
                ))
            continue
        
        # Compare each field
        for field, expected_field_data in expected_data.items():
            expected_value = expected_field_data.get("value")
            
            if expected_value is None:
                continue  # Skip if no ground truth value
            
            actual_field_data = extracted_data.get(field, {})
            actual_value = actual_field_data.get("value")
            
            # Determine correctness
            if actual_value is None:
                correct = False
                pct_error = 100.0
            elif isinstance(expected_value, (int, float)) and isinstance(actual_value, (int, float)):
                # Numeric comparison with tolerance
                if expected_value != 0:
                    pct_error = abs(expected_value - actual_value) / expected_value * 100
                else:
                    pct_error = 0 if actual_value == 0 else 100
                correct = pct_error <= tolerance * 100
            else:
                # String/categorical comparison
                correct = str(expected_value).lower() == str(actual_value).lower()
                pct_error = 0 if correct else 100
            
            results.append(ExtractionResult(
                file=file_path,
                field=field,
                expected=expected_value,
                actual=actual_value,
                correct=correct,
                percentage_error=round(pct_error, 2)
            ))
            
            # Track field-level stats
            if field not in field_stats:
                field_stats[field] = {"correct": 0, "total": 0, "errors": []}
            field_stats[field]["total"] += 1
            if correct:
                field_stats[field]["correct"] += 1
            else:
                field_stats[field]["errors"].append({
                    "file": file_path,
                    "expected": expected_value,
                    "actual": actual_value,
                    "percentage_error": pct_error
                })
    
    # Calculate metrics
    overall_correct = sum(1 for r in results if r.correct)
    overall_accuracy = overall_correct / len(results) * 100 if results else 0
    
    field_accuracy = {
        field: round(stats["correct"] / stats["total"] * 100, 2)
        for field, stats in field_stats.items()
    }
    
    return {
        "overall_accuracy": round(overall_accuracy, 2),
        "field_accuracy": field_accuracy,
        "total_tests": len(results),
        "total_correct": overall_correct,
        "errors": [
            {
                "file": r.file,
                "field": r.field,
                "expected": r.expected,
                "actual": r.actual,
                "percentage_error": r.percentage_error
            }
            for r in results if not r.correct
        ],
        "field_stats": {
            field: {
                "accuracy": field_accuracy[field],
                "sample_size": stats["total"],
                "error_count": len(stats["errors"])
            }
            for field, stats in field_stats.items()
        }
    }
```

---

# PART 5: Issue Prioritization

## 5.1 Issue Categorization Framework

```python
# prioritization/issue_tracker.py
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum
from datetime import datetime
import json

class Severity(Enum):
    CRITICAL = 1  # System unusable or data corruption
    HIGH = 2      # Major feature broken or >20% accuracy impact
    MEDIUM = 3    # Feature degraded or 5-20% accuracy impact
    LOW = 4       # Minor issue or <5% accuracy impact

class Category(Enum):
    EXTRACTION = "extraction"
    CLASSIFICATION = "classification"
    RETRIEVAL = "retrieval"
    PARSING = "parsing"
    PERFORMANCE = "performance"
    UI = "ui"

@dataclass
class Issue:
    id: str
    title: str
    description: str
    category: Category
    severity: Severity
    accuracy_impact: float  # Percentage points of accuracy affected
    
    affected_files: List[str] = field(default_factory=list)
    root_cause: str = ""
    proposed_fix: str = ""
    fix_complexity: str = ""  # "simple", "moderate", "complex"
    estimated_hours: float = 0
    
    reported_by: str = ""
    reported_date: str = ""
    assigned_to: str = ""
    status: str = "open"  # "open", "in_progress", "testing", "resolved"
    
    def priority_score(self) -> float:
        """
        Calculate priority score (lower = higher priority).
        
        Formula: severity_weight * (1 / accuracy_impact) * complexity_factor
        """
        severity_weights = {
            Severity.CRITICAL: 1,
            Severity.HIGH: 2,
            Severity.MEDIUM: 4,
            Severity.LOW: 8
        }
        
        complexity_factors = {
            "simple": 1,
            "moderate": 1.5,
            "complex": 2
        }
        
        base = severity_weights[self.severity]
        impact_factor = 1 / max(self.accuracy_impact, 0.1)  # Avoid division by zero
        complexity = complexity_factors.get(self.fix_complexity, 1.5)
        
        return base * impact_factor * complexity
    
    def roi_score(self) -> float:
        """
        Calculate ROI: accuracy improvement per hour of work.
        Higher = better ROI.
        """
        if self.estimated_hours == 0:
            return 0
        return self.accuracy_impact / self.estimated_hours

@dataclass
class IssueTracker:
    issues: List[Issue] = field(default_factory=list)
    
    def add_issue(self, issue: Issue):
        self.issues.append(issue)
    
    def get_prioritized_list(self) -> List[Issue]:
        """Return issues sorted by priority (highest first)."""
        return sorted(self.issues, key=lambda x: x.priority_score())
    
    def get_by_roi(self) -> List[Issue]:
        """Return issues sorted by ROI (best first)."""
        return sorted(self.issues, key=lambda x: x.roi_score(), reverse=True)
    
    def get_by_severity(self, severity: Severity) -> List[Issue]:
        """Filter issues by severity."""
        return [i for i in self.issues if i.severity == severity]
    
    def get_by_category(self, category: Category) -> List[Issue]:
        """Filter issues by category."""
        return [i for i in self.issues if i.category == category]
    
    def total_accuracy_impact(self) -> float:
        """Calculate total accuracy impact of all open issues."""
        return sum(i.accuracy_impact for i in self.issues if i.status == "open")
    
    def total_estimated_hours(self) -> float:
        """Calculate total hours to fix all issues."""
        return sum(i.estimated_hours for i in self.issues if i.status == "open")
    
    def generate_roadmap(self, available_hours_per_week: float = 40) -> List[dict]:
        """
        Generate a prioritized improvement roadmap.
        
        Args:
            available_hours_per_week: Team capacity per week
        
        Returns:
            List of sprints with assigned issues
        """
        prioritized = self.get_prioritized_list()
        open_issues = [i for i in prioritized if i.status == "open"]
        
        roadmap = []
        current_sprint = {"sprint": 1, "issues": [], "hours": 0, "accuracy_gain": 0}
        
        for issue in open_issues:
            if current_sprint["hours"] + issue.estimated_hours <= available_hours_per_week:
                current_sprint["issues"].append(issue.id)
                current_sprint["hours"] += issue.estimated_hours
                current_sprint["accuracy_gain"] += issue.accuracy_impact
            else:
                roadmap.append(current_sprint)
                current_sprint = {
                    "sprint": len(roadmap) + 1,
                    "issues": [issue.id],
                    "hours": issue.estimated_hours,
                    "accuracy_gain": issue.accuracy_impact
                }
        
        if current_sprint["issues"]:
            roadmap.append(current_sprint)
        
        # Calculate cumulative accuracy
        cumulative = 0
        for sprint in roadmap:
            cumulative += sprint["accuracy_gain"]
            sprint["cumulative_accuracy_gain"] = round(cumulative, 2)
        
        return roadmap
    
    def to_json(self, file_path: str):
        """Save issues to JSON file."""
        data = {
            "generated": datetime.now().isoformat(),
            "summary": {
                "total_issues": len(self.issues),
                "by_severity": {
                    s.name: len(self.get_by_severity(s)) 
                    for s in Severity
                },
                "total_accuracy_impact": self.total_accuracy_impact(),
                "total_estimated_hours": self.total_estimated_hours(),
            },
            "issues": [
                {
                    "id": i.id,
                    "title": i.title,
                    "description": i.description,
                    "category": i.category.value,
                    "severity": i.severity.name,
                    "accuracy_impact": i.accuracy_impact,
                    "affected_files": i.affected_files,
                    "root_cause": i.root_cause,
                    "proposed_fix": i.proposed_fix,
                    "fix_complexity": i.fix_complexity,
                    "estimated_hours": i.estimated_hours,
                    "priority_score": round(i.priority_score(), 2),
                    "roi_score": round(i.roi_score(), 2),
                    "status": i.status,
                    "assigned_to": i.assigned_to,
                }
                for i in self.issues
            ],
            "roadmap": self.generate_roadmap()
        }
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
```

## 5.2 Sample Issue Registry

```python
# prioritization/known_issues.py
from prioritization.issue_tracker import Issue, IssueTracker, Severity, Category

def create_known_issues() -> IssueTracker:
    """Create tracker with known issues from review."""
    
    tracker = IssueTracker()
    
    # Critical Issues
    tracker.add_issue(Issue(
        id="EXT-001",
        title="YTD vs Quarterly CapEx Confusion",
        description="System extracts YTD values instead of quarterly values for 10-Q filings, "
                    "resulting in 2-3x overstatement of quarterly CapEx",
        category=Category.EXTRACTION,
        severity=Severity.CRITICAL,
        accuracy_impact=25.0,  # Affects 25% of extractions
        affected_files=["extraction/ai_extractor.py", "extraction/prompts.py"],
        root_cause="Prompt doesn't specify to extract quarterly-only values; "
                   "AI defaults to largest number found",
        proposed_fix="Update prompt with explicit instructions for period identification. "
                     "Add validation to reject values that exceed typical quarterly ranges.",
        fix_complexity="moderate",
        estimated_hours=4,
        reported_by="Person 3",
        status="open"
    ))
    
    tracker.add_issue(Issue(
        id="EXT-002",
        title="Negative Number Handling in CapEx",
        description="CapEx values shown as (505) or -505 in cash flow statements "
                    "are sometimes extracted as negative or zero",
        category=Category.PARSING,
        severity=Severity.HIGH,
        accuracy_impact=15.0,
        affected_files=["extraction/json_parser.py", "extraction/ai_extractor.py"],
        root_cause="JSON parser doesn't convert parenthetical notation to positive numbers",
        proposed_fix="Add regex-based preprocessing to convert (X) to X and handle -X signs",
        fix_complexity="simple",
        estimated_hours=2,
        reported_by="Person 3",
        status="open"
    ))
    
    # High Priority Issues
    tracker.add_issue(Issue(
        id="RET-001",
        title="Cross-Company Contamination in Retrieval",
        description="Queries for Flex sometimes return Jabil documents in top results",
        category=Category.RETRIEVAL,
        severity=Severity.HIGH,
        accuracy_impact=12.0,
        affected_files=["rag/retriever.py", "rag/vector_store.py"],
        root_cause="Company name not used in metadata filtering; embedding similarity alone "
                   "ranks documents with similar content together regardless of company",
        proposed_fix="Implement automatic company detection from query and add metadata filter",
        fix_complexity="moderate",
        estimated_hours=3,
        reported_by="Person 2",
        status="open"
    ))
    
    tracker.add_issue(Issue(
        id="CLS-001",
        title="10-K vs 10-Q Misclassification",
        description="10-K filings sometimes classified as 10-Q and vice versa",
        category=Category.CLASSIFICATION,
        severity=Severity.HIGH,
        accuracy_impact=8.0,
        affected_files=["extraction/document_classifier.py"],
        root_cause="Classification relies on keyword matching; both doc types contain "
                   "similar keywords like 'quarterly' in 10-K summaries",
        proposed_fix="Check for 'FORM 10-K' or 'FORM 10-Q' in filing header; "
                     "use filing period length as secondary check",
        fix_complexity="simple",
        estimated_hours=2,
        reported_by="Person 1",
        status="open"
    ))
    
    # Medium Priority Issues
    tracker.add_issue(Issue(
        id="EXT-003",
        title="Alternative CapEx Label Recognition",
        description="System misses CapEx when labeled as 'Additions to property' "
                    "instead of 'Capital expenditures'",
        category=Category.EXTRACTION,
        severity=Severity.MEDIUM,
        accuracy_impact=7.0,
        affected_files=["extraction/prompts.py"],
        root_cause="Prompt doesn't list all common CapEx label variations",
        proposed_fix="Add comprehensive list of CapEx labels to prompt",
        fix_complexity="simple",
        estimated_hours=1,
        reported_by="Person 3",
        status="open"
    ))
    
    tracker.add_issue(Issue(
        id="RET-002",
        title="Chunk Boundary Splits Numbers from Context",
        description="Financial numbers sometimes appear at chunk boundaries, "
                    "separated from their labels",
        category=Category.RETRIEVAL,
        severity=Severity.MEDIUM,
        accuracy_impact=5.0,
        affected_files=["rag/chunker.py"],
        root_cause="Fixed-size chunking doesn't consider sentence or paragraph boundaries",
        proposed_fix="Implement sentence-aware chunking with financial context preservation",
        fix_complexity="moderate",
        estimated_hours=4,
        reported_by="Person 2",
        status="open"
    ))
    
    tracker.add_issue(Issue(
        id="PDF-001",
        title="Multi-Column PDF Extraction Garbled",
        description="Text from multi-column PDFs extracted in wrong reading order",
        category=Category.EXTRACTION,
        severity=Severity.MEDIUM,
        accuracy_impact=6.0,
        affected_files=["extraction/pdf_extractor.py"],
        root_cause="PyPDF2 extracts text left-to-right across page, not column-by-column",
        proposed_fix="Switch to pdfplumber with layout-aware extraction",
        fix_complexity="moderate",
        estimated_hours=3,
        reported_by="Person 1",
        status="open"
    ))
    
    # Low Priority Issues
    tracker.add_issue(Issue(
        id="PERF-001",
        title="Slow Embedding Generation",
        description="Embedding generation takes 2-3 seconds per query",
        category=Category.PERFORMANCE,
        severity=Severity.LOW,
        accuracy_impact=0.0,
        affected_files=["rag/embeddings.py"],
        root_cause="Model loaded fresh for each query",
        proposed_fix="Implement model caching and warm-up on startup",
        fix_complexity="simple",
        estimated_hours=2,
        reported_by="Person 2",
        status="open"
    ))
    
    return tracker

# Generate issue report
if __name__ == "__main__":
    tracker = create_known_issues()
    
    print("="*60)
    print("ISSUE PRIORITIZATION REPORT")
    print("="*60)
    
    print(f"\nTotal Issues: {len(tracker.issues)}")
    print(f"Total Accuracy Impact: {tracker.total_accuracy_impact()}%")
    print(f"Total Estimated Hours: {tracker.total_estimated_hours()}")
    
    print("\n" + "-"*40)
    print("PRIORITIZED ISSUE LIST")
    print("-"*40)
    
    for i, issue in enumerate(tracker.get_prioritized_list(), 1):
        print(f"\n{i}. [{issue.severity.name}] {issue.id}: {issue.title}")
        print(f"   Impact: {issue.accuracy_impact}% | Hours: {issue.estimated_hours} | ROI: {issue.roi_score():.2f}")
        print(f"   Files: {', '.join(issue.affected_files)}")
    
    print("\n" + "-"*40)
    print("IMPROVEMENT ROADMAP")
    print("-"*40)
    
    roadmap = tracker.generate_roadmap(available_hours_per_week=40)
    
    for sprint in roadmap:
        print(f"\nSprint {sprint['sprint']}:")
        print(f"  Issues: {', '.join(sprint['issues'])}")
        print(f"  Hours: {sprint['hours']}")
        print(f"  Accuracy Gain: +{sprint['accuracy_gain']}%")
        print(f"  Cumulative Gain: +{sprint['cumulative_accuracy_gain']}%")
    
    # Save to file
    tracker.to_json("reports/issue_prioritization.json")
    print(f"\nFull report saved to: reports/issue_prioritization.json")
```

## 5.3 Prioritized Improvement Roadmap Summary

| Sprint | Issues | Hours | Accuracy Gain | Cumulative |
|--------|--------|-------|---------------|------------|
| 1 | EXT-001 (YTD/Quarterly), EXT-002 (Negative numbers) | 6 | +40% | +40% |
| 2 | RET-001 (Cross-company), CLS-001 (10-K/10-Q) | 5 | +20% | +60% |
| 3 | EXT-003 (Alt labels), PDF-001 (Multi-column) | 4 | +13% | +73% |
| 4 | RET-002 (Chunk boundaries), PERF-001 (Speed) | 6 | +5% | +78% |

## 5.4 ROI-Based Priority (Accuracy Gain per Hour)

| Issue | Impact | Hours | ROI Score |
|-------|--------|-------|-----------|
| EXT-002 | +15% | 2 | 7.5 |
| EXT-003 | +7% | 1 | 7.0 |
| EXT-001 | +25% | 4 | 6.25 |
| CLS-001 | +8% | 2 | 4.0 |
| RET-001 | +12% | 3 | 4.0 |
| PDF-001 | +6% | 3 | 2.0 |
| RET-002 | +5% | 4 | 1.25 |
| PERF-001 | 0% | 2 | 0.0 |

---

## Appendix: Ground Truth File Templates

### classification_ground_truth.json
```json
[
  {
    "file": "data/flex_10k_2024.pdf",
    "expected": {
      "company": "Flex Ltd",
      "ticker": "FLEX",
      "doc_type": "10-K",
      "fiscal_year": 2024,
      "quarter": null
    }
  }
]
```

### retrieval_ground_truth.json
```json
[
  {
    "query": "Flex capital expenditure fiscal 2024",
    "relevant_doc_ids": ["flex_10k_2024_chunk_45", "flex_10k_2024_chunk_46"],
    "expected_top_doc": "flex_10k_2024_chunk_45"
  }
]
```

### extraction_ground_truth.json
```json
[
  {
    "file": "data/flex_10k_2024.pdf",
    "financial_data": {
      "capital_expenditures": {
        "value": 505,
        "unit": "million",
        "currency": "USD",
        "period_type": "annual",
        "source_text": "Capital expenditures were $505 million"
      }
    }
  }
]
```

---

## Quick Reference: Team Assignments

| Person | Focus Area | Key Files | Deliverables |
|--------|------------|-----------|--------------|
| 1 | Text Extraction & Classification | `pdf_extractor.py`, `document_classifier.py` | Extraction quality report, Classification accuracy metrics |
| 2 | RAG & Vector Search | `retriever.py`, `vector_store.py`, `chunker.py` | Retrieval accuracy metrics, Chunk optimization results |
| 3 | AI Extraction & Data Quality | `ai_extractor.py`, `prompts.py`, `json_parser.py` | Ground truth dataset, Extraction accuracy, Prompt improvements |

---

*Generated for CapEx Intelligence System Review - Team of 3*
