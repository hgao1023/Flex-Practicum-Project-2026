# CapEx System Review - Quick Start Guide

> **Supplementary guide with practical instructions for the 3-person team**

---

## Before You Start (Everyone - 15 min)

### 1. Check Your Environment

```bash
# Verify Python
python3 --version  # Should be 3.9+

# Verify project location
cd ~/Documents/flex_practicum
ls -la
# Should see: Flex/, Jabil/, Celestica/, Benchmark/, Sanmina/
```

### 2. Install Test Dependencies

```bash
pip install pytest pandas openpyxl pdfplumber --break-system-packages
```

### 3. Create Test Structure

```bash
mkdir -p test_data reports ground_truth
```

### 4. Verify Actual File Paths

```bash
# Find your actual 10-K files
find . -name "*10-K*" -o -name "*10K*" | head -10

# Example output:
# ./Flex/Flex_10K_FY2024.pdf
# ./Jabil/JBL_10K_2024.pdf
```

**Important:** Update all test code to use YOUR actual file paths!

---

## Person 1: Text Extraction & Classification

### START HERE (Day 1, Hour 1)

**Today's Goals:**
1. Test 5 PDFs for extraction quality (1 hour)
2. Run classification test on 10 docs (30 min)
3. Document findings (30 min)

### Step 1: Create Classification Test

Create file `test_classification_real.py`:

```python
"""
Person 1: Classification accuracy test
Run: python test_classification_real.py
"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# UPDATE THESE PATHS to match your actual files!
TEST_CASES = [
    {
        "file": "Flex/Flex_10K_FY2024.pdf",  # UPDATE THIS
        "expected": {
            "company": "Flex",
            "doc_type": "10-K",
            "fiscal_year": 2024,
        }
    },
    {
        "file": "Flex/Flex_10Q_Q1_2024.pdf",  # UPDATE THIS
        "expected": {
            "company": "Flex",
            "doc_type": "10-Q",
            "fiscal_year": 2024,
            "quarter": 1,
        }
    },
    {
        "file": "Jabil/JBL_10K_2024.pdf",  # UPDATE THIS
        "expected": {
            "company": "Jabil",
            "doc_type": "10-K",
            "fiscal_year": 2024,
        }
    },
    # Add more test cases...
]

def run_classification_test():
    """Run classification and compare to expected."""
    
    # Import your classifier
    try:
        from extraction.document_classifier import classify_document
    except ImportError:
        print("ERROR: Cannot import classifier. Check your project structure.")
        print("Expected: extraction/document_classifier.py with classify_document() function")
        return
    
    results = []
    
    for case in TEST_CASES:
        file_path = case["file"]
        
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            continue
        
        print(f"\nTesting: {file_path}")
        
        try:
            actual = classify_document(file_path)
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            results.append({"file": file_path, "status": "error", "error": str(e)})
            continue
        
        # Compare fields
        errors = []
        for field, expected_value in case["expected"].items():
            actual_value = actual.get(field)
            if actual_value != expected_value:
                errors.append(f"{field}: expected '{expected_value}', got '{actual_value}'")
        
        if errors:
            print(f"  ❌ FAIL:")
            for e in errors:
                print(f"     - {e}")
            results.append({"file": file_path, "status": "fail", "errors": errors})
        else:
            print(f"  ✅ PASS")
            results.append({"file": file_path, "status": "pass"})
    
    # Summary
    print("\n" + "="*50)
    print("CLASSIFICATION TEST SUMMARY")
    print("="*50)
    
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    errors = sum(1 for r in results if r["status"] == "error")
    
    print(f"Total:  {total}")
    print(f"Passed: {passed} ({passed/total*100:.1f}%)" if total > 0 else "Passed: 0")
    print(f"Failed: {failed}")
    print(f"Errors: {errors}")
    
    accuracy = passed / total * 100 if total > 0 else 0
    print(f"\nACCURACY: {accuracy:.1f}%")
    
    return results

if __name__ == "__main__":
    run_classification_test()
```

### Step 2: Run Test

```bash
cd ~/Documents/flex_practicum
python test_classification_real.py
```

### Step 3: Test Extraction Quality

Create file `test_extraction_quality.py`:

```python
"""
Person 1: PDF extraction quality test
Checks for common extraction issues
"""
import os
import re

def test_pdf_extraction(pdf_path: str):
    """Test extraction quality for a single PDF."""
    
    # Try pdfplumber first (better quality)
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages[:10]:  # First 10 pages
                text += (page.extract_text() or "") + "\n"
    except:
        # Fallback to PyPDF2
        from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages[:10]:
            text += page.extract_text() + "\n"
    
    issues = []
    
    # Check 1: Numbers split from context
    # Bad: "Capital expenditures 505" on different lines
    orphan_numbers = re.findall(r'^\s*[\d,]+\s*$', text, re.MULTILINE)
    if len(orphan_numbers) > 10:
        issues.append(f"ISSUE: {len(orphan_numbers)} orphan numbers (numbers on their own line)")
    
    # Check 2: Garbled table structure
    # Bad: "Item 2024 2023 Revenue 1000 900"
    garbled_pattern = r'[A-Za-z]+\s+\d{4}\s+\d{4}\s+[A-Za-z]+'
    garbled = re.findall(garbled_pattern, text[:5000])
    if garbled:
        issues.append(f"ISSUE: Possibly garbled tables: {garbled[:2]}")
    
    # Check 3: Multi-column confusion
    # Check if "Item 7" comes after "Item 8" (wrong order)
    item7_pos = text.find("Item 7")
    item8_pos = text.find("Item 8")
    if item7_pos > 0 and item8_pos > 0 and item7_pos > item8_pos:
        issues.append("ISSUE: Multi-column text in wrong reading order (Item 8 before Item 7)")
    
    # Check 4: Missing key sections
    key_sections = ["cash flow", "capital expenditure", "revenue"]
    for section in key_sections:
        if section not in text.lower():
            issues.append(f"WARNING: '{section}' not found in extracted text")
    
    # Check 5: Text length sanity
    if len(text) < 10000:
        issues.append(f"WARNING: Extracted text seems short ({len(text)} chars)")
    
    return {
        "file": pdf_path,
        "text_length": len(text),
        "issues": issues,
        "sample": text[:500]  # First 500 chars as sample
    }

def run_extraction_tests():
    """Test extraction on multiple files."""
    
    # UPDATE THESE PATHS!
    test_files = [
        "Flex/Flex_10K_FY2024.pdf",
        "Jabil/JBL_10K_2024.pdf",
        "Celestica/CLS_10K_2024.pdf",
    ]
    
    print("="*60)
    print("PDF EXTRACTION QUALITY TEST")
    print("="*60)
    
    for pdf_path in test_files:
        if not os.path.exists(pdf_path):
            print(f"\n⚠️  File not found: {pdf_path}")
            continue
        
        print(f"\n📄 Testing: {pdf_path}")
        
        result = test_pdf_extraction(pdf_path)
        
        print(f"   Text length: {result['text_length']:,} characters")
        
        if result['issues']:
            print(f"   Issues found: {len(result['issues'])}")
            for issue in result['issues']:
                print(f"   ❌ {issue}")
        else:
            print("   ✅ No issues detected")
        
        print(f"\n   Sample text:")
        print(f"   {result['sample'][:200]}...")

if __name__ == "__main__":
    run_extraction_tests()
```

### Step 4: Document Findings

Create `reports/Person1_Findings.md`:

```markdown
# Person 1 Findings: Text Extraction & Classification

**Date:** YYYY-MM-DD
**Tested by:** [Your Name]

## Classification Accuracy

| Test | Result |
|------|--------|
| Files tested | X |
| Passed | X |
| Failed | X |
| **Accuracy** | XX% |

### Failures:
1. File: `xxx.pdf` - Expected 10-K, got 10-Q
2. ...

## Extraction Quality

| Check | Status |
|-------|--------|
| Multi-column text | ✅/❌ |
| Table extraction | ✅/❌ |
| Number preservation | ✅/❌ |

### Issues Found:

**Issue 1:** [Description]
- Severity: High/Medium/Low
- Example: [paste actual garbled text]
- Proposed fix: [solution]
- Est. time: X hours

## Recommendations
1. ...
2. ...
```

---

## Person 2: RAG & Vector Search

### START HERE (Day 1, Hour 1)

**Today's Goals:**
1. Test 5 queries for retrieval accuracy (1 hour)
2. Check for cross-company contamination (30 min)
3. Document findings (30 min)

### Step 1: Create Retrieval Test

Create file `test_retrieval_real.py`:

```python
"""
Person 2: RAG retrieval accuracy test
Run: python test_retrieval_real.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test queries - UPDATE company names if needed
TEST_QUERIES = [
    {
        "query": "Flex capital expenditure fiscal 2024",
        "expected_company": "Flex",
        "keywords": ["capital", "expenditure", "capex"],
    },
    {
        "query": "Jabil revenue 2024",
        "expected_company": "Jabil",
        "keywords": ["revenue", "sales"],
    },
    {
        "query": "Celestica data center investments",
        "expected_company": "Celestica",
        "keywords": ["data center", "investment", "AI"],
    },
    {
        "query": "What was Flex's CapEx spending?",
        "expected_company": "Flex",
        "keywords": ["capex", "capital", "expenditure", "property"],
    },
    {
        "query": "Sanmina manufacturing facilities",
        "expected_company": "Sanmina",
        "keywords": ["manufacturing", "facility", "plant"],
    },
]

def run_retrieval_test():
    """Test retrieval accuracy."""
    
    # Import your retriever
    try:
        from rag.retriever import retrieve_documents
    except ImportError:
        print("ERROR: Cannot import retriever.")
        print("Expected: rag/retriever.py with retrieve_documents() function")
        return
    
    results = []
    
    for case in TEST_QUERIES:
        query = case["query"]
        expected_company = case["expected_company"]
        keywords = case["keywords"]
        
        print(f"\n🔍 Query: {query}")
        
        try:
            docs = retrieve_documents(query, top_k=5)
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            results.append({"query": query, "status": "error"})
            continue
        
        if not docs:
            print("  ❌ No documents retrieved")
            results.append({"query": query, "status": "no_results"})
            continue
        
        # Check top result
        top_doc = docs[0]
        top_company = top_doc.get("metadata", {}).get("company", "Unknown")
        top_content = top_doc.get("content", "")[:200].lower()
        
        # Check company match
        company_match = expected_company.lower() in top_company.lower()
        
        # Check keyword match
        keyword_match = any(kw.lower() in top_content for kw in keywords)
        
        # Check for cross-company contamination
        companies_in_results = [d.get("metadata", {}).get("company", "") for d in docs]
        contamination = any(c != expected_company and c != "" for c in companies_in_results[:3])
        
        print(f"  Top result company: {top_company}")
        print(f"  Company match: {'✅' if company_match else '❌'}")
        print(f"  Keyword match: {'✅' if keyword_match else '❌'}")
        print(f"  Cross-company contamination: {'⚠️ YES' if contamination else '✅ NO'}")
        
        if contamination:
            print(f"    Companies in top 3: {companies_in_results[:3]}")
        
        results.append({
            "query": query,
            "status": "pass" if (company_match and keyword_match) else "fail",
            "company_match": company_match,
            "keyword_match": keyword_match,
            "contamination": contamination,
        })
    
    # Summary
    print("\n" + "="*50)
    print("RETRIEVAL TEST SUMMARY")
    print("="*50)
    
    total = len(results)
    passed = sum(1 for r in results if r.get("status") == "pass")
    contaminated = sum(1 for r in results if r.get("contamination"))
    
    print(f"Total queries:  {total}")
    print(f"Passed:         {passed}")
    print(f"Contaminated:   {contaminated}")
    print(f"\nSUCCESS RATE: {passed/total*100:.1f}%" if total > 0 else "")
    
    if contaminated > 0:
        print(f"\n⚠️  WARNING: {contaminated} queries had cross-company contamination!")

if __name__ == "__main__":
    run_retrieval_test()
```

### Step 2: Run Test

```bash
cd ~/Documents/flex_practicum
python test_retrieval_real.py
```

### Step 3: Document Findings

Create `reports/Person2_Findings.md`:

```markdown
# Person 2 Findings: RAG & Vector Search

**Date:** YYYY-MM-DD
**Tested by:** [Your Name]

## Retrieval Accuracy

| Metric | Value |
|--------|-------|
| Queries tested | X |
| Success rate | XX% |
| Cross-company contamination | X cases |

## Current Configuration

| Setting | Value |
|---------|-------|
| Chunk size | XXX |
| Overlap | XXX |
| Top-K | XX |
| Embedding model | XXX |

## Issues Found:

**Issue 1:** Cross-company contamination
- Query: "Flex capital expenditure"
- Got: Jabil document in top 3
- Impact: Wrong data returned
- Fix: Add company filter

## Recommendations
1. ...
```

---

## Person 3: AI Extraction & Ground Truth

### START HERE (Day 1, Hour 1)

**Today's Goals:**
1. **CREATE GROUND TRUTH** (Critical - do this first!) (1.5 hours)
2. Run extraction test (30 min)
3. Document findings (30 min)

### Step 1: Create Ground Truth (DO THIS FIRST!)

This is the **most important task**. You need to manually extract the correct values from documents.

Create file `ground_truth/create_ground_truth.py`:

```python
"""
Person 3: Ground truth creation helper
This generates a template - you must fill in values manually!
"""
import json
import os

# Documents to create ground truth for
# UPDATE THESE PATHS!
DOCUMENTS = [
    {
        "file": "Flex/Flex_10K_FY2024.pdf",
        "company": "Flex",
        "doc_type": "10-K",
        "fiscal_year": 2024,
    },
    {
        "file": "Flex/Flex_10Q_Q1_2024.pdf",
        "company": "Flex",
        "doc_type": "10-Q",
        "fiscal_year": 2024,
        "quarter": 1,
    },
    {
        "file": "Jabil/JBL_10K_2024.pdf",
        "company": "Jabil",
        "doc_type": "10-K",
        "fiscal_year": 2024,
    },
    # Add more...
]

def create_template():
    """Generate template for manual data entry."""
    
    template = []
    
    for doc in DOCUMENTS:
        entry = {
            "file": doc["file"],
            "company": doc["company"],
            "doc_type": doc["doc_type"],
            "fiscal_year": doc["fiscal_year"],
            "quarter": doc.get("quarter"),
            
            # FILL THESE IN MANUALLY!
            "financial_data": {
                "capital_expenditures": {
                    "value": None,  # <- FILL THIS IN (number in millions)
                    "unit": "million",
                    "currency": "USD",
                    "period_type": "quarterly" if doc.get("quarter") else "annual",
                    "source_page": None,  # <- Page number where you found it
                    "source_text": "",    # <- Copy exact text from document
                },
            },
            "extracted_by": "",  # Your name
            "extraction_date": "",  # Today's date
        }
        template.append(entry)
    
    # Save template
    output_file = "ground_truth/extraction_ground_truth.json"
    with open(output_file, "w") as f:
        json.dump(template, f, indent=2)
    
    print(f"✅ Template created: {output_file}")
    print(f"   {len(template)} documents to fill in")
    print("\nNEXT STEPS:")
    print("1. Open each PDF file")
    print("2. Find the Cash Flow Statement")
    print("3. Look for 'Capital expenditures' or 'Purchases of property'")
    print("4. Fill in the 'value' field in the JSON")
    print("5. Record the page number and exact text")

if __name__ == "__main__":
    os.makedirs("ground_truth", exist_ok=True)
    create_template()
```

### Step 2: Fill in Ground Truth Manually

**How to find CapEx in a 10-K/10-Q:**

1. Open PDF in Preview/Acrobat
2. Press Ctrl+F (or Cmd+F on Mac)
3. Search for: `cash flow`
4. Navigate to "Consolidated Statements of Cash Flows"
5. Look in "Investing Activities" section
6. Find line: "Purchases of property, plant and equipment" or "Capital expenditures"
7. Note the number (it may be in parentheses like (505) = negative cash flow = $505M spent)

**Example finding:**

```
PDF: Flex_10K_FY2024.pdf
Page: 67
Section: Consolidated Statements of Cash Flows

Investing Activities:
  Purchases of property and equipment    (505)
                                         ^^^^
This means CapEx = $505 million
```

Fill in `ground_truth/extraction_ground_truth.json`:

```json
{
  "file": "Flex/Flex_10K_FY2024.pdf",
  "financial_data": {
    "capital_expenditures": {
      "value": 505,  // <- You filled this in
      "source_page": 67,
      "source_text": "Purchases of property and equipment (505)"
    }
  }
}
```

### Step 3: Test Extraction Accuracy

Create file `test_extraction_real.py`:

```python
"""
Person 3: Extraction accuracy test against ground truth
Run AFTER filling in ground_truth/extraction_ground_truth.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_extraction_test():
    """Compare AI extraction to ground truth."""
    
    # Load ground truth
    gt_file = "ground_truth/extraction_ground_truth.json"
    if not os.path.exists(gt_file):
        print(f"ERROR: Ground truth file not found: {gt_file}")
        print("Run: python ground_truth/create_ground_truth.py")
        print("Then fill in the values manually!")
        return
    
    with open(gt_file, "r") as f:
        ground_truth = json.load(f)
    
    # Check if ground truth is filled in
    unfilled = [g for g in ground_truth 
                if g["financial_data"]["capital_expenditures"]["value"] is None]
    if unfilled:
        print(f"⚠️  {len(unfilled)} documents still need ground truth values!")
        print("Fill in the 'value' field for each document first.")
        return
    
    # Import extractor
    try:
        from extraction.ai_extractor import extract_financial_data
    except ImportError:
        print("ERROR: Cannot import extractor.")
        print("Expected: extraction/ai_extractor.py with extract_financial_data() function")
        return
    
    results = []
    
    for entry in ground_truth:
        file_path = entry["file"]
        expected_capex = entry["financial_data"]["capital_expenditures"]["value"]
        
        print(f"\n📄 Testing: {file_path}")
        print(f"   Expected CapEx: ${expected_capex}M")
        
        if not os.path.exists(file_path):
            print(f"   ❌ File not found")
            continue
        
        try:
            extracted = extract_financial_data(file_path)
            extracted_capex = extracted.get("financial_data", {}).get(
                "capital_expenditures", {}
            ).get("value")
        except Exception as e:
            print(f"   ❌ Extraction error: {e}")
            results.append({
                "file": file_path,
                "expected": expected_capex,
                "extracted": None,
                "error": str(e),
                "accurate": False
            })
            continue
        
        print(f"   Extracted CapEx: ${extracted_capex}M" if extracted_capex else "   Extracted CapEx: None")
        
        # Calculate accuracy
        if extracted_capex is None:
            pct_error = 100
            accurate = False
        else:
            pct_error = abs(expected_capex - extracted_capex) / expected_capex * 100
            accurate = pct_error <= 5  # Within 5%
        
        print(f"   Error: {pct_error:.1f}%")
        print(f"   {'✅ ACCURATE' if accurate else '❌ INACCURATE'}")
        
        results.append({
            "file": file_path,
            "expected": expected_capex,
            "extracted": extracted_capex,
            "pct_error": pct_error,
            "accurate": accurate
        })
    
    # Summary
    print("\n" + "="*50)
    print("EXTRACTION ACCURACY SUMMARY")
    print("="*50)
    
    total = len(results)
    accurate_count = sum(1 for r in results if r["accurate"])
    
    print(f"Total tested:  {total}")
    print(f"Accurate:      {accurate_count}")
    print(f"Inaccurate:    {total - accurate_count}")
    print(f"\nACCURACY: {accurate_count/total*100:.1f}%" if total > 0 else "")
    
    # Show errors
    errors = [r for r in results if not r["accurate"]]
    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"  {e['file']}: expected {e['expected']}, got {e['extracted']}")

if __name__ == "__main__":
    run_extraction_test()
```

### Step 4: Document Findings

Create `reports/Person3_Findings.md`:

```markdown
# Person 3 Findings: AI Extraction & Data Quality

**Date:** YYYY-MM-DD
**Tested by:** [Your Name]

## Ground Truth Created

| Company | Documents | Completed |
|---------|-----------|-----------|
| Flex | X | ✅ |
| Jabil | X | ✅ |
| Total | X | X |

## Extraction Accuracy

| Metric | Value |
|--------|-------|
| Documents tested | X |
| Accurate (within 5%) | X |
| **Accuracy** | XX% |

## Common Errors

**Error 1:** YTD vs Quarterly confusion
- Example: Q2 filing, expected $120M (quarterly), got $250M (YTD)
- Frequency: X out of Y cases
- Root cause: Prompt doesn't specify period

**Error 2:** Negative number handling
- Example: Expected $505M, got -$505M or $0
- Frequency: X out of Y cases
- Root cause: Parentheses not converted

## Prompt Issues

Current prompt lacks:
1. Period type specification
2. Negative number handling
3. Alternative label list

## Recommendations
1. Update prompt with explicit period instructions
2. Add JSON parser fix for parentheses
3. Add all CapEx label variations
```

---

## Example: What "Broken" Looks Like

### Bad Table Extraction

**Original PDF (Cash Flow Statement):**
```
                                           2024        2023
                                         --------    --------
Operating Activities:
  Net income                               650         580
  Depreciation                             480         450
  
Investing Activities:
  Capital expenditures                    (505)       (480)
```

**Current Extraction (WRONG):**
```
2024 2023 Operating Activities Net income 650 580 Depreciation 480 450 Investing Activities Capital expenditures (505) (480)
```

**What it should be:**
```
Operating Activities:
  Net income: 2024=$650M, 2023=$580M
  Depreciation: 2024=$480M, 2023=$450M
Investing Activities:
  Capital expenditures: 2024=$505M, 2023=$480M
```

### Bad YTD vs Quarterly

**PDF shows (Q3 10-Q):**
```
                           Three Months    Nine Months
                              Ended           Ended
Capital expenditures          (127)           (380)
                               ^^^             ^^^
                            Q3 only          YTD (Q1+Q2+Q3)
```

**System extracts:** `$380M` (WRONG - this is YTD!)
**Should extract:** `$127M` (Q3 only)

### Cross-Company Contamination

**Query:** "Flex capital expenditure 2024"

**Current Results (WRONG):**
1. Jabil_10K_2024.pdf - "Capital expenditures were $1.2B..."
2. Flex_10K_2024.pdf - "Capital expenditures were $505M..."
3. Celestica_10K_2024.pdf - "Capital expenditures..."

**Should be:**
1. Flex_10K_2024.pdf - "Capital expenditures were $505M..."
2. Flex_10Q_Q3_2024.pdf - "Capital expenditures..."
3. Flex_10Q_Q2_2024.pdf - "Capital expenditures..."

---

## Team Coordination

### Daily Standup (15 min, async or sync)

Each person posts in Slack/Teams:
```
**Person X - Day Y Update**
- Tested: [what you tested]
- Accuracy: [score]
- Top issue: [description]
- Blocker: [if any]
- Next: [what you'll do tomorrow]
```

### Shared Tracker

Create Google Sheet with columns:

| Date | Person | Test Type | Files Tested | Accuracy | Top Issue | Status |
|------|--------|-----------|--------------|----------|-----------|--------|
| | | | | | | |

### Friday Review Meeting (1 hour)

Agenda:
1. Each person presents findings (10 min each)
2. Review accuracy scores (5 min)
3. Prioritize top 3 issues (10 min)
4. Assign fixes for next week (15 min)
5. Questions (10 min)

### Deliverables by Friday

Each person submits:
1. `reports/PersonX_Findings.md`
2. Test results (accuracy scores)
3. Top 3 issues with proposed fixes
4. Time estimates for fixes

---

## Commands Cheat Sheet

```bash
# Setup
pip install pytest pandas pdfplumber openpyxl --break-system-packages
mkdir -p test_data reports ground_truth

# Person 1
python test_classification_real.py
python test_extraction_quality.py

# Person 2
python test_retrieval_real.py

# Person 3
python ground_truth/create_ground_truth.py  # Create template
# ... fill in values manually ...
python test_extraction_real.py  # Test accuracy

# All
pytest -v  # Run all tests
```

---

## Next Steps After Testing

| If Accuracy | Action |
|-------------|--------|
| < 50% | Stop. Major architecture issue. Review design. |
| 50-70% | Prioritize top 3 issues. Fix critical ones first. |
| 70-85% | Good progress. Fix medium issues. |
| 85-95% | Fine-tuning phase. Fix edge cases. |
| > 95% | Maintenance mode. Monitor for regressions. |

---

*Quick Start Guide - Supplement to main review plan*
