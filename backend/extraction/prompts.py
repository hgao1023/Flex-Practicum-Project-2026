"""
CapEx extraction prompt templates for LLM-based extraction.
"""

CAPEX_LABELS = [
    "Purchases of property and equipment",
    "Acquisition of property, plant and equipment",
    "Purchase of property, plant and equipment",
    "Purchases of property, plant and equipment",
    "Capital expenditures",
    "Additions to property and equipment",
    "Capital spending",
    "Payments for property and equipment",
]

CAPEX_EXTRACTION_PROMPT = """You are a financial data extraction specialist. Extract the Capital Expenditure (CapEx) value from the provided SEC filing excerpt.

=== WHAT TO LOOK FOR ===
The CapEx line item appears in the Consolidated Statements of Cash Flows under "Investing Activities". It may be labeled as:
{labels}

=== YTD vs SINGLE-QUARTER (CRITICAL for 10-Q) ===
Quarterly reports (10-Q) show TWO sets of columns:

  "Three Months Ended ..."   → SINGLE quarter   ← EXTRACT THIS ONE
  "Six Months Ended ..."     → Year-to-date     ← DO NOT USE
  "Nine Months Ended ..."    → Year-to-date     ← DO NOT USE

Always extract the "Three Months Ended" value (the single-quarter figure).
For annual reports (10-K), there is only one column per year — use that value.

=== NEGATIVE NUMBERS ===
CapEx is a cash OUTFLOW, so it appears as negative in cash flow statements:
  $(505), (505), -505, −130 are all POSITIVE CapEx amounts.
Always return the ABSOLUTE (positive) value.

=== UNIT HEADER (CRITICAL) ===
Check the header at the top of the financial statement:
  * "(in thousands)" → the raw number is in thousands. DIVIDE by 1,000 to report in millions.
  * "(in millions)"  → values are already in millions. Report as-is.
  * "(in billions)"  → values are already in billions.

Benchmark Electronics and Sanmina typically report in THOUSANDS.
Flex, Jabil, and Celestica typically report in MILLIONS.

=== OUTPUT FORMAT ===
Return a JSON object:
{{
  "capex_value": <number in millions>,
  "unit": "millions",
  "raw_value": "<exact text from the filing>",
  "label_found": "<exact line item label used>",
  "period": "<e.g. Three Months Ended September 30, 2024>",
  "confidence": "<high/medium/low>"
}}

If CapEx cannot be found, return:
{{
  "capex_value": null,
  "error": "<reason>"
}}
""".format(labels="\n".join(f"  - {label}" for label in CAPEX_LABELS))
