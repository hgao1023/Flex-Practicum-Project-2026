"""
Validation and accuracy measurement for CapEx extraction.
Compares system output against ground truth values.
"""
import csv
from pathlib import Path
from typing import Optional


def compare(actual: float, expected: float, tolerance: float = 0.05) -> dict:
    """
    Compare extracted value against ground truth.

    Args:
        actual: Extracted CapEx value (in millions)
        expected: Ground truth CapEx value (in millions)
        tolerance: Acceptable error ratio (default 5%)

    Returns:
        Dict with match status and error metrics
    """
    if actual is None or expected is None:
        return {
            "exact_match": False,
            "within_tolerance": False,
            "error_pct": None,
            "actual": actual,
            "expected": expected,
        }

    if expected == 0:
        exact = actual == 0
        return {
            "exact_match": exact,
            "within_tolerance": exact,
            "error_pct": 0 if exact else 100,
            "actual": actual,
            "expected": expected,
        }

    error_pct = abs(actual - expected) / abs(expected)
    return {
        "exact_match": abs(actual - expected) < 0.1,
        "within_tolerance": error_pct <= tolerance,
        "error_pct": round(error_pct * 100, 2),
        "actual": actual,
        "expected": expected,
    }


def print_report(results: list[dict], title: str = "Extraction Accuracy Report"):
    """Print a formatted accuracy report from a list of comparison results."""
    total = len(results)
    if total == 0:
        print("No results to report.")
        return

    exact = sum(1 for r in results if r.get("exact_match"))
    within_5 = sum(1 for r in results if r.get("within_tolerance"))
    errors = sum(1 for r in results if r.get("error_pct") is None)

    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")
    print(f"  Total documents:     {total}")
    print(f"  Exact match:         {exact}/{total} ({exact/total*100:.1f}%)")
    print(f"  Within 5%:           {within_5}/{total} ({within_5/total*100:.1f}%)")
    print(f"  Errors/Missing:      {errors}")
    print(f"{'=' * 60}\n")

    # Detail table
    print(f"  {'File':<40} {'Expected':>10} {'Actual':>10} {'Error%':>8} {'Status'}")
    print(f"  {'-'*80}")
    for r in results:
        filename = r.get("filename", "?")[:38]
        expected = f"${r['expected']:.1f}M" if r.get("expected") is not None else "N/A"
        actual = f"${r['actual']:.1f}M" if r.get("actual") is not None else "N/A"
        error = f"{r['error_pct']:.1f}%" if r.get("error_pct") is not None else "ERR"
        status = "PASS" if r.get("within_tolerance") else "FAIL"
        print(f"  {filename:<40} {expected:>10} {actual:>10} {error:>8} {status}")


def export_csv(results: list[dict], output_path: str):
    """Export comparison results to CSV."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = ["filename", "company", "filing_type", "fiscal_year",
                   "expected", "actual", "error_pct", "exact_match", "within_tolerance"]

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    print(f"  Exported to {path}")
