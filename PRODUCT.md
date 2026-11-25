# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile web app (~430px), shipped to App Store and Google Play inside Capacitor (`android/`, `ios/`). The design language is web, not native iOS/Android; the one deliberate native borrowing is the iOS 26-style glass tab bar.

## Users

Two linked audiences; neither is secondary, because each exists for the other:

- **Tourists in Osh without a guide**, foreign or Russian-speaking, phone in hand on the street, often with weak or no connection. Job: see what's worth seeing, build a plan for the day, get around, and book a tour they can trust.
- **Local tour agencies in Osh**. Job: list their tours, pass verification, receive and confirm booking requests. They work from the agency cabinet (`/agency`), often on a computer.

ViaMia staff moderate agencies and tours from `/admin`.

## Product Purpose

A guide to Osh, Kyrgyzstan: places, a day route, interesting facts, local phrases and etiquette, weather, plus tours by local agencies booked as a request (no online payment yet: the agency confirms, the tourist pays on site). Success: a tourist plans and lives a day in Osh from one app, and verified agencies get real bookings through it.

## Positioning

- **Verified agencies.** Agencies submit documents, ViaMia moderates them and their tours, and the tourist sees a "verified" mark and the organizer. Tours that only come from an agency website are labeled as not verified.
- **Local context.** Kyrgyz culture, etiquette tips, Kyrgyz phrases with transcription and speech, subtle Kyrgyz symbolism (tunduk, "kochkor muyuz" ornament).
- **Works offline.** Tours, tickets, favorites and a downloadable Osh map work without internet.

Navigation itself is handed off to 2GIS ("open in 2GIS" / "route in 2GIS"); ViaMia does not compete with it as a map.

## Operating Context

- Tourist: outdoors, one hand, sun glare, roaming or no data; light and dark theme (follows the phone by default).
- Agency: cabinet on desktop or phone; booking requests arrive with status new → confirmed / declined / done; contact by phone or Telegram.
- Interface languages: Russian is primary; English and 10 more (ky, kk, uz, tr, de, fr, es, zh, ja, ko). Prices stored in USD, shown in the chosen currency with live rates.
- Sign-in by email one-time code (phone codes only for test numbers until an SMS gateway exists).

## Capabilities and Constraints

- Tabs: Guide / Map / Route / Tours / Profile. Saved, tips, tickets, booking flow, account deletion, privacy policy.
- Backend: Supabase (tours, facts, agencies, booking requests, profiles, RLS). Hosting: Vercel. Crash reports: Sentry (no personal data).
- Map: MapLibre + OpenFreeMap tiles, places from OpenStreetMap, offline via `osh://` protocol.
- Not yet: online payment (Freedom Pay, needs a legal entity), push notifications, agency notifications (Telegram planned).
- Launch target: December 15, 2026, App Store and Google Play.

## Brand Commitments

- Name: **ViaMia**. App id `kg.viamia.app`.
- The approved style stays as it is (user, 25.11.2026): terracotta single accent, indigo, small gold tags, sand background, Manrope + Playfair Display. Source of truth: `design/tokens.css` and `design/*.html`, rules in `CLAUDE.md`. Refinement only, no new visual world.
- Bottom navigation is the iOS 26-style glass capsule (`src/TabBar.jsx`), the user's own decision overriding the mockup.
- Interface copy only through `t()`; no hard-coded strings.

## Evidence on Hand

- 18 published tours sourced from bestofosh.com (photos, texts, links) with agency names; none are registered agencies yet. Agency count at launch: 0 registered, 1-2 expected to self-register.
- No reviews, testimonials, partner logos or press. Ratings shown on tours come from the source data. Do not fabricate agency prices, contacts, reviews or verification.

## Product Principles

1. Trust is the product: show what is verified and say plainly what is not.
2. Useful without connection: anything a tourist needs on the street must survive offline.
3. Local, not generic: Osh-specific context beats generic travel-app content.
4. Hand off what others do better (navigation to 2GIS) instead of rebuilding it.
5. Both sides must work: a tourist action that no agency can receive is a bug.
