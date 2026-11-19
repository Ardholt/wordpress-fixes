# Checkout errors and a slow cart

<p align="center">
  <img src="media/hero.png" width="600" alt="Before: delivery is rejected and the basket waits. After: checkout confirms the saved order and the basket responds faster.">
</p>

**I fixed the delivery error and cut the median basket update from @BEFORE_CART@ to @AFTER_CART@.**

I built the shop shown here and checked its saved orders without taking payment. The confirmation above is the result of submitting checkout, with the product, quantity, delivery charge and total preserved.

<sub>Case 04 of 10 in [WordPress fixes](../README.md)</sub>

## What was wrong

- Changing the quantity left the basket waiting.
- Checkout rejected a supported UK delivery address.
- The delivery code repeatedly requested the same information, then read the wrong field in the reply.

## What I did

- I traced the basket delay and checkout message to the delivery code.
- I corrected the field it read and reused valid delivery information for five minutes.
- I kept delivery restrictions and checkout validation active.
- I checked the receipt against the saved order: two cups, £48 merchandise, £4.50 delivery and £52.50 total.

## Proof

**Checkout now reaches this confirmation:**

<p align="center"><img src="proof/after-focus.png" width="600" alt="The actual checkout confirmation says the order has been received and shows the £52.50 total with a local payment method."></p>

[Watch the successful checkout](proof/after-checkout.mp4) · [Watch the original delivery error](proof/before-checkout.mp4) · [Read the saved orders](proof/after-orders.json).

I checked the flow five times before and five times after the repair. All five repaired submissions saved the correct order. Billing details are hidden in the recordings. Invalid email and postcode entries were rejected without creating another order.

| Measure | Before | After |
|---|---|---|
| Basket update, median | [@BEFORE_CART@](proof/before-timings.json) | [@AFTER_CART@](proof/after-timings.json) |
| Basket range (s) | [@BEFORE_CART_RANGE@](proof/summary.json) | [@AFTER_CART_RANGE@](proof/summary.json) |
| Checkout response, median | [@BEFORE_CHECKOUT@](proof/before-timings.json) | [@AFTER_CHECKOUT@](proof/after-timings.json) |
| Checkout range (s) | [@BEFORE_CHECKOUT_RANGE@](proof/summary.json) | [@AFTER_CHECKOUT_RANGE@](proof/summary.json) |
| Saved checkout checks | [0](proof/before-orders.json) | [5](proof/after-orders.json) |

These timings measure this repair under the [recorded conditions](docs/reproduction.md#measurement-and-behavioral-checks): the same basket and browser settings, with the same delivery-service delay. Your shop’s timings will depend on its own cause and hosting. I would trace the slow request and checkout error there, then check the resulting saved order before calling the repair complete.

**Files:** [before screenshot](proof/before.png) · [after screenshot](proof/after.png) · [before animation](media/before-checkout.gif) · [after animation](media/after-checkout.gif) · [full run log](proof/run-output.txt) · [claim sources](proof/claims.json).

**Repair:** [original code](source/delivery-before.php) · [fixed code](fix/delivery-after.php) · [patch](fix/delivery.patch). [Content and checkout-data origins](docs/content-origin.md) explain the shop content and generated inputs.

## Try it yourself

You can watch the checkout using the recording links above without installing anything.

For a developer who wants to repeat every check, run this from the case folder with Docker installed:

```bash
./run.sh
```

The command rebuilds the shop, reproduces the error, applies the repair and checks the saved orders. It writes fresh evidence into `proof/` and `media/`, then removes the shop. The [technical guide](docs/reproduction.md) also explains how to browse each state locally.

The [Playground blueprint](blueprint.json) is available for inspection; a complete checkout has not been verified there. [The browser observation](proof/demo.json) records that limitation.

## How it is tested

[![Tests](https://github.com/Ardholt/wordpress-fixes/actions/workflows/woocommerce-checkout-slow-cart.yml/badge.svg)](https://github.com/Ardholt/wordpress-fixes/actions/workflows/woocommerce-checkout-slow-cart.yml)

- I require the original checkout and basket checks to fail, then the same checks to pass after the repair.
- I verify the receipt and the saved product, quantity, shipping, total and on-hold order status using WooCommerce’s local cheque method.
- I check invalid input, cache expiry, service timeouts and malformed replies.

The [GitHub workflow](https://github.com/Ardholt/wordpress-fixes/actions/workflows/woocommerce-checkout-slow-cart.yml) runs these checks and retains their output. Its definition is [in the repository](https://github.com/Ardholt/wordpress-fixes/blob/main/.github/workflows/woocommerce-checkout-slow-cart.yml).

---

Fixed price for this kind of job: **£{n}**, see [ardholt.com/p/prices](https://ardholt.com/p/prices/).

<sub>Maintained by Genco Doganay, Ardholt · [All 10 cases](../README.md) · [Licence](../LICENSE)</sub>
