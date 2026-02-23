"""
JSON parsing and financial number cleaning utilities.
Handles negative numbers, parenthetical notation, and unit normalization.
"""
import re
import json
from typing import Optional, Any


def clean_capex(value: Any) -> Optional[float]:
    """
    Parse a CapEx value from various formats and return absolute value in millions.

    Handles: $(505), (505), -505, $1,234.5, −130 (unicode minus),
    plain numbers, and string representations.

    Returns None if the value cannot be parsed.
    """
    if value is None:
        return None

    text = str(value).strip()
    if not text or text.lower() in ("null", "none", "n/a", ""):
        return None

    text = text.replace("$", "").replace(",", "").strip()
    # Normalize unicode minus and en-dash
    text = text.replace("\u2212", "-").replace("\u2013", "-")

    # Parenthetical negative: (505) or ( 505.3 )
    if text.startswith("(") and text.endswith(")"):
        inner = text[1:-1].strip()
        try:
            return abs(float(inner))
        except ValueError:
            return None

    text = re.sub(r"[^\d.\-]", "", text)
    if not text or text == "-" or text == ".":
        return None

    try:
        return abs(float(text))
    except ValueError:
        return None


def normalize_units(value: float, unit_header: str) -> float:
    """
    Convert a raw financial value to millions based on the unit header.

    Args:
        value: The raw numeric value from the filing
        unit_header: The unit description (e.g., "in thousands", "in millions")

    Returns:
        Value normalized to millions
    """
    header_lower = unit_header.lower()
    if "thousand" in header_lower:
        return value / 1_000
    elif "billion" in header_lower:
        return value * 1_000
    # "in millions" or unspecified -> return as-is
    return value


def parse_extraction_response(response_text: str) -> dict:
    """
    Parse the LLM's JSON response from a CapEx extraction.
    Handles markdown code fences and partial JSON.
    """
    text = response_text.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Find JSON object boundaries
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        return {"error": "No JSON found in response", "raw": response_text}

    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": text[start:end]}
