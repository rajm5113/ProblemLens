/**
 * Sector → Hero Image mapping.
 * Images live in /public/sectors/ and are served as static assets.
 */

const SECTOR_IMAGE_MAP: Record<string, string> = {
  "technology":          "/sectors/technology.jpg",
  "fintech / retail":    "/sectors/fintech.jpg",
  "fintech":             "/sectors/fintech.jpg",
  "fintech / creator":   "/sectors/fintech.jpg",
  "legal / govtech":     "/sectors/legal.jpg",
  "govtech / legal":     "/sectors/legal.jpg",
  "transportation":      "/sectors/transportation.jpg",
  "healthcare":          "/sectors/healthcare.jpg",
  "employment / edtech": "/sectors/employment.png",
  "education":           "/sectors/education.png",
  "agriculture":         "/sectors/agriculture.png",
  "cleantech":           "/sectors/cleantech.png",
  "creator economy":     "/sectors/creator.png",
};

/** Default fallback image for unknown sectors */
const DEFAULT_IMAGE = "/sectors/technology.jpg";

/**
 * Get the hero image URL for a given sector name.
 * Case-insensitive lookup.
 */
export function getSectorImage(sector: string): string {
  return SECTOR_IMAGE_MAP[sector.toLowerCase()] ?? DEFAULT_IMAGE;
}
