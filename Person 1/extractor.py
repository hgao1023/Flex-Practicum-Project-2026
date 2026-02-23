"""
Step 1A: Extract clean text from HTML and PDF SEC filings.
  - HTML files (from input_html/) -> extracted_html/ (.md)
  - PDF  files (from input_pdf/)  -> extracted_pdf/  (.md)

Supports recursive subdirectory scanning — you can drop entire folders
into input_html/ or input_pdf/ and all matching files will be found.

Run this BEFORE embed.py.

Usage:
    python extractor.py           # extract all HTML + PDF files
    python extractor.py --html    # extract HTML files only
    python extractor.py --pdf     # extract PDF files only
"""

import os
import re
import sys
import glob
import warnings
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import pdfplumber

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

# --- Paths ---
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# Input directories (put your source files or folders here)
INPUT_HTML_DIR = os.path.join(DATA_DIR, "input_html")
INPUT_PDF_DIR = os.path.join(DATA_DIR, "input_pdf")

# Output directories (extracted .md files go here)
OUTPUT_HTML_DIR = os.path.join(DATA_DIR, "extracted_html")
OUTPUT_PDF_DIR = os.path.join(DATA_DIR, "extracted_pdf")


# ============================================================
# File discovery — recursive scan for HTML/PDF files
# ============================================================
def find_files(root_dir, extensions):
    """Recursively find files with given extensions under root_dir.

    Supports placing files directly or inside subfolders.
    """
    found = []
    for ext in extensions:
        pattern = os.path.join(root_dir, "**", f"*{ext}")
        found.extend(glob.glob(pattern, recursive=True))
    return sorted(set(found))


# ============================================================
# HTML Extraction (SEC XBRL/HTML filings, e.g. Flex 10-K)
# ============================================================
def extract_text_from_html(filepath):
    """Parse an SEC XBRL/HTML filing and return clean plain text.

    Removes scripts, styles, hidden XBRL tags, and inline XBRL markers.
    """
    print(f"  Parsing HTML: {os.path.basename(filepath)}")

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    soup = BeautifulSoup(content, "lxml")

    # Strip non-content tags
    for tag in soup.find_all(["script", "style", "meta", "link"]):
        tag.decompose()
    for div in soup.find_all("div", style=re.compile(r"display\s*:\s*none", re.I)):
        div.decompose()
    for header in soup.find_all("ix:header"):
        header.decompose()
    for hidden in soup.find_all("ix:hidden"):
        hidden.decompose()

    text = soup.get_text(separator="\n")

    # Clean whitespace and residual XBRL markers
    lines = [line.strip() for line in text.split("\n") if line.strip() and len(line.strip()) > 2]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"ix:[a-zA-Z]+", "", text)
    text = re.sub(r" {2,}", " ", text)

    return text


# ============================================================
# PDF Extraction — multi-column aware + table extraction
# ============================================================
def _format_table_as_markdown(table):
    """Convert a pdfplumber table (list of lists) to a Markdown table string.

    Preserves column alignment and number formatting.
    """
    if not table or not table[0]:
        return ""

    # Clean cell values
    cleaned = []
    for row in table:
        cleaned_row = []
        for cell in row:
            val = (cell or "").strip().replace("\n", " ")
            cleaned_row.append(val)
        cleaned.append(cleaned_row)

    # Compute column widths
    num_cols = max(len(r) for r in cleaned)
    col_widths = [0] * num_cols
    for row in cleaned:
        for j, cell in enumerate(row):
            if j < num_cols:
                col_widths[j] = max(col_widths[j], len(cell))

    # Build markdown table
    lines = []
    for i, row in enumerate(cleaned):
        padded = []
        for j in range(num_cols):
            val = row[j] if j < len(row) else ""
            padded.append(val.ljust(col_widths[j]))
        lines.append("| " + " | ".join(padded) + " |")
        if i == 0:
            sep = "| " + " | ".join("-" * w for w in col_widths) + " |"
            lines.append(sep)

    return "\n".join(lines)


def _extract_tables_from_page(page):
    """Extract all tables from a page and return as formatted markdown strings."""
    tables = page.extract_tables()
    if not tables:
        return []
    formatted = []
    for table in tables:
        md = _format_table_as_markdown(table)
        if md:
            formatted.append(md)
    return formatted


def _get_table_bboxes(page):
    """Get bounding boxes of all tables on the page for exclusion from text extraction."""
    table_bboxes = []
    tables = page.find_tables()
    for table in tables:
        table_bboxes.append(table.bbox)
    return table_bboxes


def _collapse_spaced_chars(text):
    """Collapse character-spaced decorative text like 'S t o c k' -> 'Stock'.

    Detects lines where most content is single chars separated by spaces
    (common in PDF annual report cover pages with wide letter-spacing).
    """
    output_lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            output_lines.append(line)
            continue

        # Check if line is character-spaced: pattern like "A b c d e f"
        # At least 6 single-char tokens separated by spaces
        tokens = stripped.split(" ")
        single_chars = sum(1 for t in tokens if len(t) == 1 and t.isalpha())

        if len(tokens) > 5 and single_chars > len(tokens) * 0.6:
            # Collapse: remove spaces between single characters
            collapsed = re.sub(r"(?<=[A-Za-z]) (?=[A-Za-z](?:\s|$))", "", stripped)
            collapsed = re.sub(r"(?<=^[A-Za-z]) (?=[A-Za-z])", "", collapsed)
            # Simpler approach: just join all single-char groups
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
    """Insert spaces into garbled text where PDF lacks proper word spacing.

    Handles common patterns:
      - camelCase boundaries:  "cashFlows" -> "cash Flows"
      - lowercase→uppercase:  "theCompany" -> "the Company"
      - period/comma no space: "operations.The" -> "operations. The"
    """
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([.;,])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\)([A-Z])", r") \1", text)
    text = re.sub(r"([A-Z]{2,})([.;,])([A-Z])", r"\1\2 \3", text)
    return text


def _extract_page_text_words(page):
    """Extract page text using word-level detection with tuned tolerance.

    Uses extract_words() to properly detect word boundaries even when
    the PDF lacks explicit space characters between words.
    """
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


def extract_text_from_pdf(filepath):
    """Extract text from a PDF using pdfplumber with multi-column and table support.

    Strategy per page:
      1. Detect tables -> extract as formatted markdown tables
      2. Smart text extraction: auto-selects best method per page
      3. Combine tables + text in reading order
      4. Fix any remaining garbled text via heuristic post-processing
    """
    print(f"  Parsing PDF: {os.path.basename(filepath)}")
    pages_output = []
    table_count = 0

    with pdfplumber.open(filepath) as pdf:
        total_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages, 1):
            page_parts = []

            # Step 1: Extract tables as markdown
            table_bboxes = _get_table_bboxes(page)
            table_markdowns = _extract_tables_from_page(page)
            table_count += len(table_markdowns)

            # Step 2: Word-level text extraction (outside tables)
            if table_bboxes:
                try:
                    filtered_page = page
                    page_bbox = page.bbox
                    for bbox in table_bboxes:
                        clipped = (
                            max(bbox[0], page_bbox[0]),
                            max(bbox[1], page_bbox[1]),
                            min(bbox[2], page_bbox[2]),
                            min(bbox[3], page_bbox[3]),
                        )
                        if clipped[2] > clipped[0] and clipped[3] > clipped[1]:
                            filtered_page = filtered_page.outside_bbox(clipped)
                    page_text = _extract_page_text_words(filtered_page)
                except Exception:
                    page_text = _extract_page_text_words(page)
            else:
                page_text = _extract_page_text_words(page)

            # Step 3: Clean up extracted text
            if page_text.strip():
                cleaned_lines = []
                for line in page_text.split("\n"):
                    line = line.rstrip()
                    line = re.sub(r" {4,}", "  ", line)
                    if line.strip() and len(line.strip()) > 2:
                        cleaned_lines.append(line)
                page_parts.append("\n".join(cleaned_lines))

            # Step 4: Append tables
            for tbl_md in table_markdowns:
                page_parts.append("\n" + tbl_md + "\n")

            if page_parts:
                pages_output.append("\n".join(page_parts))

            if total_pages > 50 and i % 50 == 0:
                print(f"    ... page {i}/{total_pages}")

    text = "\n\n".join(pages_output)

    # Post-processing pipeline:
    # 1. Collapse character-spaced decorative text ("S t o c k" -> "Stock")
    text = _collapse_spaced_chars(text)
    # 2. Fix remaining camelCase / punctuation garbling
    text = _fix_missing_spaces(text)

    # Final cleanup
    text = re.sub(r"\n{3,}", "\n\n", text)

    print(f"    tables found: {table_count}")
    return text


# ============================================================
# Save helper — write extracted text as .md file
# ============================================================
def _strip_ext(filename):
    """Remove .html / .pdf extension from a filename."""
    base = os.path.basename(filename)
    for ext in (".html", ".pdf", ".HTML", ".PDF"):
        if base.endswith(ext):
            base = base[: -len(ext)]
            break
    return base


def save_md(text, source_filepath, out_dir):
    """Save extracted text as a Markdown (.md) file in the given output directory."""
    os.makedirs(out_dir, exist_ok=True)
    base = _strip_ext(source_filepath)
    md_path = os.path.join(out_dir, base + ".md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(text)
    size_kb = os.path.getsize(md_path) / 1024
    print(f"    -> {base}.md ({size_kb:.0f} KB, {len(text):,} chars)")
    return md_path


# ============================================================
# Quality metrics — measure extraction quality
# ============================================================
def compute_quality_metrics(md_path, source_type):
    """Compute basic extraction quality metrics for a generated .md file."""
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    total_chars = len(text)
    total_lines = text.count("\n") + 1
    total_words = len(text.split())

    # Check for garbled text: long words (>40 chars) without spaces
    words = text.split()
    garbled_words = [w for w in words if len(w) > 40 and not w.startswith("http")]
    garbled_ratio = len(garbled_words) / max(len(words), 1)

    # Count markdown tables
    table_lines = [l for l in text.split("\n") if l.strip().startswith("|") and l.strip().endswith("|")]
    table_count = 0
    in_table = False
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            if not in_table:
                table_count += 1
                in_table = True
        else:
            in_table = False

    return {
        "file": os.path.basename(md_path),
        "source_type": source_type,
        "total_chars": total_chars,
        "total_lines": total_lines,
        "total_words": total_words,
        "garbled_words": len(garbled_words),
        "garbled_ratio": garbled_ratio,
        "tables_found": table_count,
    }


# ============================================================
# Main pipeline — discover files and run extraction
# ============================================================
def extract_all(html_files, pdf_files):
    """Run extraction for both HTML and PDF file lists. Returns quality metrics."""
    metrics = []

    if html_files:
        print(f"\n[HTML] Extracting {len(html_files)} file(s) -> {OUTPUT_HTML_DIR}/")
        for filepath in html_files:
            text = extract_text_from_html(filepath)
            md_path = save_md(text, filepath, OUTPUT_HTML_DIR)
            metrics.append(compute_quality_metrics(md_path, "HTML"))

    if pdf_files:
        print(f"\n[PDF] Extracting {len(pdf_files)} file(s) -> {OUTPUT_PDF_DIR}/")
        for filepath in pdf_files:
            text = extract_text_from_pdf(filepath)
            md_path = save_md(text, filepath, OUTPUT_PDF_DIR)
            metrics.append(compute_quality_metrics(md_path, "PDF"))

    return metrics


def print_quality_report(metrics):
    """Print extraction quality report."""
    print(f"\n{'=' * 60}")
    print("EXTRACTION QUALITY REPORT")
    print(f"{'=' * 60}")
    print(f"  {'File':<45} {'Type':<5} {'Words':>8} {'Garbled':>8} {'Ratio':>8} {'Tables':>7}")
    print(f"  {'-'*45} {'-'*5} {'-'*8} {'-'*8} {'-'*8} {'-'*7}")

    total_garbled = 0
    total_words = 0
    total_tables = 0

    for m in metrics:
        name = m["file"][:44]
        print(f"  {name:<45} {m['source_type']:<5} {m['total_words']:>8,} "
              f"{m['garbled_words']:>8} {m['garbled_ratio']:>7.2%} {m['tables_found']:>7}")
        total_garbled += m["garbled_words"]
        total_words += m["total_words"]
        total_tables += m["tables_found"]

    overall_ratio = total_garbled / max(total_words, 1)
    print(f"  {'-'*45} {'-'*5} {'-'*8} {'-'*8} {'-'*8} {'-'*7}")
    print(f"  {'TOTAL':<45} {'':5} {total_words:>8,} "
          f"{total_garbled:>8} {overall_ratio:>7.2%} {total_tables:>7}")

    if overall_ratio < 0.01:
        print("\n  Quality: GOOD — garbled text ratio < 1%")
    elif overall_ratio < 0.05:
        print("\n  Quality: FAIR — garbled text ratio < 5%")
    else:
        print("\n  Quality: POOR — garbled text ratio >= 5%, review PDF extraction")


def main():
    os.makedirs(INPUT_HTML_DIR, exist_ok=True)
    os.makedirs(INPUT_PDF_DIR, exist_ok=True)

    # Recursive scan — supports files directly or inside subfolders
    html_files = find_files(INPUT_HTML_DIR, [".html", ".HTML", ".htm", ".HTM"])
    pdf_files = find_files(INPUT_PDF_DIR, [".pdf", ".PDF"])

    # CLI flags
    mode = None
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()

    if mode == "--html":
        pdf_files = []
    elif mode == "--pdf":
        html_files = []

    if not html_files and not pdf_files:
        print("ERROR: No source files found.")
        print(f"  Put HTML files (or folders) in : {INPUT_HTML_DIR}/")
        print(f"  Put PDF  files (or folders) in : {INPUT_PDF_DIR}/")
        exit(1)

    # Summary
    print("=" * 60)
    print("TEXT EXTRACTION PIPELINE")
    print("=" * 60)
    print(f"  HTML input dir   : {INPUT_HTML_DIR}/")
    print(f"  PDF  input dir   : {INPUT_PDF_DIR}/")
    print(f"  HTML output dir  : {OUTPUT_HTML_DIR}/")
    print(f"  PDF  output dir  : {OUTPUT_PDF_DIR}/")
    print(f"  HTML files found : {len(html_files)}")
    print(f"  PDF  files found : {len(pdf_files)}")

    # List all files to be processed (show relative path from input dir)
    if html_files:
        print(f"\n  --- HTML files ---")
        for f in html_files:
            rel = os.path.relpath(f, INPUT_HTML_DIR)
            size_mb = os.path.getsize(f) / (1024 * 1024)
            print(f"    {rel} ({size_mb:.1f} MB)")
    if pdf_files:
        print(f"\n  --- PDF files ---")
        for f in pdf_files:
            rel = os.path.relpath(f, INPUT_PDF_DIR)
            size_mb = os.path.getsize(f) / (1024 * 1024)
            print(f"    {rel} ({size_mb:.1f} MB)")

    metrics = extract_all(html_files, pdf_files)

    # Quality report
    print_quality_report(metrics)

    # Done
    print(f"\n{'=' * 60}")
    print("EXTRACTION COMPLETE")
    print(f"{'=' * 60}")
    if html_files:
        print(f"  HTML -> .md saved to : {OUTPUT_HTML_DIR}/")
    if pdf_files:
        print(f"  PDF  -> .md saved to : {OUTPUT_PDF_DIR}/")


if __name__ == "__main__":
    main()
