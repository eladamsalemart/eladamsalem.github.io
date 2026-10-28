# App world 2026 and technical choices for taking OPEN STUDIO from prototype to product

Research date: 2026-10-28. Method note: this cloud session could not reach the vendors' own pages directly. Fetching supabase.com, firebase.google.com, developers.cloudflare.com and posthog.com failed with a DNS/network-allowlist error. The figures below come from web-search results that quote those pages, or from third-party guides, and each is marked that way. All prices are "as seen 2026-10-28 via search". Check every price on the vendor's own page before it goes into a budget.

## 1. App economy 2026: downloads, spend, retention, subscriptions, iOS share in Israel

### Takeaway
In 2025, consumer spend in apps grew about 10–22% while downloads stayed flat or fell, depending on the tracker. The average app loses more than 70% of its users within 30 days. In Israel iOS is only about a third of mobile OS usage (Android is about two thirds), so OPEN STUDIO's "mostly iPhone" audience is a niche skew and not the national norm.

### Cited Findings
- Sensor Tower State of Mobile 2026 (released 21 Jan 2026, covers 2025): global in-app purchase revenue was $167B, up 10% YoY. For the first time on record, spend in non-game apps exceeded spend in games. The report counts about 150B installs (about +0.8% YoY) and 5.3 trillion hours in apps (+3.8%). Search summary of [Sensor Tower webinar/report](https://sensortower.com/webinar/2026-state-of-mobile); [DeepLearning.AI The Batch summary](https://www.deeplearning.ai/the-batch/state-of-mobile-2026-report-shows-ai-chatbot-search-and-assistant-growth-outpaces-gaming-social-and-more). The Batch's headline says AI chatbot/assistant apps grew faster than gaming and social.
- Appfigures has lower numbers: consumer spend of $155.8B (+21.6%) and 106.9B downloads, the fifth straight annual decline. The two trackers disagree on download volume ([search summary citing Appfigures, via The Batch](https://www.deeplearning.ai/the-batch/state-of-mobile-2026-report-shows-ai-chatbot-search-and-assistant-growth-outpaces-gaming-social-and-more)).
- RevenueCat State of Subscription Apps 2026 covers more than 115,000 apps and more than $16B in revenue. Median trial-to-paid conversion is 42.5% for trials of 17 days or more and 25.5% for trials of 4 days or less. Day-35 trial conversion is about 5x better with a hard paywall ([RevenueCat report](https://www.revenuecat.com/state-of-subscription-apps); [RevenueCat benchmarks blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)). Only the landing page and blog were seen, not the full PDF. Churn and "% reaching $X revenue milestones" figures were not retrieved.
- AppsFlyer 2025 retention benchmarks: the average app loses more than 70% of users within 30 days. On Day 1, iOS held steady while Android slipped. News, Business, Transportation and Shopping lead retention ([AppsFlyer report](https://appsflyer.com/?p=453529); [Braze summary](https://www.braze.com/resources/articles/mobile-app-retention)).
- Day-30 retention by category (AppsFlyer data via Braze/Business of Apps): News 15.3% on iOS and 9.9% on Android, Finance 6.6%/3.1%, Social 3.0%/1.6%. Photo & Video is the lowest category, at about 1%. iOS retains better than Android in most categories ([Braze](https://www.braze.com/resources/articles/mobile-app-retention)).
- Cross-industry averages for 2025–26: roughly D1 25–26%, D7 11–13%, D30 5–7%. This is a secondary roundup and its numbers vary ([Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry); [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/)).
- StatCounter, Israel mobile OS share: iOS 33.42% vs Android 66.57% in Aug 2026, iOS 30.91% in Jun 2026 and 33.07% in May 2026. Within iOS, iOS 26.5 had 66.5% of iOS usage in Jun 2026 ([StatCounter Israel mobile OS](https://gs.statcounter.com/os-market-share/mobile/israel); [StatCounter iOS versions Israel](https://gs.statcounter.com/ios-version-market-share/mobile-os/israel)).

### Inferences
- Paid apps are earning more while new installs stagnate. For a new consumer app, reaching users and keeping them is harder than building the app.
- An art/culture app is closest to the "Photo & Video / Lifestyle / Entertainment" category profile, which has low D30 retention (a few percent). Plan the D30 target around 3–8%, not 20%.
- iOS is about 33% of Israeli mobile usage. Even if early art-world users skew to iPhone, the product cannot exclude Android if it is to grow. A web-first approach (one codebase for both) fits this well.
- Because of iOS version adoption (iOS 26.x dominates), newer WebKit features such as WebGPU can be relied on for most Israeli iPhone users, with a fallback for the remaining share.

### Gaps
- Share of mobile time spent in apps vs in the browser for 2026: no reliable primary source was retrieved. Older industry figures of about 85–90% in apps exist, but they were not verified in this session.
- RevenueCat churn and revenue-milestone percentages, and Adjust 2026 benchmarks: not retrieved.
- Israel-specific app spend data: not found.

## 2. PWA vs native in 2026 (iOS capabilities, DMA, store rules, cross-platform frameworks, fees)

### Takeaway
A Home Screen web app on iOS can now do most of what OPEN STUDIO needs: push (since 16.4), badges, WebGPU (iOS 26), and generous storage quotas. A bare web-view wrapper in the App Store risks rejection under guideline 4.2. The sensible path is to keep the PWA and later add a Capacitor shell with real native value if store presence is needed.

### Cited Findings
- Web Push arrived for Home Screen web apps in iOS/iPadOS 16.4. Permission can only be requested from a direct user gesture, and a plain Safari tab cannot ask ([WebKit: Web Push for Web Apps on iOS](https://webkit.org/?p=13878); [9to5Mac](https://9to5mac.com/2023/02/16/iphone-web-app-new-features-ios-16-4/)).
- The Badging API (`navigator.setAppBadge`) works since iOS 16.4, but only in Home Screen web apps, not in Safari or WKWebView ([WebKit: Badging](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/)).
- iOS 26 / Safari 26: every site added to the Home Screen opens as a web app by default. WebGPU ships on by default on iOS/iPadOS 26, and Apple calls it the preferred choice over WebGL for new sites. Safari 26 also adds HDR images in canvas and the Digital Credentials API ([AppDeveloperMagazine](https://appdevelopermagazine.com/webgpu-in-ios-26/); [Gigazine on WebKit 26](https://gigazine.net/gsc_news/en/20250623-safari-26-webkit-beta)).
- WebKit storage policy (Safari 17+): browser apps get up to 60% of disk per origin and 80% overall. A Home Screen web app gets the same quotas as in the browser. Eviction can happen when the overall quota is exceeded, under system storage pressure, or after a site goes unused for a while. Writes past the quota throw QuotaExceededError ([WebKit: Updates to Storage Policy](https://webkit.org/?p=14403)).
- EU DMA: Apple removed Home Screen web apps for EU users in the iOS 17.4 betas, then reversed course. They continue as before, always powered by WebKit ([9to5Mac](https://9to5mac.com/2024/03/01/apple-home-screen-web-apps-ios-17-eu/); [Engadget](https://www.engadget.com/apple-backtracks-on-plans-to-get-rid-of-web-apps-on-iphones-in-the-eu-195232177.html)). One third-party guide says EU web apps still lacked push after 17.4 ([MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)). This was not verified against Apple's docs. It does not affect Israel.
- App Store guideline 4.2 (Minimum Functionality) is the main reason web-wrapper apps get rejected. An App Review reply on Apple's forums said "merely adding a web view that goes to an existing web page is not good enough". Rejections say push, location or sharing alone are not "robust enough" ([Apple Developer Forums thread 806726](https://developer.apple.com/forums/thread/806726); [MobiLoud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)).
- Guideline 4.8 (Login Services): apps using third-party social login must also offer an equivalent privacy-focused option such as Sign in with Apple. The guideline text itself was not retrieved in this session, only its existence and its 2020 revision ([Apple forum](https://developer.apple.com/forums/thread/122755)).
- Frameworks: Capacitor is positioned for wrapping an existing web app and reuses the existing HTML/CSS/JS. Expo is the default for new React Native apps. Flutter is a Dart rewrite of the UI. In 2026 performance is "fast enough" in all three, and the real differences are skills and deployment ([PkgPulse 2026](https://www.pkgpulse.com/guides/react-native-vs-expo-vs-capacitor-cross-platform-mobile-2026); [SoftTeco](https://softteco.com/blog/react-native-vs-flutter)). Some sources are vendor-biased.
- Fees: Apple Developer Program costs $99/yr and Google Play $25 once. Apple's Small Business Program charges 15% if proceeds were ≤ $1M in the prior year (reapply yearly). Google charges 15% on the first $1M per year. The standard rate is 30%, or 15% for subscriptions after year 1. One source says Google's rate has varied by buyer location and new-install status since 30 Jun 2026 (unverified) ([SplitMetrics](https://splitmetrics.com/blog/google-play-apple-app-store-fees/); [Appbot](https://appbot.co/blog/app-developers-apple-google-small-business-programs/)). These are third-party sources, not Apple/Google pages.

### Inferences
- For OPEN STUDIO (vanilla JS, three.js), Capacitor is the only path that keeps the code. React Native/Expo or Flutter would mean a rewrite and would still have to embed a WebView for the three.js viewer.
- To pass 4.2, a store build should add native value: a native camera/upload flow, native push, offline-saved tours, share sheet, haptics. If any social login is offered, Sign in with Apple is effectively required.
- An important iOS limitation: push only works after the user adds the app to the Home Screen. Install education ("Add to Home Screen") becomes a product funnel step.
- Storage eviction means a 100–250MB tour cache can be deleted. Treat offline tours as a cache, never as the only copy.

### Gaps
- Exact current wording of guidelines 4.2 and 4.8 (not fetched; developer.apple.com was not reached directly).
- Background sync/background fetch on iOS PWAs: not confirmed in this session (historically unsupported).
- Google Play's 2026 fee changes are not verified.

## 3. Backend choices for small teams (Supabase, Firebase, Cloudflare, Pocketbase/Convex, media CDN, auth)

### Takeaway
For a large-media app, egress dominates cost. Cloudflare R2 has zero egress fees ($0.015/GB-month), so it is the natural home for 100–250MB tours and photos. Supabase Pro ($25/mo, 100K MAU included) gives Postgres, auth and row-level security. Firebase is generous on auth but now requires the paid Blaze plan for Storage.

### Cited Findings
- Supabase Pro costs $25/month per org plus usage. It includes 100,000 auth MAU, 8GB DB, 100GB file storage and 250GB egress, plus a $10 compute credit (one Micro instance). Overage: $0.00325/MAU, $0.09/GB egress, $0.125/GB DB, $0.021/GB file storage. A spend cap is on by default. PITR costs $100/mo per 7-day window ([JetAdmin, July 2026 snapshot](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/); [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing)). Secondary sources; supabase.com/pricing could not be reached. The free plan's details (projects pause after inactivity, 50K MAU, 1GB storage) were not confirmed in this session.
- Firebase: most Authentication methods are free on any plan, and email/social auth is free to 50K MAU. Phone/SMS auth is paid. Firestore's free quota is 50K reads/day, 20K writes/day and 1GiB stored. Cloud Storage for Firebase requires the Blaze (pay-as-you-go) plan, with existing default buckets affected from 3 Feb 2026 ([Firebase pricing plans doc, firebase.google.cn mirror](https://firebase.google.cn/docs/projects/billing/firebase-pricing-plans?hl=en); [SuperTokens](https://supertokens.com/blog/firebase-pricing); [Verdent guide](https://www.verdent.ai/guides/devtools/firebase-pricing)). Older guides give different auth limits.
- Cloudflare R2: $0.015/GB-month and no egress charges. Class A operations cost $4.50/M and Class B $0.36/M. The free tier gives 10GB-month, 1M Class A and 10M Class B per month. Infrequent Access costs $0.01/GB plus $0.01/GB retrieval ([Cloudflare R2 pricing docs](https://developers.cloudflare.com/r2/pricing)), as quoted by search.
- Cloudflare Stream: $5 per 1,000 minutes stored (prepaid) and $1 per 1,000 minutes delivered. Encoding and ingress are free, and bandwidth is included. No free tier was found ([Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing)).

### Inferences
Illustrative arithmetic only, built from the prices above:
- Tours on R2: 20 tours × 200MB = 4GB, which fits inside R2's free 10GB. Even 500 tours (100GB) cost about $1.5/mo in storage. Delivering a 200MB tour 10,000 times (2TB) costs $0 in R2 egress, plus Class B reads (pennies at this scale). On Supabase Storage the same 2TB would be about (2,000 − 250) × $0.09 ≈ $157/mo in egress.
- Accounts: Supabase Pro covers 1K and 10K MAU at $25/mo and 100K MAU also at about $25 plus compute. Firebase Auth (non-phone) is $0 up to 50K MAU.
- Suggested split for a solo founder: Supabase (Postgres + Auth + RLS) for data and accounts, Cloudflare R2 (+ CDN) for tours and uploads, and Cloudflare Stream only if artist video becomes core. Alternatively, the all-Cloudflare route (Workers + D1 + R2) is cheapest but means building auth yourself.
- Auth: magic link/email OTP plus passkeys suits non-technical art audiences. If Google login is offered in an iOS store build, add Sign in with Apple (see §2).

### Gaps
- Pocketbase and Convex pricing, Mux and Bunny Stream/Optimizer prices, and Cloudflare Images prices: not retrieved (no budget left / network blocked).
- Firebase Identity Platform pricing above 50K MAU: not found.
- Supabase free-tier specifics need confirming on supabase.com/pricing.

## 4. Analytics, crash reporting, feature flags

### Takeaway
PostHog's free tier (about 1M events, 5K session replays, 1M flag requests and 100K error events per month) can cover product analytics, flags and error tracking in one tool for an early product. Sentry's free plan is tight (1 user, 5K errors).

### Cited Findings
- PostHog free tier: about 1M analytics events/mo, 5,000 session replays, 1M feature-flag requests and 100K error events, with 1-year retention and no card required ([AgentDeals PostHog](https://agentdeals.dev/vendor/posthog); [AgentDeals comparison 2026](https://agentdeals.dev/analytics-free-tier-comparison-2026)). These are secondary; posthog.com was not reachable.
- Sentry free (Developer) plan: 1 user, 5K errors/mo and 50 replays, per PostHog's comparison. That is a competitor source and not confirmed on Sentry's own page ([PostHog vs Sentry](https://posthog.com/blog/posthog-vs-sentry.md)).
- Mixpanel and Amplitude free tiers: sources conflict. Mixpanel is quoted as 1M events/mo or as "100K MTU" (the latter on Amplitude's own competitor page). Amplitude is quoted as 10K MTU, and elsewhere as having "the largest event allowance" ([ToolPick](https://www.toolpick.dev/blog/mixpanel-alternatives-for-startups-2026); [Amplitude compare page](https://amplitude.com/compare/posthog-vs-mixpanel)).

### Inferences
- For a one-person team, one tool (PostHog: analytics, flags, replays, errors) means less integration and less for the AI agent to keep in sync. Sentry is still the specialist choice for native crash symbolication if a Capacitor build ships.
- Session replay of a WebGL canvas is of limited value. Custom events (tour opened, time in tour, works viewed, load failure) matter more.
- Privacy: Israeli users and any EU visitors call for cookie-less or consented analytics. PostHog can be configured that way, though this was not verified in this session.

### Gaps
- Privacy-first options (Plausible, Umami, Simple Analytics) pricing: not retrieved.
- Current Sentry pricing page: not reached.

## 5. AI-assisted development in 2026: what is achievable, and risks

### Takeaway
Coding agents let one non-programmer ship real software, but AI-generated code carries a high rate of security flaws. The best-known failure in this stack is Supabase tables with no row-level security. Automated checks and tests are essential, not optional.

### Cited Findings
- Veracode 2025 GenAI Code Security Report (30 Jul 2025) ran 80 tasks across more than 100 LLMs. Generated code introduced vulnerabilities in 45% of cases. JavaScript failed 38–45% of the time, and XSS (CWE-80) and log injection were left unsecured in 86% and 88% of cases. Security did not improve as syntax quality improved ([Veracode press release](https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/); [Help Net Security](https://www.helpnetsecurity.com/2025/08/07/create-ai-code-security-risks/)).
- CVE-2025-48757 (Lovable, disputed by the vendor) is rated CVSS 9.3. Generated apps had insufficient Supabase RLS, so anyone holding the public anon key could read or write tables. A scan found 170 of 1,645 showcase apps (about 10%) exposed ([Tenable CVE](https://www.tenable.com/cve/CVE-2025-48757); [Superblocks](https://www.superblocks.com/blog/lovable-rls-breach)).
- A separate Lovable platform bug (3 Feb–20 Apr 2026) let anyone with a link read public projects' chat history and source code ([Pluto Security](https://blog.pluto.security/p/cve-202548757-what-happened-why-it-b22)).

### Inferences
- OPEN STUDIO already follows a good practice: an automated server-side inspection that gates publishing. The same pattern should cover the backend, with RLS policy tests, a check that "an anon key cannot read other users' rows", and dependency/secret scanning in CI.
- Keep secrets (service keys) out of the static client entirely. Only the anon key plus RLS goes in the PWA, and privileged work runs in server functions or GitHub Actions.

### Gaps
- Real solo-founder case studies with metrics (revenue, team size) built with coding agents in 2026: not researched due to budget.
- Studies on long-term maintainability of AI-written codebases: not found.

## 6. Security basics (MASVS/ASVS, RLS, uploads)

### Takeaway
For this app the highest-value controls are: RLS on every table, server-side validation of uploads (type, size, re-encoding), no secrets in the client, and least-privilege storage URLs.

### Cited Findings
- Supabase docs recommend enabling RLS and writing policies so client keys cannot read or write data they shouldn't. Missing RLS is the cause of the Lovable exposures ([Superblocks](https://superblocks.com/blog/lovable-vulnerabilities)).
- XSS is the vulnerability AI most often fails to prevent (86%) ([Veracode](https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/)). This is relevant because user-generated captions and bios will be rendered.

### Inferences
- Upload pipeline: issue a signed, short-lived upload URL (R2/Supabase), enforce size/MIME limits, re-encode images and video server-side (which strips EXIF GPS, a privacy issue for artists' studios), then publish.
- MASVS/ASVS checklist items to adopt: authentication/session, data storage, network (TLS only), and input validation. These come from general knowledge, not retrieved in this session.

### Gaps
- OWASP MASVS v2 / ASVS 5.0 item lists were not fetched. Upload malware-scanning service options and prices were not retrieved.

## 7. Performance of heavy 3D web content on iPhone

### Takeaway
iOS Safari kills WebGL pages under memory pressure well before physical RAM runs out, and there is no published per-tab limit. GPU-compressed textures (KTX2/Basis), smaller textures, progressive loading and handling context loss are the standard defences. WebGPU is now available on iOS 26 as a future path.

### Cited Findings
- A WebKit bug (2025) reports heavy-texture WebGL pages being terminated by iOS memory pressure and auto-reloaded in a loop. A commenter says Safari caps memory below physical RAM. This is anecdotal, not an Apple spec ([WebKit Bugzilla 289601](https://bugs.webkit.org/show_bug.cgi?id=289601)).
- Another WebKit bug: context-loss crash switching between three.js pages, with memory rising from about 180MB to 338MB ([WebKit Bugzilla 300782](https://bugs.webkit.org/show_bug.cgi?id=300782)).
- three.js forum: "even a few 4K textures may be too much" on mobile. PNG/JPEG don't reduce GPU memory, KTX2/Basis does. KTX2 reduced but did not eliminate crashes on older iPhones. KTX2Loader supports Basis ETC1S/UASTC ([three.js forum](https://discourse.threejs.org/t/textures-in-gltf-sometimes-display-black-but-only-on-ios/30520); [three.js forum crash thread](https://discourse.threejs.org/t/safari-any-web-browser-crash-on-iphone-when-use-webgl/81629)).
- WebGPU is on by default in iOS 26, including compute shaders ([AppDeveloperMagazine](https://appdevelopermagazine.com/webgpu-in-ios-26/)).

### Inferences
- A 100–250MB tour must not be decoded into GPU memory all at once. Stream per room or per view, cap texture size at about 2K on phones, convert to KTX2 (ETC1S for walls/floor, UASTC for artworks), dispose of off-screen assets, and listen for `webglcontextlost`.
- Keep WebGL as the baseline (iOS 18 and older remain about a third of iOS users in Israel). Adding WebGPU is optional.
- The project's existing phone inspection pass (390×844, `INSPECT_BLOCK`) is the right way to catch these regressions.

### Gaps
- Official numeric memory ceiling for Safari on iPhone 15/16/17: not published by Apple. Only community measurements exist.
- Benchmarks of Gaussian-splat or image-based-rendering viewers on iOS 26: not researched.
