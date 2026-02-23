"""
Export module for generating reports in various formats.
"""
from .excel import generate_excel_report, generate_comparison_excel
from .powerpoint import generate_powerpoint_report

try:
    from .pdf import generate_pdf_report
except (ImportError, OSError):
    generate_pdf_report = None

__all__ = [
    "generate_excel_report",
    "generate_comparison_excel",
    "generate_powerpoint_report",
    "generate_pdf_report",
]
