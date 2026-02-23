"""
API routes for geographic analysis and facility mapping.
"""
from fastapi import APIRouter, HTTPException, Query

from backend.analytics.geographic import (
    get_company_facilities,
    get_regional_distribution,
    get_all_facilities_map,
    analyze_regional_investments,
    compare_geographic_footprints,
)
from backend.analytics.facility_extractor import (
    extract_facilities_from_documents,
    get_combined_facilities,
    extract_all_companies,
    get_new_facility_discoveries,
)

router = APIRouter()


@router.get("/geographic/facilities")
async def get_all_facilities():
    """
    Get all facilities for map visualization.
    Returns facility locations with coordinates for all companies.
    """
    try:
        return get_all_facilities_map()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/facilities/{company}")
async def get_facilities(company: str):
    """
    Get facilities for a specific company.
    """
    try:
        result = get_company_facilities(company)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/distribution/{company}")
async def get_distribution(company: str):
    """
    Get regional distribution for a company.
    """
    try:
        result = get_regional_distribution(company)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/investments/{company}")
async def get_regional_investments(company: str):
    """
    Analyze regional investment mentions for a company.
    """
    try:
        return analyze_regional_investments(company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/compare")
async def compare_footprints():
    """
    Compare geographic footprints across all companies.
    """
    try:
        return compare_geographic_footprints()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/heatmap")
async def get_geographic_heatmap(include_extracted: bool = Query(True, description="Include auto-extracted facilities")):
    """
    Get data formatted for heatmap visualization.
    """
    try:
        all_facilities = get_all_facilities_map(include_extracted=include_extracted)
        comparison = compare_geographic_footprints()
        
        # Format for heatmap
        heatmap_data = []
        for facility in all_facilities["facilities"]:
            heatmap_data.append({
                "lat": facility["lat"],
                "lng": facility["lng"],
                "intensity": 1.0 if facility["is_headquarters"] else 0.5,
                "company": facility["company"],
                "city": facility["city"],
                "type": facility["type"],
                "source": facility.get("source", "known"),
                "confidence": facility.get("confidence", 1.0),
            })
        
        return {
            "heatmap_points": heatmap_data,
            "total_facilities": all_facilities["total_count"],
            "regional_leaders": comparison["regional_leaders"],
            "shared_locations": comparison["overlap_analysis"]["shared_locations"],
            "new_discoveries": all_facilities.get("new_discoveries", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Facility Extraction Endpoints ============

@router.get("/geographic/extract/{company}")
async def extract_company_facilities(
    company: str,
    force_refresh: bool = Query(False, description="Force re-extraction from documents")
):
    """
    Extract facility locations from company documents using NLP.
    Analyzes SEC filings for location mentions.
    """
    try:
        return extract_facilities_from_documents(company, force_refresh=force_refresh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/combined/{company}")
async def get_company_combined_facilities(company: str):
    """
    Get combined facilities (known + extracted) for a company.
    Shows both hardcoded and newly discovered facilities.
    """
    try:
        return get_combined_facilities(company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/geographic/extract-all")
async def extract_all_company_facilities():
    """
    Extract facilities for all tracked companies.
    This may take a few minutes as it analyzes documents for each company.
    """
    try:
        return extract_all_companies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geographic/discoveries")
async def get_discoveries():
    """
    Get list of newly discovered facilities not in the hardcoded database.
    These are locations found by analyzing SEC filings.
    """
    try:
        discoveries = get_new_facility_discoveries()
        return {
            "discoveries": discoveries,
            "total": len(discoveries),
            "note": "These facilities were auto-extracted from SEC filings and may need verification.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
