# WordPress Fixes

**Ten problems that take small WordPress sites down, break them or slow them, each one fixed, measured and runnable with one command.**

[![All cases](https://github.com/Ardholt/wordpress-fixes/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ardholt/wordpress-fixes/actions/workflows/ci.yml)

## The cases

<!-- cases:start -->
1. **[Pages broke after an Elementor update](elementor-update-broke-pages/README.md)**  
   I brought the workshop page back and checked that its button opens the details.  
   <sub>WordPress · Elementor · Plugin conflict</sub>

2. **[There has been a critical error on this website](critical-error-after-update/README.md)**  
   I fixed the error. The calculator works.  
   <sub>WordPress · PHP fatal error · Rollback</sub>

3. **[Mobile PageSpeed in the 30s–40s](speed-mobile-score/README.md)**  
   I brought the main content into view in 1.58 seconds instead of 45.47, keeping the page and its working controls.  
   <sub>WordPress · Speed · Images</sub>

4. **[Checkout errors and a slow cart](woocommerce-checkout-slow-cart/README.md)**  
   I fixed the delivery error and cut the median basket update from 3.38 s to 0.35 s.  
   <sub>WooCommerce · Checkout · Performance</sub>

5. **[Video will not play or embed](video-embed-wont-play/README.md)**  
   I restored playback of a video hosted on WordPress.  
   <sub>WordPress · Video playback · Security headers</sub>

6. **[A theme update wiped my changes](theme-update-wiped-changes/README.md)**  
   I restored the colours and repair notice, updated the theme again, and checked that the notice link and menu still worked.  
   <sub>WordPress · Child theme · Theme update</sub>

7. **[Form entries should land in a sheet and my inbox](contact-form-to-sheet-and-email/README.md)**  
   I fixed the disappearing enquiry: the saved spreadsheet and received email contain the same name and message.  
   <sub>WordPress · Form delivery · Automation</sub>

8. **[Show data from an outside service on my site](external-api-in-wordpress/README.md)**  
   I made the rates readable, saved them between visits and kept a clear fallback when the service cannot respond.  
   <sub>WordPress · External API · Caching</sub>

9. **[Customers should book online](booking-system-setup/README.md)**  
   I completed a booking and received its matching confirmation in the local inbox.  
   <sub>WordPress · Online booking · Availability</sub>

10. **[My site was hacked](hacked-site-cleanup/README.md)**  
   I removed the unwanted changes and kept the original page and download working.  
   <sub>WordPress · Security · Cleanup</sub>
<!-- cases:end -->

## How every case is laid out

Each folder opens with the problem and a before/after picture, then what was wrong, what I did, the proof
(numbers linked to the files they come from), one command to run it yourself, and the tests that check it.

---

Maintained by Genco Doganay, Ardholt  
<sub>More of my work: [ardholt.com/p](https://ardholt.com/p/) · Licence: [MIT](LICENSE) (a plugin or theme file that states a licence in its header is under that licence) · [Third-party files](ASSET-LICENSES.md)</sub>
