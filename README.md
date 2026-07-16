# Call Center Metrics

[Español](./README.es.md)

Call Center Metrics is an Angular single-page application for tracking daily call-center activity without building or maintaining a custom backend. It uses Supabase for authentication and database persistence, so a small operations team can record daily metrics, review month-to-date conversion, and understand how technical visits and call transfers evolve against handled calls.

## The Problem It Solves

Call-center teams often track daily operations in spreadsheets or chat messages: how many calls were handled, how many technical visits were sent, and how many of those visits were reschedules or installations. That approach creates several problems:

- Daily records are easy to duplicate or lose.
- Month-to-date percentages need manual recalculation.
- It is hard to compare conversion behavior day by day across a full calendar month.
- Operational context gets mixed with raw data, making corrections and follow-up slower.

This project turns that workflow into a focused app:

- Operators log in securely.
- A daily form captures the four required operational inputs.
- Supabase stores the data per authenticated user.
- The summary view calculates cumulative conversion for the selected calendar month.
- The chart makes trend changes visible immediately, including filtered views that remove reschedules, installations, or both from the numerator.
- A separate transfers view tracks total transfers and filters them by Commercial, Retention, or Other.

## Core Workflow

1. Users sign in or register through Supabase Auth.
2. After authentication, users enter the dashboard.
3. The "Carga diaria" menu lets users save the current day's metrics:
   - Total calls handled.
   - Total technical visits, including reschedules and installations.
   - Technical visits that are only reschedules.
   - Technical visits that are only installations.
4. The app prevents a second daily record from being created from the form when a record already exists for today.
5. If a value was entered incorrectly, the user can edit that day from the monthly summary table.
6. The "Resumen" menu shows a full-month chart and table for the selected month.
7. The "Transferencias" menu uses call-by-call records to show the cumulative transfer rate and filter it by destination area.

## Conversion Calculation

The summary chart uses a cumulative month-to-date calculation.

Example:

- Day 1: 20 calls, 5 technical visits = 25%.
- Day 2: 30 calls, 0 technical visits.
- Cumulative result after Day 2: 50 calls, 5 technical visits = 10%.

The chart always covers the complete selected calendar month, such as July 1 through July 31. It does not show rolling ranges like May 15 through June 15.

Available chart filters:

- Total visits.
- Total visits minus reschedules.
- Total visits minus installations.
- Total visits minus reschedules and installations.

The graph also includes an interactive hover experience: moving the mouse over the chart snaps to the nearest day, shows a vertical guide line, and displays the exact date and percentage.

The transfers chart follows the same full-month cumulative model: transferred calls divided by all handled calls recorded so far in the selected month. Each call can contribute at most one transfer, and the view can show all transfers or only Commercial, Retention, or Other destinations.

## Features

- Supabase email/password authentication.
- Protected dashboard route.
- Daily metrics form with required fields.
- Validation that reschedules plus installations cannot exceed total technical visits.
- Duplicate-day prevention in the UI.
- Edit flow from the summary table.
- Full-month cumulative conversion chart.
- Visit filter controls for alternate numerator definitions.
- Interactive chart tooltip with exact day, date, and percentage.
- Monthly table with cumulative calls, considered visits, and conversion.
- Separate cumulative transfers chart with destination-area filters.
- Netlify SPA redirect support through `public/_redirects`.
- Browser favicon in `public/favicon.ico`.

## Tech Stack

- Angular 21.
- Angular Router.
- Angular Reactive Forms.
- Supabase JavaScript client.
- Supabase Auth.
- Supabase Postgres.
- Tailwind CSS import plus custom CSS.
- Vitest through Angular's unit-test builder.

## Project Structure

```text
src/app/core/services/auth/       Supabase authentication wrapper
src/app/core/services/metrics/    Daily metrics and call-record database operations
src/app/core/services/supabase/   Supabase client creation
src/app/features/auth/            Login and register screen
src/app/features/dashboard/       Daily form, visits and transfers charts, tables, editing flow
src/app/models/metrics.ts         Daily metric and call-record interfaces
src/environments/environment.ts   Supabase project configuration
public/_redirects                 Netlify redirect rule for Angular routes
public/favicon.ico                Browser tab icon
```

## Routes

- `/auth`: login and registration screen.
- `/dashboard`: protected dashboard.
- `/privacy`: public bilingual privacy policy.
- `/`: redirects to `/dashboard`; unauthenticated users are sent to `/auth`.
- Any unknown route redirects to `/auth`.

## Backend and Data Protection

The application is connected to Supabase for authentication and persistence. Supabase replaces a custom backend in this project: the Angular app authenticates users, reads and writes daily metrics, and relies on database-side access rules to protect operational data.

The database stores daily metrics and individual call records for authenticated users. Call records support technical-visit counts and at most one destination-classified transfer per call. Sensitive implementation details such as the full table definition, constraints, and Row Level Security policies are intentionally kept out of this public documentation. They should live in the Supabase project configuration or internal deployment notes.

At a product level, the data layer must guarantee:

- Users can only access the operational records they are allowed to see.
- A user cannot create duplicate records for the same work date.
- Visit breakdown values cannot exceed the total number of technical visits.
- Authentication and authorization are enforced by Supabase, not only by UI checks.

## Deployment

This project is ready for Netlify-style SPA hosting. The file `public/_redirects` contains:

```text
/* /index.html 200
```

That rule ensures direct navigation to routes such as `/dashboard` serves `index.html`, allowing Angular Router to handle the route in the browser.

For Angular's current build output, the deployable directory is:

```text
dist/call-center-metrics/browser
```

## Privacy and Security

Call Center Metrics is designed for authenticated operational use. The dashboard is not available to anonymous visitors, and daily records are tied to signed-in users through Supabase Auth.

From a reader's perspective, the important guarantees are:

- Access starts with email/password authentication.
- The dashboard route checks for an active session before showing operational data.
- Daily records are validated before they are saved.
- The app avoids accidental duplicate submissions for the same day.
- Sessions can persist across browser refreshes, and users can explicitly close them with "Cerrar sesión".

Operational metrics are business data. The app should therefore be deployed only against a Supabase project with database-side access controls enabled and maintained by the project owner.

## Product Direction

Good next improvements would be:

- Role-based access for supervisors.
- Team-level summary views.
- CSV export.
- Notes or audit history for edited days.
- Password reset flow.
- More production-ready environment separation.
