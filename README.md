# WordPress Fixes

**Ten problems that take small WordPress sites down, break them or slow them, each one fixed, measured and runnable with one command.**

## The cases

<!-- cases:start -->
1. **[Pages broke after an Elementor update](elementor-update-broke-pages/README.md)**  
   I restored the page and button, with 0 changed pixels against the original.  
   <sub>WordPress · Elementor · Plugin conflict</sub>

2. **[There has been a critical error on this website](critical-error-after-update/README.md)**  
   Plugin update took the estimate page down (HTTP 500); restored by rollback, then fixed with the calculator kept  
   <sub>WordPress · PHP fatal error · Rollback</sub>

3. **[Mobile PageSpeed in the 30s–40s](speed-mobile-score/README.md)**  
   Median local mobile Lighthouse score 45 → 99, LCP 45.57 s → 1.62 s, content kept  
   <sub>WordPress · Speed · Images</sub>

4. **[Checkout errors and a slow cart](woocommerce-checkout-slow-cart/README.md)**  
   Checkout accepted; median cart update 3.05 s → 0.26 s across five runs per state; five orders saved correctly  
   <sub>WooCommerce · Checkout · Performance</sub>

5. **[Video will not play or embed](video-embed-wont-play/README.md)**  
   I restored an 8-second video: playback, seeking and completion verified, with other security rules unchanged.  
   <sub>WordPress · Video playback · Security headers</sub>

6. **[A theme update wiped my changes](theme-update-wiped-changes/README.md)**  
   Lost styling and notice rescued into a child theme; both survived the next parent-theme update  
   <sub>WordPress · Child theme · Theme update</sub>

7. **[Form entries should land in a sheet and my inbox](contact-form-to-sheet-and-email/README.md)**  
   I confirmed one matching SQLite row and one received Mailpit message, with interrupted deliveries saved for replay.  
   <sub>WordPress · Form delivery · Automation</sub>

8. **[Show data from an outside service on my site](external-api-in-wordpress/README.md)**  
   Raw provider data replaced with 2 readable rates, an hourly cache and a useful outage message  
   <sub>WordPress · External API · Caching</sub>

9. **[Customers should book online](booking-system-setup/README.md)**  
   I restored online booking and kept each slot to one appointment across nine simultaneous-request tests, with matching confirmation mail.  
   <sub>WordPress · Online booking · Availability</sub>

10. **[My site was hacked](hacked-site-cleanup/README.md)**  
   6 planted indicators found and removed, approved content kept, hardening tested, repeat scan clean  
   <sub>WordPress · Security · Cleanup</sub>
<!-- cases:end -->

## How every case is laid out

Each folder opens with the problem and a before/after picture, then what was wrong, what I did, the proof
(numbers linked to the files they come from), one command to run it yourself, and the tests that check it.

---

Maintained by Genco Doganay, Ardholt  
<sub>More of my work: [ardholt.com/p](https://ardholt.com/p/) · Licence: [MIT](LICENSE) (WordPress plugin and theme code inside the cases is GPL-2.0-or-later, as its file headers say) · [Third-party files](ASSET-LICENSES.md)</sub>
