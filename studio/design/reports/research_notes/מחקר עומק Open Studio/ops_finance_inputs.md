# Operating and financial-model inputs for launching OPEN STUDIO in Israel (round two)

Research date: 28.10.2026. About 20 web searches in Hebrew and English. This round fills the gaps left by `israel_legal_funding.md` (payments, trademark search, accountant costs) and `business_models_cases.md` (photography cost, SMB benchmarks). It does not repeat them.

**Network note.** Page fetches to www.gov.il, developer.paddle.com and www.digitalix.co.il were blocked in this session (DNS not allowed), so I did not work around them. Many figures below come from search-result summaries of these pages, not from reading them in full. developer.apple.com could be fetched and was read directly. Anything marked **(estimate)** is my calculation or judgement, not a sourced figure.

---

## 1. Payment providers: subscriptions (artists ₪29/month) and one-off B2B charges (galleries ₪590 / ₪390/month)

### Takeaway
The cheapest, simplest route for an Israeli licensed dealer is an invoicing system with built-in clearing: morning (Green Invoice) clearing via Grow costs **1.4% + ₪1.2 per transaction** on the Best plan (₪45–54/month), and issues the tax invoice automatically. Local gateways (Cardcom, Tranzila, PayPlus) cost about **1.2–1.8% plus ₪49–200/month**, and comparison sites disagree with each other. Paddle and Lemon Squeezy cost **5% + $0.50**, about 3–4 times more. That is only worth it if they also handle foreign VAT and sales abroad. I found no confirmation that either one onboards Israeli sellers.

### Cited Findings
**morning / Green Invoice (official pages, as summarised by search):**
- Plans before VAT: Basic ₪29/month (or ₪348/year); Best ₪45/month on an annual plan, or ₪54 billed monthly; Extra ₪74/month on an annual plan; Prime ₪129/month (up to 5 businesses and 500 documents a month). — [greeninvoice.co.il/pricing](https://www.greeninvoice.co.il/pricing/)
- Clearing:
  - Basic: ₪29/month on top of the plan. Best and Extra: no monthly clearing fee.
  - Every plan: ₪1.2 fixed per transaction.
  - Rate: 1.6% on Basic, 1.4% on Best, 0.95–1.4% on Extra.
  - Clearing is provided through Grow (Meshulam).
  - Source: [greeninvoice.co.il/digital-payments](https://www.greeninvoice.co.il/digital-payments/)
- One secondary guide (about two years old) says Best includes standing orders (recurring charges) and full integrations. I found no current official confirmation. — [yeshinvoice.co.il](https://yeshinvoice.co.il/article/how-much-does-a-green-invoice-cost); [msl.org.il review](https://msl.org.il/guide/morning-green-invoice-review/)

**Grow (Meshulam), standalone:** one comparison cites a ₪59/month plan with invoices included, at 1.4%, or 1% with the invoicing service. The date is unclear. — search summary of [lastartup.co.il](https://www.lastartup.co.il/blog/the-ultimate-guide-for-payment-providers) / [yydevelopment](https://www.yydevelopment.co.il/credit-cards/). I found no official Grow price list.

**Cardcom:**
- From 1.2% according to Cardcom's own page. One comparison says ₪49/month; another says 1.2–1.6% and ₪90–180/month. — [cardcom.solutions](https://www.cardcom.solutions/%D7%A2%D7%9E%D7%9C%D7%AA-%D7%A1%D7%9C%D7%99%D7%A7%D7%94-%D7%9C%D7%A2%D7%A1%D7%A7%D7%99%D7%9D/); [codix.co](https://codix.co/ecommerce-payment-gateway/)
- Conflict: these sources disagree with each other.

**Tranzila:**
- Has held an acquiring licence from the Bank of Israel since 2017.
- Rates cited: 0.9–1.3%; or 1.2–1.7% plus ₪90–200/month; or from 1.3% (2025 guide).
- Sources: [lastartup](https://www.lastartup.co.il/blog/the-ultimate-guide-for-payment-providers); [codix](https://codix.co/ecommerce-payment-gateway/)
- Conflict: the sources disagree.

**PayPlus:**
- One guide says 1.8% for Israeli cards and ~2.8% for foreign cards. Another says 0.9–1.3% and ₪0–150/month.
- It has a public API (v1.0), a test environment with API key, secret key and page UID, and tokenisation is handled on its servers.
- Sources: [docs.payplus.co.il](https://docs.payplus.co.il/reference/introduction); [PayPlus API FAQ](https://www.payplus.co.il/faq/%D7%A1%D7%9C%D7%99%D7%A7%D7%94-%D7%90%D7%99%D7%A0%D7%98%D7%A8%D7%A0%D7%98%D7%99%D7%AA/%D7%97%D7%99%D7%91%D7%95%D7%A8-%D7%95%D7%94%D7%A8%D7%A9%D7%90%D7%95%D7%AA-API/How-to-Make-a-Request-to-a-Payment-Page-Using-an-API)

**Other comparison sources:**
- Further comparisons, 2025–2026: [digitalix 2026](https://www.digitalix.co.il/credit-card-clearing-fees-comparison/) (blocked here, seen only in search); [adircpa 2026 guide](https://adircpa.com/guides/payment-options-israel); [check-box](https://check-box.co.il/category/clearing-providers/)
- Most are blogs or comparison sites, some out of date, and they contradict each other. The consistent base rate is about **1.2–1.4% on Israeli cards**.

**Paddle (Merchant of Record):**
- 5% + $0.50 per transaction, no monthly fee. — [dupple.com 2026](https://dupple.com/learn/cheapest-merchant-of-record-platforms); [rework.com](https://resources.rework.com/tools/billing-revenue/paddle-vs-lemon-squeezy)
- It sells to buyers in 200+ countries and collects and remits tax. Sanctioned seller countries are blocked. — [Paddle docs (search summary)](https://developer.paddle.com/concepts/sell/supported-countries-locales)
- I found no explicit statement on whether Israeli sellers are accepted. The first round cited a guide saying Paddle "supports Israel" ([adircpa](https://adircpa.com/en/guides/stripe-israel-tax)).

**Lemon Squeezy:**
- 5% + $0.50, plus 1.5% on international cards and 1.5% on PayPal. — [swell.is](https://www.swell.is/content/lemon-squeezy-pricing); [beehiiv blog](https://beehiivblog.beehiiv.com/p/lemon-squeezy-alternatives)
- Stripe bought it in 2023 and its direction is uncertain. — same sources

### Inferences
Cost per charge, using the morning Best rate of 1.4% + ₪1.2 (estimate):
| Charge | morning/Grow (1.4% + ₪1.2) | Paddle (5% + $0.50 ≈ ₪1.7–1.9) |
|---|---|---|
| Artist ₪29 | ≈ ₪1.6 (5.5%) | ≈ ₪3.2–3.4 (11–12%) |
| Gallery ₪390 | ≈ ₪6.7 (1.7%) | ≈ ₪21 (5.4%) |
| Gallery ₪590 | ≈ ₪9.5 (1.6%) | ≈ ₪31 (5.3%) |

- **Recommendation for the model (estimate):**
  - Year 1: invoicing plus clearing in one system (morning Best or Extra, or iCount), about ₪600–900 a year plus about 1.6–5.5% per charge.
  - Galleries: a one-off charge, or a standing order by card, with an automatic tax invoice. An allocation number is needed above ₪5,000; ₪590 is far below that.
  - Paddle: only for selling abroad, where it also handles foreign VAT.
- The fixed ₪1.2 makes the ₪29 subscription relatively expensive. Annual artist billing (₪290/year) cuts the fixed cost by 12 (estimate).
- Before choosing, check in writing: recurring charging by token via API, webhooks, and failed-payment handling (dunning). No source covered these in detail for Cardcom or Tranzila.

### Gaps
- No official price list for Grow, Cardcom, Tranzila or PayPlus. The sites are marketing pages ("contact us"). Written quotes are needed.
- No confirmation that Paddle or Lemon Squeezy onboard Israeli sellers. I found no details on how a payout to Israel is taxed.
- The API quality and recurring-billing support of each local provider were not checked against their documentation (pages blocked or not found). The exception is PayPlus, which has public docs.

---

## 2. Apple and Google: when in-app purchase is mandatory, and external links after Epic (2025–2026)

### Takeaway
An artist's ₪29 subscription to an iOS app that "unlocks features" is classic in-app purchase. In the Israeli App Store an external payment link is not allowed (the external-link permission for reader apps covers magazines, books, music and video, not art). In the US alone, a payment link is allowed, and the commission Apple may charge is still being litigated. **The gallery charge (B2B, a service performed outside the app) and selling through the web/PWA are not subject to IAP.** The safe route: sell on the web, and use a native app only for content and access.

### Cited Findings
- **3.1.1:** "If you want to unlock features or functionality within your app, (by way of example: subscriptions… access to premium content…), you must use in-app purchase." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (read directly)
- **3.1.1(a):** apps may receive an External Purchase Link entitlement in certain regions only. "In all other storefronts, except for the United States storefront… apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase." — [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **3.1.3(a) Reader apps:** limited to "magazines, newspapers, books, audio, music, and video". They may offer free account creation and request an External Link Account Entitlement. In the US no entitlement is needed. — same source
- **3.1.3(b) Multiplatform:** content bought on the web may be accessed in the app, "provided those items are also available as in-app purchases within the app". — same source
- Apple's May 2025 update removed the anti-steering ban in the US storefront. — [9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/)
- In December 2025 the Ninth Circuit upheld the civil-contempt finding against Apple over the 27% commission on purchases through links. — [9th Cir. opinion](https://cdn.ca9.uscourts.gov/datastore/opinions/2025/12/11/25-2935.pdf); [Justia](https://law.justia.com/cases/federal/appellate-courts/ca9/25-2935/25-2935-2025-12-11.html)
- **Apple's proposal for a link-out commission (US):**
  - 15% standard.
  - 10% for subscription renewals and partner programmes.
  - 5% for the Small Business Program.
  - Source: [lockurblock](https://lockurblock.com/apple-proposes-commissions-of-up-to-15-for-off-app-store-purchases-in-the-us-u)
- Until a ruling, one source says the fee is 0%. — [Stora 2026](https://stora.sh/blog/2026-05-16-apple-app-store-external-purchase-links-implementation-guide)
- The Supreme Court agreed to hear Apple's appeal (*Apple v. Epic*, 2026 term). — [Oyez](https://www.oyez.org/cases/2026/25-1311); [tech-insider](https://tech-insider.org/apple-epic-supreme-court-2026/)
- Status unclear: I found no ruling setting the rate after the August 2026 hearing. The sources conflict on the details.
- **Apple enforcement:** Apple removed Cal AI (April 2026) for processing digital purchases through Stripe inside the app without IAP, according to a vendor blog. — [Stora](https://stora.sh/blog/2026-05-16-apple-app-store-external-purchase-links-implementation-guide)
- **Google Play (US):**
  - From 1.10.2026 developers in the US external links and alternative billing programmes report transactions and pay fees. — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/15582165)
  - Rates reported: 10% on auto-renewing subscriptions, 20% on other content, and a fee per install from a link ($2.85 per app). — [Notebookcheck](https://www.notebookcheck.net/Google-cuts-Play-Store-fees-as-Epic-settlement-reshapes-Android-app-payments.1243278.0.html)
  - Approval of the settlement is not final. — [stash.gg April 2026](https://www.stash.gg/blog/blog-epic-v-google-settlement-update-april-2026)
- Small Business Program at 15% (Apple/Google): already in the first round (`app_world_tech.md` §2). Not repeated here.

### Inferences
- **The gallery charge is a service to a business, sold outside the app.** It does not unlock features for an app user. Sell it on the web with a regular invoice. This is not IAP (inference; check with App Review if the store app has a gallery-management screen).
- **Artist subscription:**
  - Stay a PWA: no fee and no restriction.
  - Ship a native app to the Israeli store: the subscription must also be offered as IAP (15% under the Small Business Program), and the app may not point to the website for payment.
  - Model inputs (estimate): 0% store fee in a PWA-only scenario; 15% on the share of artists who subscribe inside the iOS app in a native scenario.
- A free native app that only displays content (no purchase inside it and no call to buy) is a realistic path for visitors. Rule 3.1.3(f) is narrow and does not cover art apps, so be careful not to show "subscribe" or prices in the app (inference).

### Gaps
- The exact US link-out commission after the 2026 hearing and the Supreme Court ruling: unknown.
- Whether App Review treats a gallery dashboard inside the app as "digital content": not sourced.

---

## 3. Accounting and legal setup costs in Israel

### Takeaway
An accountant costs **about ₪250–700/month for a licensed dealer**, and **about ₪1,300–2,500/month for a company** plus the annual report. Registering a company costs **₪2,559 online**, and the annual fee is **₪1,338–1,777** (2026 table, to be verified). An Israeli trademark costs **₪1,904 for the first class + ₪1,432 for each additional class** (2026), plus a lawyer.

### Cited Findings
- **Accountant for a licensed dealer:**
  - Median ₪350/month, range 250–500 (sample of 19 deals). — [yes-please](https://www.yes-please.co.il/%D7%A8%D7%95%D7%90%D7%99-%D7%97%D7%A9%D7%91%D7%95%D7%9F.html)
  - ₪450–700 for up to 50 transactions a month. — [endvoice 2026](https://endvoice.co.il/blog/%D7%9B%D7%9E%D7%94-%D7%A2%D7%95%D7%9C%D7%94-%D7%A8%D7%95%D7%90%D7%94-%D7%97%D7%A9%D7%91%D7%95%D7%9F-%D7%9E%D7%97%D7%99%D7%A8%D7%95%D7%9F-%D7%9E%D7%A2%D7%95%D7%93%D7%9B%D7%9F-2026/)
  - From ₪295/month. — [cpa-ea](https://cpa-ea.co.il/mehirim/)
  - Also: [Baker Tilly: accountant for a licensed dealer 2026](https://bakertilly.co.il/osek-mursheh-cpa)
- **Accountant for a limited company:**
  - Median about ₪1,500/month, range 1,300–1,800 (sample of 8). — [yes-please](https://www.yes-please.co.il/%D7%A8%D7%95%D7%90%D7%99-%D7%97%D7%A9%D7%91%D7%95%D7%9F.html)
  - Bookkeeping ₪800–3,000/month. — [Baker Tilly 2026](https://bakertilly.co.il/cpa-price-2026.html)
  - ₪1,500–2,500 plus the annual report. — [endvoice](https://endvoice.co.il/blog/%D7%9B%D7%9E%D7%94-%D7%A2%D7%95%D7%9C%D7%94-%D7%A8%D7%95%D7%90%D7%94-%D7%97%D7%A9%D7%91%D7%95%D7%9F-%D7%9E%D7%97%D7%99%D7%A8%D7%95%D7%9F-%D7%9E%D7%A2%D7%95%D7%93%D7%9B%D7%9F-2026/)
  - Outlier: ₪500–650. — [shakoof](https://shakoof.org.il/%D7%A2%D7%9C%D7%95%D7%99%D7%95%D7%AA-%D7%A8%D7%95%D7%90%D7%94-%D7%97%D7%A9%D7%91%D7%95%D7%9F)
  - All are commercial sources.
- **Companies Registrar (Corporations Authority tariffs, in a PDF headed 2026):**
  - Company registration ₪2,559 online, ₪3,123 otherwise.
  - Annual fee ₪1,338 if paid by 31.3, ₪1,777 from 1.4.
  - Source: [gov.il companies-fee-rates PDF](https://www.gov.il/BlobFolder/reports/companies-fee-rates-2020/he/companies-fee-rates-2025.pdf) (search summary only; the page was blocked)
  - 2025 for comparison: ₪1,306 / ₪1,734. — [RSM Israel](https://www.rsm.global/israel/he/insights/grh-sntyt-lrsm-hhbrwt-2025)
- **Israeli trademark (ILPO 2026):**
  - Filing: ₪1,904 for one class (≈$591), ₪1,432 for each additional class in the same application.
  - Immediate examination: ₪959 per class.
  - Source: [Richter & Shimoni, ILPO official fees 2026](https://richterpatent.com/ilpo-official-fees-26/)
  - 2025: ₪1,858 / ₪1,397. — [Richter 2025](https://richterpatent.com/ilpo-official-fees/)
  - Payment is per class. — [gov.il trademark service](https://www.gov.il/he/service/trademark_registration)
  - An attorney's fee schedule for 2026 is also available. — [GA-ADV schedule 2026 (PDF)](https://www.ga-adv.com/uploaded_files/ScheduleEng.pdf)
- **Madrid (WIPO):**
  - Base fee CHF 653 (black and white). — [Troutman](https://www.troutman.com/insights/the-madrid-protocol/?pdf=display) (about a year old)
  - EU designation: CHF 789 including the first class, CHF 48 for the second, CHF 144 for each additional class. — [WIPO individual fees](https://www.wipo.int/en/web/madrid-system/fees/ind_taxes)
  - US: CHF 460 per class from 12.4.2026 (down from CHF 530). — [WIPO Notice 21/2026](https://www.wipo.int/documents/d/madrid-system/information-notices-en-2026-madrid_2026_21_e.pdf)
  - Israel as a designated country: CHF 471 / 354 from 22.3.2026. — [WIPO Notice 4/2026](https://www.wipo.int/documents/d/madrid-system/information-notices-en-2026-madrid_2026_4_e.pdf-1)
  - Prokurio reports a further rise to CHF 503 / 378 from 17.10.2026. Not confirmed with WIPO. — [Prokurio](https://www.prokurio.com/international-trademark-fees-for-israel-set-to-rise-this-october/)
- **Lawyer for terms of service and privacy:** I found no reliable Israeli price for drafting terms of service or a privacy policy (the search returned only US sources). Under Amendment 13 the duty rests on the site owner, not the developer. — [emotive.co.il](https://www.emotive.co.il/?p=4904)

### Inferences
- **Trademark example (estimate, official fees only, without a lawyer, at ~₪4.1 per CHF):**
  - Israel, classes 9+42: ₪1,904 + ₪1,432 = **₪3,336**.
  - Madrid adding the EU and US (2 classes): base 653 + EU (789+48) + US (460×2) = **CHF 2,410 ≈ ₪9,900**.
  - Total ≈ ₪13,000 in fees, plus a trademark attorney's fee (unsourced; budget a few thousand shekels).
- **Accountant in the model (estimate):**
  - Months 1–12 as a licensed dealer: ₪400/month.
  - From incorporation: ₪1,500/month plus an annual report (≈ ₪5,000–8,000, not sourced; check).
  - Plus the annual company fee of ₪1,338.
- **Legal documents** (terms of service, privacy, artist and gallery licence): a range is needed from quotes. Budget assumption **₪8,000–20,000** one-off (pure estimate, unsourced).

### Gaps
- Typical lawyer fees in Israel for terms of service, privacy policy and licence agreements: not found.
- Trademark attorney fees in Israel: not found (the GA-ADV PDF was not read in full).
- Typical timeframes: I did not find a sourced ILPO examination time for 2026. Timeframes for EU and US designation were not checked.
- An annual company report and a tax comparison between a licensed dealer and a company: not sourced.

---

## 4. Naming: "Open Studio" / "OpenStudio"

### Takeaway
The name is weak as a trademark. "Open Studios" is the generic name for an entire genre of art apps and events (Cambridge, Hampshire, Suffolk Open Studios in the App Store), and "OpenStudio®" is a known software mark (NREL). I could not run a real search in TMview, the Global Brand Database or USPTO (dynamic databases, not reachable from here). A trademark attorney's search remains a must.

### Cited Findings
- **Regional "Open Studios" guide apps in the App Store** (finding artists by map, saving favourites):
  - [Cambridge Open Studios](https://apps.apple.com/us/app/cambridge-open-studios-2024/id1251645478)
  - [Hampshire Open Studios 2026](https://apps.apple.com/us/app/hampshire-open-studios-2026/id6450056990)
  - [Suffolk Open Studios 2025](https://apps.apple.com/us/app/suffolk-open-studios-2025/id1563782997)
  - [Banyule Open Studios 2025](https://apps.apple.com/us/app/-/id6752544464)
  - [Harlem Open Artist Studio Tour](https://apps.apple.com/us/app/id6748735908)
  - [Greenville Open Studios app](https://www.greenvillearts.com/mac-programs/open-studios-app/)
- **A near-identical name in the drawing category:** [ArtStudio – Draw and Paint](https://apps.apple.com/us/app/-/id354818333) (and ArtStudio Pro).
- I found no App Store app titled exactly "Open Studio" in the search, which is not proof that none exists.
- **OpenStudio® (NREL, energy software):** already in round one (`israel_legal_funding.md` §4).
- **Search tools to use:**
  - [Israeli trademark database search (gov.il)](https://www.gov.il/he/service/search_israeli_trademarks_database)
  - TMview, WIPO Global Brand Database, USPTO Trademark Search
  - Not searched here: dynamic databases, blocked.
- **Adjacent naming patterns in art apps** (names from sources in this round and round one):
  1. "Art" + a short word: [Artsy](https://en.wikipedia.org/wiki/Artsy_(website)), Artland (round one, `business_models_cases.md` §1), [Artlogic](https://artlogic.net/blog/68-4-key-trends-facing-galleries-2025-our-latest-report-can-help-you-plan-for/)
  2. Latin/foreign word: [Ocula](https://ocula.com/about/)
  3. A word in another language: [Kunstmatrix](https://kunstmatrix.com/en/node/301) (German, "art")
  4. "Smart" + suffix: Smartify ([JustUseApp](https://justuseapp.com/en/app/1102736524/smartify-scan-discover-art/reviews))
  5. Sponsor plus a verb: [Bloomberg Connects](https://bloombergconnects.org/)
  6. Descriptive: Artwork Archive (round one, `business_models_cases.md` §1)
  7. A place-name event: "<city> Open Studios" (the apps above)
  8. "Art" + tool: ArtStudio ([App Store](https://apps.apple.com/us/app/-/id354818333))
  9. Invented sound-alike: Vortic, Exhibbit (round one, `business_models_cases.md` §2)
  10. Analogy to music services: "Spotify of art" (as Artsy is described, [Freethink](https://www.freethink.com/?p=94233))

### Inferences
- "Open Studio" collides with a whole category in the stores (regional open-studio guides). That hurts app-store search and distinctiveness, and its chance of registration in classes 9/41/42 is low without a distinctive logo (inference, consistent with round one).
- Options (proposals, not checked): a combined mark (logo plus name); a coined word; Hebrew plus English. Run a knockout search before spending on a logo or domain.
- **Domains:** availability could not be checked from here, as the brief said. Check openstudio.co.il / .app, and the variants.

### Gaps
- No actual results from TMview, the Global Brand Database, USPTO or the Israeli register: the databases are dynamic and were blocked.
- Domain availability: not checked.

---

## 5. Inputs to a 24-month financial model: conversion, sales cycle, sales capacity, salaries, photography, insurance

### Takeaway
Rough benchmarks:
- **Pilot to paid:** about 15–25% in no-card trials, and about 40–55% in sales-led pilots.
- **SMB sales cycle:** about 2–6 weeks (median ~40 days).
- **Salaries:** a junior developer ~₪15–25K gross for a full-time post; a junior UI/UX designer ~₪12–18K.
- **Photography:** a professional photography day in Israel ~₪1,750–2,500 + VAT.
- **Insurance:** cyber insurance from ~₪700/year; professional liability for software from ~₪4,500/year.

None of these is art-specific.

### Cited Findings
**Conversion:**
- Median B2B SaaS trial to paid is about 18.5%, with the top quartile at 35–45%. — [Flint](https://www.flint.com/articles/b2b-saas-free-trial-conversion-rate-statistics); [1capture](https://www.1capture.io/blog/free-trial-conversion-benchmarks-2025)
- No card (opt-in): 8–22%, median 14%. With a card (opt-out): 35–55%, median 44%. — [growthspree 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-trial-to-paid-conversion-rate-benchmarks-2026-by-trial-type-acv-length-credit-card)
- ChartMogul via a secondary source: opt-in at 8.9%. — [baremetrics](https://baremetrics.com/blog/trial-conversion-rate-metrics-explained)
- Sales-assisted trial: median 55%. A vendor table, low weight. — [growthspree](https://www.growthspreeofficial.com/blogs/b2b-saas-trial-to-paid-conversion-rate-benchmarks-2026-by-trial-type-acv-length-credit-card)
- Demo to close: 22–30%. — [SaaS Hero 2026](https://www.saashero.net/customer-retention/b2b-saas-conversion-benchmarks-journey/)

**Sales cycle:**
- SMB under $5K ACV: about 40 days (range 30–90). — [growthspree sales cycle 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-sales-cycle-length-benchmarks-2026-by-acv-vertical)
- Other estimates: 14–30 days; or 1–4 weeks for $1–5K. — [getboomerang](https://getboomerang.ai/glossaries/b2b-sales-cycle-benchmarks-2026); [payproglobal](https://payproglobal.com/answers/what-is-saas-sales-cycle-length/)
- Blended B2B median: 84 days. — [thedigitalbloom](https://thedigitalbloom.com/learn/pipeline-performance-benchmarks-2025/)
- These figures are repeated across vendors without primary data.

**Salaries (2026, gross, full-time):**
- **Developer:**
  - Junior frontend: 16–20K (0–2 years), 19–26K (2–3 years). — [Techmonster](https://techmonster.co.il/high-tech-salaries/)
  - React junior: 20–25K; a fresh junior: 14–18K. — [Amit Tech, July 2026](https://amittech.dev/blog/2026/07/15/%D7%9B%D7%9E%D7%94-%D7%9E%D7%A8%D7%95%D7%95%D7%99%D7%97-%D7%9E%D7%AA%D7%9B%D7%A0%D7%AA-%D7%91%D7%99%D7%A9%D7%A8%D7%90%D7%9C---%D7%98%D7%91%D7%9C%D7%AA-%D7%A9%D7%9B%D7%A8-%D7%94%D7%99%D7%99%D7%98%D7%A7-2026/)
  - Junior developer: 15–20K. — [JobsSeek](https://www.jobsseek.info/d/%D7%98%D7%91%D7%9C%D7%90%D7%95%D7%AA-%D7%A9%D7%9B%D7%A8-%D7%AA%D7%95%D7%9B%D7%A0%D7%94)
  - Frontend salaries 2025. — [Nisha](https://www.nisha.co.il/%D7%A9%D7%9B%D7%A8-%D7%9E%D7%A4%D7%AA%D7%97-%D7%A4%D7%A8%D7%95%D7%A0%D7%98%D7%90%D7%A0%D7%93-2025/)
- **UI/UX designer:**
  - Junior: 12–18K; mid: 18–28K; senior: 28–40K. — [jobcalc](https://jobcalc.co.il/blog/ux-ui-designer-salary-israel/)
  - Researcher-designers earn 10–15% more. — [Nisha UX](https://www.nisha.co.il/שכר-ux/)
- **Community or social manager:** no reliable 2026 figure found. The [Drushim 2026 internet and digital table](https://www.drushim.co.il/article/110) came back garbled.
- **Ethosia / AllJobs 2026:** no figures found.

**Photography:**
- I found no Israeli price list for exhibition or artwork photography. Closest proxies:
  - Interior-design photography: ₪500–3,500 per property, typically ₪2,500 + VAT for a shooting day plus an editing day. — [Maxim Dupliy](https://www.maximdupliy.com/blog/interior-design-photography-price/)
  - Product studio: ₪2,000 for up to 4 hours including editing 15 images, ₪20 per extra image. — [vipdesign](https://vipdesign.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%95%D7%9F/)
  - Video photographer: ₪1,500–2,000 per day. — [B144](https://www.b144.co.il/%D7%90%D7%95%D7%9C%D7%A4%D7%A0%D7%99-%D7%A6%D7%99%D7%9C%D7%95%D7%9D-%D7%95%D7%A2%D7%A8%D7%99%D7%9B%D7%94/%D7%9E%D7%97%D7%99%D7%A8%D7%95%D7%9F/%D7%A6%D7%9C%D7%9D-%D7%95%D7%99%D7%93%D7%90%D7%95-%D7%9C%D7%99%D7%95%D7%9D-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9B%D7%95%D7%9C%D7%9C-%D7%9E%D7%A6%D7%9C%D7%9E%D7%94/)
  - General photographer price lists. — [Midrag](https://www.midrag.co.il/Content/SectorPriceList/96)

**Insurance:**
- Cyber insurance for a small, low-risk business from ₪700/year. — [Asia Insurance, cyber](https://asia-ins.co.il/cyber-insurance-for-businesses/)
- Professional liability for a developer or IT consultant from ₪4,500/year. — [Asia Insurance, developers](https://asia-ins.co.il/software-developers-and-computer-consultants/)
- A combined tech policy (professional liability + product liability + cyber) is available. — [Lamda Broking](https://lamdabroking.com/high-tech-insurance-for-technology-companies/); [Madanes](https://www.madanes.com/insurance/tech/); [Asia Insurance, high-tech](https://asia-ins.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%91%D7%99%D7%98%D7%95%D7%97-%D7%94%D7%99%D7%99%D7%98%D7%A7/)
- All are agency sites.

### Inferences: proposed model parameters (all estimates, built from the figures above)
| Parameter | Conservative | Base | Optimistic |
|---|---|---|---|
| Gallery pilot (free tour) → paid | 15% | 30% | 50% |
| Sales cycle, gallery | 90 days | 45 days | 21 days |
| Gallery meetings the founder holds per week | 2 | 4 | 6 |
| Artists: free → ₪29 | 2% | 4% | 7% |
| Paid tours per gallery per year (per-exhibition model) | 1.5 | 2.5 | 4 |
| Monthly churn, galleries on subscription | 5% | 4% | 3% |
| Monthly clearing fixed cost | ₪54 | ₪45 | ₪45 |
| Clearing per charge | 1.6% + ₪1.2 | 1.4% + ₪1.2 | 1.0% + ₪1.2 |
| Accountant | ₪500 (licensed dealer) | ₪400 | ₪350 |
| Insurance per year (from month 6) | ₪6,000 | ₪5,200 | ₪0 (defer) |
| Freelance photographer per exhibition, if not the founder | ₪2,500 + VAT | ₪1,800 | ₪0 (gallery photographs) |
| Part-time hire (50%) from the round | developer ₪10K | ₪9K | none |

Notes:
- The "meetings per week" figures are a pure assumption, with no source. For a solo founder who also develops, 3–5 sales meetings a week is a capacity cap.
- The artist conversion range rests on the freemium benchmarks from round one (`business_models_cases.md` §3).
- A part-time hire is 50% of the gross salaries above, plus about 25–30% employer costs (employer-cost rate not sourced in this round; check).
- **Main implication:** at ₪590 per tour, a freelance photographer at ₪1,800–2,500 wipes out the margin. The per-exhibition model works only if the gallery or artist photographs (the capture pipeline) or the founder does it himself. Photography is a service to sell at full price, not a cost to absorb (inference, consistent with round one §7).

### Gaps
- No pilot-to-paid conversion data for galleries or art SaaS specifically, and no Israeli figures.
- No source for founder-led sales capacity (meetings per week).
- Salaries for a community manager, and Ethosia/AllJobs 2026 surveys: not found. Employer costs (pension, National Insurance) were not sourced.
- Prices for artwork or exhibition photography in Israel: no direct source, only proxies. Interviews with 3–5 local photographers are needed.
- Insurance: entry prices from agencies only, no quote. Unclear whether a solo founder with no revenue needs this in year 1.
