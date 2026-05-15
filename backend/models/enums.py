from enum import StrEnum


class Sector(StrEnum):
    HEALTHCARE = "Healthcare"
    FINTECH = "Fintech"
    EDUCATION = "Education"
    AGRICULTURE = "Agriculture"
    GOVTECH = "GovTech"
    LEGAL = "Legal"
    CLEANTECH = "CleanTech"
    EMPLOYMENT = "Employment"
    CREATOR_ECONOMY = "Creator Economy"
    RETAIL = "Retail"
    RARE_DISEASE = "Rare Disease"
    TECHNOLOGY = "Technology"
    TRANSPORTATION = "Transportation"
    FINTECH_RETAIL = "Fintech / Retail"
    FINTECH_CREATOR = "Fintech / Creator"
    LEGAL_GOVTECH = "Legal / GovTech"
    GOVTECH_LEGAL = "GovTech / Legal"
    EMPLOYMENT_EDTECH = "Employment / EdTech"


class Frequency(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very High"


class Confidence(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class TrendStatus(StrEnum):
    NEW = "New"
    RISING = "Rising"
    STABLE = "Stable"
    DECLINING = "Declining"


class SourcePlatform(StrEnum):
    REDDIT = "Reddit"
    PRODUCT_HUNT = "Product Hunt"
    INDIE_HACKERS = "Indie Hackers"
    STARTUP_INDIA = "Startup India"
    NASSCOM = "NASSCOM"
    HACKER_NEWS = "Hacker News"
    SMART_INDIA_HACKATHON = "Smart India Hackathon"
    LINKEDIN = "LinkedIn"
    DEV_TO = "Dev.to"
    OTHER = "Other"
