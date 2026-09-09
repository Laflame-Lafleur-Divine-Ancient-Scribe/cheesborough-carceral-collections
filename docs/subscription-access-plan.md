# Subscription and access plan

**Latest user decision:** All articles, CrimeNewsTV videos, games, search, and the Criminal Justice Directory stay free. This overrides the initial paid-reading proposals below. PDF downloads require an active subscription of at least $3. The implemented tiers are $3 PDF downloads, $6 PDF downloads plus a private notebook (50 notes), and $9 PDF downloads plus a private notebook (200 notes). All six reading guides and collections are free too. See `membership-operations.md` for the current system.

Prepared September 8, 2026. Original planning audit. The subsequent implementation is documented in `membership-operations.md`; its narrower initial catalog and actual delivered features supersede future-benefit suggestions below.

## Recommendation

Keep the public archive useful. Charge for original member reading, organized research collections, and deeper research tools. Keep the existing names and monthly prices: $3 Plugged In, $6 Full Member, $9 Legacy Circle. Each paid level includes the lower levels. Make $6 the main membership; $9 adds research convenience and stronger support rather than making the $6 library feel incomplete.

Assumptions: prices are USD per month; “unrestricted users” means visitors without the required membership. These are proposed assignments, not a report that paid access currently works. The audit covered the source of all 59 root HTML pages and three game entry pages, plus relevant billing/access code. Downloaded archival HTML copies were inventoried as source material, not separate product pages. This was a source review, not a live browser or payment test.

## Membership ladder

| Level | Reader promise | Included | Excluded |
|---|---|---|---|
| Public, free | Explore the archive and find help | Public history, news, legal resources, catalog browsing, source citations, selected documents, basic search, basic games | Member articles, curated premium bundles, member workspace |
| Free account | Join the conversation | Profile, moderated comments, basic saves, signed-in game participation | Paid reading and research benefits |
| $3 Plugged In | Read the member stories | Selected original long reads, one rotating featured case collection, member reading list and release updates | Full curated research collection and advanced workspace |
| $6 Full Member | Follow the complete record | All $3 benefits; organized case dossiers, document collections, member photo sets, annotated reading editions, standard research downloads | Bulk research exports, advanced workspace, Legacy previews |
| $9 Legacy Circle | Build your own research file | All $6 benefits; research workspaces, packaged reports and datasets, citation/bulk exports, early project previews, optional supporter acknowledgment | Custom research on demand, physical gifts, administrator tools |

Avoid arbitrary monthly reading limits. Define exactly which featured collection $3 includes and its rotation date; old featured collections remain in the $6 library. Do not promise newsletters, cloud saves, reports, or early releases until they exist and can be maintained. Offer a free sample of each paid format.

## Every site page: proposed access

“Free + $6” means the public page remains accessible and only its added research collection requires $6. Existing public narrative and source references should remain readable. The reader pages inherit the selected asset's tier, not a single blanket price.

| Pages | Access | What to offer or restrict |
|---|---|---|
| `index.html`, `index2.html` | Free | Discovery, free/member labels, previews, and membership links; keep both versions consistent. |
| `ABOUT.html`, `CONTACT.html` | Free | Mission, contact, contributions, and access assistance. |
| `ANALYTICS-PRIVACY.html` | Free | Privacy information and controls. |
| `DONATE.html`, `SUBSCRIPTIONS.html` | Free entry | Plans, giving, billing help, and cancellation; authenticate private billing actions. One-time gifts do not automatically buy membership. |
| `LOGIN.html`, `RESET-PASSWORD.html` | Free entry | Account creation, sign-in, and recovery; never put recovery behind a paid gate. |
| `PROFILE.html` | Free account | Own profile and privacy settings. |
| `COLLECTIONS.html` | Free | Catalog and descriptions; individual items carry access labels. |
| `NEWS.html` | Free | Current-affairs discovery and outbound reporting links. Charge only for separately produced member analysis. |
| `CRIMINAL-JUSTICE-DIRECTORY.html` | Free | Help, organizations, and public resources. |
| `LAW-LIBRARY.html`, `BILL-OF-RIGHTS.html` | Free | Legal reference, original texts, research introductions. |
| `AMENDMENT-1.html`, `AMENDMENT-2.html`, `AMENDMENT-3.html`, `AMENDMENT-4.html`, `AMENDMENT-5.html` | Free | Texts, explanations, and reference links. |
| `AMENDMENT-6.html`, `AMENDMENT-7.html`, `AMENDMENT-8.html`, `AMENDMENT-9.html`, `AMENDMENT-10.html` | Free | Texts, explanations, and reference links. |
| `SEARCH.html` | Free + $9 tools | Basic site/web search and safe previews free; proposed saved research queries and organized exports at $9. Do not expose protected text in search data. |
| `EVIDENCE-INDEX.html` | Free + $6 bundles | Public citations and source finding; member bundles clearly marked. |
| `RESEARCH-STARTERS.html` | Free + $6/$9 | Existing prompts free; expanded guided worksheets $6; proposed persistent projects and exports $9. |
| `RESEARCH.html` | Free + $6 | Paperwork catalog and representative public filings free; organized annotated case collections $6. |
| `BOOKS-AND-MANUSCRIPTS.html` | Free + $6 | Bookshelf, public editions, and source links free; added annotated editions and curated study packets $6. |
| `PDF-READER.html` | Asset dependent | Public documents free; authorized member documents follow their resource tier. |
| `DATA-READER.html` | Asset dependent | Existing public workbooks free; enriched research datasets/exports $9 when produced. |
| `PHOTOGRAPHY.html`, `PHOTOGRAPHY-BY-STATE.html` | Free + $6 | Gallery previews and selected images free; curated full sets and permitted high-resolution downloads $6. |
| `PERSONAL-COLLECTIONS.html` | Free + optional $3 additions | Keep current community stories and contribution invitation open. New member editions only with contributor agreement. |
| `MAMA-HERC.html`, `BEHIND-THE-GATE.html` | $3 additions | Good anchors for original member reading. Keep existing articles public; add substantial labeled member continuations or publish future installments at $3. |
| `AMERICAN-SIBERIA.html`, `AmSiberUncovered.html` | Free + $6 | Public introduction/edition and references; organized study dossier $6. Preserve equivalent access through alternate entry routes. |
| `FLORIDA-PRISON-SYSTEM.html`, `MalachiMartin-Chattahoochee.html`, `MILLEDGEVILLE-TO-PINE-WOODS.html` | Free + $6 | Public historical narrative; added annotated research packets $6. |
| `RIVERS-LOVE.html`, `NEWBERRY-AND-FORTUNE.html`, `FORTUNE-FERGUSON.html` | Free + $6 | Keep biographies, timelines, and source citations open; organized complete study collections $6. |
| `FERGUSON-JETT-STUDY.html`, `JUVENILE-DEATH-PENALTY.html` | Free | Reference summaries and source attribution; avoid turning third-party material into a claimed exclusive benefit. |
| `GROVELAND-FOUR.html`, `Dunbar.html` | Free + $6 | Public case narrative and legal history; added comparative case packets $6. |
| `DOZIER-RESEARCH.html`, `DOZIER-1969-REPORT.html`, `DOZIER-NEWSPAPERS.html` | Free + $6 | Public history, report, selected issues, and source links; organized issue bundles and added annotations $6. |
| `VIDEOS.html`, `VIDEO.html` | Free discovery + free account | Public video discovery and external viewing; free-account saves/comments. New original companion case notes can be $3 and full companion dossiers $6. Do not sell access to publicly available YouTube embeds as exclusive video. |
| `GAMES.html` | Free | Game discovery and existing prison-yard experience. |
| `games/cheesborough-carceral-chess/index.html` | Free basic play | Optional future $3 cosmetics or saved progress only after implemented. |
| `games/street-dice-game/index.html` | Free basic play | Same policy; retain playable rules and controls. |
| `games/jail-house-poker/index.html` | Free account | Preserve account requirement for table participation; do not split a small player pool by paid level. |
| `OWNER.html`, `DEVELOPER-ANALYTICS.html`, `SITE-STUDIO.html` | Owner only | Membership never grants administration, analytics, editing, or member records. |
| `RECOVER-OWNER.html` | Owner recovery only | Recovery form may be reachable; verified owner recovery is separate from subscriptions. |

Other HTML under `03_Research/` and `RESEARCH WEBSITE HERO/` consists of downloaded research-source pages. Treat these as source assets, preserve attribution, and do not count duplicate copies as membership inventory. Apply the same asset policy to PDFs, books, spreadsheets, full-resolution images, embedded files, and any alternate URLs. Third-party and already-public materials do not become exclusive simply because this site presents a copy. Membership should emphasize original interpretation and organization; check distribution permissions before adding downloads.

## Upgrade overlay

Use an in-page dialog in the site's navy, cream, and gold design. Show it when someone selects a labeled restricted article, section, or download. On direct entry to a member URL, render its public preview and upgrade panel. Avoid automatically interrupting every public page visit.

Example for a visitor opening a Full Member dossier:

> **Follow the full record.**
>
> This research collection is included with Full Member. Get the organized documents, source notes, and related case files for **$6/month**.
>
> **Join Full Member — $6/month**
>
> Already a member? Sign in. · Compare plans · Keep reading free

For an existing $3 member, use “Upgrade to Full Member — $6/month” and show the current plan. Explain that $6 is the new monthly total; show any exact prorated charge before confirmation. Offer the least expensive qualifying plan first, with $9 as a secondary option. Never send an existing subscriber through a second independent subscription checkout.

Interaction rules:

- Check the session and current access before showing an upgrade request. An authorized reader goes straight through.
- Signed-out visitors get both sign-in and join options. A free account is not a paid membership.
- Close button, Escape, and “Keep reading free” return to the preview or prior page. Closing never reveals protected content.
- Use an accessible dialog with a clear title, keyboard focus containment and restoration, scrollable mobile content, and buttons reachable at small screen sizes.
- If access verification fails, show “We couldn't check your membership. Try again.” Offer retry and account help rather than incorrectly declaring a paid user unsubscribed.
- After checkout, wait for server-confirmed access, then return to the requested article/document. Preserve only validated local return destinations.
- Show clear recurring price, billing interval, and cancellation link before payment. Retain billing/recovery access even after membership expires.
- Public previews contain titles, descriptions, and a genuine excerpt. Do not download the full paid text and merely blur or hide it.

## Current implementation and required changes

Verified locally: `DONATE.html` already advertises $3 Plugged In, $6 Full Member, and $9 Legacy Circle. `server.js` creates recurring Checkout sessions, records checkout data, and verifies webhook signatures. `subscriptions.js` and `lib/billing-service.js` provide billing portal entry. `video-access.js` checks login, not a paid entitlement.

The current webhook accepts only `checkout.session.completed` and records a subscription as active when a subscription ID exists. That is insufficient for renewals, failed payments, cancellations, and plan changes. Existing payment code is a starting point, not proof of reliable member access or live billing configuration.

1. **Define the catalog.** Create one registry of resource ID, public preview, minimum tier, protected location, and permitted downloads. Use existing tier IDs `plugged_in`, `full_member`, and `legacy_circle`. Keep owner permissions independent. Maintain a default-deny policy for unknown protected resources.
2. **Link subscriptions to accounts.** Require a verified account for new access-bearing subscriptions; keep guest one-time giving. Provide a verified claim flow for existing guest subscriptions. Never grant access merely because someone types a matching billing email. Inspect existing paid members before changing advertised benefits; preserve commitments or communicate a transition.
3. **Synchronize billing.** Store subscription/customer/user IDs, server-mapped price/tier, actual status, paid-through/access expiry, cancellation scheduling, and processed event IDs. Handle renewal payments, payment failures, subscription updates and deletions. Process duplicate events safely and reconcile current Stripe state so late events cannot revive canceled access. Do not grant access based on a success URL or client-supplied tier. Stripe describes these lifecycle events in its [subscription webhook documentation](https://docs.stripe.com/billing/subscriptions/webhooks).
4. **Enforce access on Railway.** Add a session-based membership endpoint and authorization for every premium content/download response. Keep paid files in private storage and use authorized streaming or short-lived links. The PDF/workbook reader should request a resource ID instead of accepting arbitrary protected file locations. GitHub Pages is [static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages); a JavaScript overlay alone cannot secure assets published there. Remove premium payloads from public builds, search indexes, raw repository paths, and alternate download routes. Previously public copies cannot be made undisclosed retroactively.
5. **Integrate the interface.** Add shared tier badges, previews, the upgrade dialog, account plan status, and return-to-content flow. Update donation copy to describe actual delivered benefits; separate one-time support from access subscriptions. Replace blanket video login redirection where it prevents public discovery.
6. **Set lifecycle rules.** Successful new payment grants verified access; pending/incomplete payment does not. Cancel-at-period-end retains access until the paid-through date. Downgrades take effect next billing period; upgrades require a confirmed billing change and clear charge preview. Recommended renewal-failure grace period: three days with billing notice, then suspend paid access. Never apply grace to an unpaid first purchase. Define full-refund/revocation and administrative access rules explicitly.
7. **Test before enforcement.** Verify guest, free-account, $3, $6, $9, expired, canceled, owner, and verification-error states. Test direct document URLs, disabled JavaScript, copied download links, unauthorized API requests, public search previews, duplicate/out-of-order webhooks, failed initial payments, renewals, upgrades, scheduled downgrades, cancellation, and guest claims. Test sign-in and checkout returns on actual phone browsers, especially cross-origin session cookies between the site and Railway. Use [Stripe's billing testing guidance](https://docs.stripe.com/billing/testing).

## Practical launch sequence

**First release:** retain the public pages; launch at least three substantial $3 member pieces and one featured mini-dossier. Prepare at least three complete $6 case collections, such as Rivers Love, Dozier, and American Siberia. For $9, prepare at least one original research report plus its organized dataset or citation packet. These are proposed deliverables, not assets verified ready for sale. If $9 tooling is not ready, describe Legacy Circle honestly as all $6 access plus additional support; do not advertise unfinished software.

**Second release:** add persistent reading lists/projects, saved research queries, and citation exports. Distinguish local-browser saves from account-backed storage. Add early previews only when there is an actual publishing schedule. Avoid labor-heavy promises such as unlimited personal research or frequent live events at these prices.

**Measurement:** record restricted-resource views, dialog opens, sign-in selection, checkout starts, server-confirmed subscriptions, successful unlocks, billing failures, and cancellations. Compare conversion by required tier and referring page. Count revenue from verified billing records rather than a thank-you-page visit; account for processing costs and content production before assuming profitability. Review actual behavior after 30 days, without withholding public help resources to increase conversion.

**Definition of ready:** each advertised benefit exists; paid content is protected at its source; accounts reliably receive and lose access according to billing state; cancellation remains available; phone sign-in and payment return have passed end-to-end testing. Launch a small verified catalog before expanding the gate across the archive.
