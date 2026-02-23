# Lucas Cai - Documentation & Quality Assurance Lead

> **Time Commitment:** 5-7 hours/week (evenings/weekends)  
> **Technical Complexity:** Low (no coding required)  
> **Critical Impact:** High (ensures team stays organized and validated)

---

## 🎯 Three Main Responsibilities

### 1. Documentation Coordinator (2-3 hours/week)

**What to do:**
- Collect findings from Persons 1, 2, 3
- Compile into one master document
- Format findings consistently
- Track progress on shared Google Sheet

**Tasks:**
- **Monday evening:** Create shared tracker (Google Sheet)
- **Wednesday evening:** Collect progress updates from team
- **Friday evening:** Compile weekly summary report

**No coding needed** - Just Google Docs/Sheets

---

### 2. Manual Validation Specialist (2-3 hours/week)

**What to do:**
- Manually verify accuracy of extracted data
- Spot-check 10-15 documents per week
- Flag obvious errors

**Example Task:**
```
1. Open PDF: Flex_10K_FY2024.pdf
2. Find Cash Flow Statement (Ctrl+F "cash flow")
3. Look for line "Purchases of property and equipment"
4. Write down actual CapEx: $1,284M

5. Compare to what system extracted
6. If different → Flag as error in tracker

Time: 10-12 minutes per document
```

---

### 3. Ground Truth Dataset Creator (2-3 hours, one-time)

**What to do:**
- Create the "answer key" that others will test against
- Manually extract CapEx from 10-15 documents
- Save to CSV file

**Step-by-step:**

```
WEEK 1 Task (One-time, 2-3 hours):

Day 1 (1 hour): Extract from 5 documents
├── Open Flex_10K_FY2024.pdf
├── Navigate to page with Cash Flow Statement
├── Find CapEx line item
├── Record: Company, FY, CapEx amount, Page number
└── Repeat for 4 more docs

Day 2 (1 hour): Extract from 5 more documents
Day 3 (30 min): Extract from final 5 documents

Save to: ground_truth_lucas.csv
```

---

## 📋 Weekly Schedule

### Monday (1 hour - Evening)
**9:00pm - 10:00pm**
- [ ] Set up shared Google Sheet tracker
- [ ] Copy person assignments from Cursor plan
- [ ] Send reminder to team about Wednesday check-in

### Wednesday (1.5 hours - Evening)
**8:00pm - 9:30pm**
- [ ] Collect progress updates from Persons 1, 2, 3
- [ ] Update tracker with their findings
- [ ] Flag any blockers
- [ ] Manually validate 5 documents (5 × 12 min = 1 hour)

### Friday (1.5 hours - Evening)
**7:00pm - 8:30pm**
- [ ] Compile weekly findings report
- [ ] Manually validate 5 more documents
- [ ] Prepare summary for team meeting
- [ ] Send report to team

### Weekend (2 hours - Flexible)
**Saturday or Sunday**
- [ ] Continue ground truth creation (if not done)
- [ ] Or: Additional manual validation (10 docs)
- [ ] Format and polish weekly report

---

## 📊 Deliverables

### Weekly Deliverable 1: Team Tracker (Google Sheet)

**Columns:**
| Person | Task | Status | Accuracy Found | Top Issue | Blocker? | Notes |
|--------|------|--------|----------------|-----------|----------|-------|
| Person 1 | Text extraction test | Done | 87% | Tables garbled | None | Recommends pdfplumber |
| Person 2 | RAG retrieval test | In Progress | 65% | Cross-company mix | None | Testing chunk sizes |
| Person 3 | Financial extraction | Done | 60% | YTD vs quarterly | None | Needs ground truth |
| Lucas | Ground truth (10 docs) | Done | - | - | None | Validated 15 docs this week |

---

### Weekly Deliverable 2: Manual Validation Report

```markdown
# Manual Validation Results - Week 1

## Documents Validated: 15

### Validation Summary
| Metric | Result |
|--------|--------|
| Documents checked | 15 |
| System extractions correct | 9 (60%) |
| System extractions incorrect | 6 (40%) |
| Average error when wrong | 18% |

## Errors Found

### Error 1: Flex Q3 FY2024
- **File:** Flex_10Q_Q3_FY2024.pdf
- **Manual CapEx:** $320M (Q3 only)
- **System extracted:** $960M (YTD - WRONG!)
- **Issue:** System doesn't handle YTD vs quarterly
- **Priority:** CRITICAL

### Error 2: Jabil FY2024 10-K
- **File:** Jabil_10K_FY2024.pdf
- **Manual CapEx:** $700M
- **System extracted:** -700M (NEGATIVE!)
- **Issue:** System returns negative numbers
- **Priority:** HIGH

## Recommendations
1. Fix YTD handling first (affects 4 out of 6 errors)
2. Add negative number conversion (affects 2 errors)
```

---

### One-Time Deliverable: Ground Truth Dataset

**Lucas creates:** `ground_truth_lucas.csv`

```csv
filename,company,fiscal_year,quarter,actual_capex,actual_revenue,page_number,extraction_method,notes
Flex_10K_FY2024.pdf,Flex,FY2024,null,1284,25000,58,manual,"Found as 'Purchases of property and equipment'"
Flex_10Q_Q1_FY2024.pdf,Flex,FY2024,Q1,320,6200,12,manual,"Single quarter not YTD"
Flex_10Q_Q2_FY2024.pdf,Flex,FY2024,Q2,330,6400,12,manual,"Calculated Q2 = Q2_YTD - Q1_YTD"
Jabil_10K_FY2024.pdf,Jabil,FY2024,null,700,30000,62,manual,"Listed as 'Capital expenditures'"
Jabil_10Q_Q1_FY2024.pdf,Jabil,FY2024,Q1,175,7500,10,manual,"Listed as 'Capital expenditures'"
Celestica_10K_FY2024.pdf,Celestica,FY2024,null,200,8000,45,manual,"Different label: 'Additions to property'"
```

**This becomes the "answer key"** - Person 3 uses it to test extraction accuracy!

---

## 📝 Validation Checklist (Per Document)

```
Document: _____________________
Time started: _____

[ ] Step 1: Open PDF (30 sec)
[ ] Step 2: Find Cash Flow Statement (1 min)
    - Press Ctrl+F
    - Search "cash flow"
    - Navigate to section

[ ] Step 3: Locate CapEx line (2 min)
    - Look for:
      ☐ "Purchases of property and equipment"
      ☐ "Capital expenditures"
      ☐ "Additions to property"
      ☐ "Investments in property"
    - Note page number: _____

[ ] Step 4: Extract number (1 min)
    - Write exact number: $_____M
    - Check if YTD or single quarter
    - If YTD, note which quarters included

[ ] Step 5: Compare to system output (2 min)
    - Open extracted_data/[filename]_extracted.json
    - Find "capex" field
    - System extracted: $_____M
    
[ ] Step 6: Validate (3 min)
    - Match? ☐ Yes ☐ No
    - If No:
      - Error %: _____
      - Reason: ☐ Wrong number ☐ YTD issue ☐ Negative ☐ Not found
      - Note issue in tracker

[ ] Step 7: Record results (2 min)
    - Add to ground_truth_lucas.csv
    - Update Google Sheet tracker

Total time: ~10-12 minutes
```

---

## 📋 Weekly Report Template

```markdown
# Week [X] - CapEx System Review Summary

**Prepared by:** Lucas Cai  
**Date:** [Date]  

## This Week's Accomplishments

**Person 1 (Text Extraction):**
- Tested: 15 PDFs
- Accuracy: 87%
- Top Issue: Table extraction garbled
- Status: Fix identified, needs 4 hours

**Person 2 (RAG Retrieval):**
- Tested: 20 queries
- Accuracy: 65% (top-5)
- Top Issue: Cross-company contamination
- Status: Testing metadata filtering

**Person 3 (AI Extraction):**
- Tested: 10 documents vs ground truth
- Accuracy: 60% (within 5%)
- Top Issue: YTD vs quarterly confusion
- Status: Prompt improvements drafted

**Lucas (QA & Documentation):**
- Documents validated: 15
- Ground truth entries: 15
- Errors flagged: 6
- Reports generated: 1

## Manual Validation Findings

**Accuracy Breakdown:**
- Exact match: 9/15 (60%)
- Within 5%: 11/15 (73%)
- Within 10%: 13/15 (87%)

**Top Errors:**
1. YTD vs quarterly (4 instances)
2. Negative numbers not converted (2 instances)

## Recommended Priorities for Next Week

1. **Fix YTD handling** (Person 3, 4 hours) → +20% accuracy
2. **Fix negative conversion** (Person 3, 2 hours) → +10% accuracy
3. **Add metadata filtering** (Person 2, 3 hours) → +15% accuracy

## Blockers

None this week.

## Next Week's Goals

- Person 3: Implement YTD fix
- Person 2: Test metadata filtering
- Person 1: Switch to pdfplumber
- Lucas: Validate 15 more documents, expand ground truth to 30 total
```

---

## 🎯 Success Metrics

**Week 1:**
- [ ] Tracker set up and shared
- [ ] 15 documents validated
- [ ] Ground truth CSV created (15 entries)
- [ ] Weekly report published

**Week 2:**
- [ ] 15 more documents validated
- [ ] Ground truth expanded to 30 entries
- [ ] All team findings compiled
- [ ] Weekly report published

**Week 3:**
- [ ] Validate fixes (re-test same documents)
- [ ] Measure accuracy improvement
- [ ] Final report with before/after comparison

---

## 📞 Communication Plan

### Daily (5 min - via Slack/WhatsApp)
**Evening check-in:**
- "Updated tracker with today's findings"
- "Validated 3 docs, found 1 error"
- "Question for Person 3: Is this YTD or quarterly?"

### Wednesday (15 min - Standup)
**Lucas reports:**
- Documents validated this week: X
- Errors found: Y
- Ground truth progress: Z/30
- Any blockers

### Friday (30 min - Weekly Review)
**Lucas presents:**
- Share weekly summary report
- Highlight top 3 errors found
- Recommend priorities for next week

---

## 💡 Why This Role is Critical

Even though it's "non-technical", Lucas provides:

1. **Ground Truth** - Without this, Person 3 can't measure accuracy
2. **Quality Control** - Catches errors the automated tests miss
3. **Documentation** - Keeps team organized and on track
4. **Validation** - Confirms fixes actually work
5. **Coordination** - Central point of contact

**This role is ESSENTIAL** - The team can't succeed without it!

---

## 🎓 Skills Lucas Will Learn

By doing this role, Lucas gains:

- 📊 **Financial literacy** - Reading SEC filings, understanding CapEx
- 🔍 **Attention to detail** - Spotting extraction errors
- 📝 **Documentation** - Professional report writing
- 🤝 **Project management** - Coordinating team progress
- 💼 **QA experience** - Software quality assurance
- 📈 **Data validation** - Creating test datasets

**Resume line:**
> *QA & Documentation Lead: Created ground truth dataset for ML validation, performed manual data verification, coordinated team progress tracking*

---

## 🎓 Why This Works for Lucas (School Student)

✅ **Flexible timing** - Can do evenings, weekends, during study breaks  
✅ **No coding** - Just reading PDFs, updating spreadsheets  
✅ **Bite-sized tasks** - Each document validation = 10-12 minutes  
✅ **High impact** - Ground truth is CRITICAL for team  
✅ **Learn the domain** - Understands CapEx, financial statements  
✅ **Resume-worthy** - "QA Lead, Data Validation Specialist"

---

## ✅ Before You Start Checklist

- [ ] Google account set up
- [ ] Access to shared drive
- [ ] Access to project folder with PDF files
- [ ] PDF reader installed (Preview/Acrobat)
- [ ] Excel/Google Sheets access

---

## 📋 Day 1 Setup

```bash
# 1. Create your workspace
mkdir ~/capex_review
cd ~/capex_review

# 2. Create ground truth CSV
echo "filename,company,fiscal_year,quarter,actual_capex,page_number,notes" > ground_truth_lucas.csv

# 3. Create validation log
echo "date,filename,manual_value,system_value,match,error_percent,notes" > validation_log.csv
```

Then start validating documents!

---

**Lucas: You're the Quality Assurance backbone of this team. Your ground truth and validation work is CRITICAL for everyone else to measure their accuracy.**

**Questions? Ask the team lead!**
