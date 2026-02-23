"""
Batch CapEx extraction runner.
Reads documents, runs extraction, and validates against ground truth.

Usage:
    python -m backend.extraction.run_extraction
"""
import json
from pathlib import Path
from typing import Optional

from backend.extraction.ai_extractor import extract_capex
from backend.extraction.validate import compare, print_report, export_csv


GROUND_TRUTH = {
    "Flex": {
        "FY24": {"10-K": 513.0},
        "FY24_Q1": {"10-Q": 130.0},
        "FY24_Q2": {"10-Q": 127.0},
        "FY25_Q1": {"10-Q": 133.0},
        "FY25_Q2": {"10-Q": 145.0},
    },
    "Jabil": {
        "FY23": {"10-K": 992.0},
        "FY24_Q1": {"10-Q": 173.0},
        "FY24_Q2": {"10-Q": 178.0},
        "FY24_Q3": {"10-Q": 164.0},
    },
    "Celestica": {
        "FY23": {"10-K": 108.9},
        "FY24_Q1": {"10-Q": 26.3},
        "FY24_Q2": {"10-Q": 40.7},
        "FY24_Q3": {"10-Q": 36.7},
    },
    "Benchmark": {
        "FY23": {"10-K": 20.5},
        "FY24": {"10-K": 17.1},
        "FY24_Q1": {"10-Q": 4.4},
        "FY24_Q2": {"10-Q": 4.2},
    },
    "Sanmina": {
        "FY23": {"10-K": 96.4},
        "FY24": {"10-K": 83.2},
        "FY24_Q1": {"10-Q": 28.1},
        "FY24_Q2": {"10-Q": 31.4},
    },
}


def run_batch(data_dir: Optional[str] = None):
    """Run extraction on all available documents and validate."""
    print("=" * 60)
    print("  CAPEX EXTRACTION BATCH RUNNER")
    print("=" * 60)
    print(f"\n  Ground truth entries: {sum(len(periods) for periods in GROUND_TRUTH.values())}")
    print("  (Extraction requires the full document text and Claude API key)\n")
    print("  To run extraction on actual files, provide the data directory")
    print("  and ensure ANTHROPIC_API_KEY is set in backend/.env")
    print()

    if not data_dir:
        print("  No data directory specified. Showing ground truth only.\n")
        for company, periods in GROUND_TRUTH.items():
            print(f"  {company}:")
            for period, filings in periods.items():
                for ftype, value in filings.items():
                    print(f"    {period} ({ftype}): ${value:.1f}M")
        return

    print(f"  Data directory: {data_dir}")
    print("  (Full batch extraction not yet implemented — use extract_capex() directly)")


if __name__ == "__main__":
    run_batch()
