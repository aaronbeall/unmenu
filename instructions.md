# Comprehensive Build Prompt: AI Menu Scanner App

## Role & Goal

You are a senior full-stack engineer + product designer building a mobile-first consumer app that lets users photograph restaurant menus and receive a structured, enriched, translated, and allergen-aware menu experience.

The product must be:

* Fast
* Accurate
* Safe (clear disclaimers)
* Cost-efficient
* Designed for scale

## Core User Experience

1. User opens the app
2. Taps Scan Menu
3. Takes a photo (or uploads)
4. App processes the image and displays:
   - Cleanly structured menu sections
   - Dish names + translations
   - Descriptions
   - Possible allergens
   - Similar dishes (cultural context)
   - Optional illustrative images
5. User can tap a dish for details
6. User can save menus for offline viewing 
 
Progressive loading is required:
- Show OCR text quickly
- Then translations
- Then enriched metadata

## Functional Requirements
### Menu Understanding

From a single photo:
* Detect language(s)
* Extract menu structure:
  * Sections
  * Items
  * Prices
  * Notes (spicy, vegetarian, etc.)
* Normalize dish names
* Translate to user’s preferred language
* Generate concise, accurate descriptions
* Infer possible allergens (never guaranteed)
* Provide similar dish references (e.g., “similar to dumplings”)

### Allergen Safety (Mandatory)

* Always label allergens as “possible”
* Never assert safety
* Display a visible disclaimer:
  > “Allergen information is inferred and may be incomplete. Always confirm with restaurant staff.”

## Mobile App Architecture
### Platform
* React Native
* Expo (custom dev client or bare)
* iOS and Android

### Performance Constraints
* No on-device AI inference
* Compress & downscale images before upload
* Use background jobs + polling or websockets
* Cache results aggressively

### UX Requirements
* Camera crop + rotate
* Loading states with progress
* Error recovery (blurry image, bad lighting)
* Accessible font sizes
* Offline access to saved menus

## Backend Architecture
### API Layer
* Node.js + TypeScript
* Stateless REST or GraphQL
* Authentication (email or social)

### Services

1. Upload Service
   * Pre-signed upload URLs
   * Image hashing for deduplication

2. OCR Service
   * Extract raw text and bounding boxes

3. AI Processing Worker
   * Takes OCR + image
   * Calls multimodal LLM
   * Outputs structured JSON
   * Applies schema validation

4. Caching Layer
   * Hash-based menu reuse
   * TTL-based invalidation

5. Persistence
   * Users
   * Menus
   * Scan history
   * Subscription status

## AI Responsibilities
### Input

* Menu image
* OCR text (if available)
* Detected language
* User language preference

### Output (STRICT JSON)
```json
{
    "menu_language": "ja",
    "sections": [
        {
            "name": "Appetizers",
            "items": [
                {
                "name": "Gyoza",
                "translation": "Pan-fried dumplings",
                "description": "Savory pork and vegetable dumplings, pan-fried until crisp",
                "possible_allergens": ["wheat", "soy"],
                "dietary_notes": ["contains meat"],
                "similar_dishes": ["potstickers", "dumplings"],
                "confidence": 0.92
                }
            ]
        }
    ]
}
```
### AI Constraints

* Do not invent dishes
* Prefer uncertainty over hallucination
* Include confidence scores
* Use concise, neutral language
* Never claim allergen safety

## Monetization Model
### Free Tier

* 3–5 scans/month
* Translation + basic descriptions

### Pro Subscription

* Unlimited scans
* Allergen analysis
* Similar dishes
* Saved menus
* Offline access

### Optional Add-ons

* Pay-per-scan bundles
* Restaurant-facing QR menu tools
* Travel packs (cached popular menus)

## Non-Functional Requirements
### Security

* Signed uploads only
* No public image URLs
* Rate limiting
* Abuse prevention

### Cost Controls

* Image hashing & reuse
* OCR before LLM
* Token budgeting
* Cache popular menus

### Legal

* Clear disclaimers
* No medical or dietary guarantees
* Privacy-first defaults

### Deliverables

1. Mobile app codebase
2. Backend API + worker services
3. Database schema
4. AI prompt templates
5. JSON schemas
6. Subscription logic
7. App Store–ready UX

### Success Criteria

* Menu scan completes in under 10 seconds
* Output is readable, structured, and trustworthy
* User understands dishes they couldn’t before
* Costs scale linearly with usage
* App feels delightful, not “techy”