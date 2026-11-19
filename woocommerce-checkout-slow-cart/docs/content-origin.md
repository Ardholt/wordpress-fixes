# Content and checkout data

I created the shop content and the checkout inputs for these repair checks. The screenshots and recordings show the running WordPress installation; the order evidence comes from WooCommerce’s saved order records.

- **Breakfast cup** is a generic product description, not a commercial range or a product attributed to another business. Its name, price and SKU are defined in [the shop setup](../fixtures/setup.php). The storefront uses the generic category “Stoneware” without a slogan.
- **WooCommerce** identifies the software platform downloaded from wordpress.org, not a client, endorsement or business relationship. The installed version is recorded in [the run environment](../proof/run.json).
- **Checkout Verification**, **1 Validation Street**, **Validation** and **AA1 1AA** are generated checkout inputs in [the browser test](../tests/flow.mjs). They are used to exercise required fields and postcode-format validation. They do not identify a customer, delivery address or verified postal destination. The automated checks also submit an invalid postcode and email and require rejection.
- Email values are generated at runtime under the reserved `invalid.test` domain. The capture browser suppresses billing-field text before any typing, and exported order records omit personal fields, order keys and IDs. Values are still submitted to WooCommerce normally; validation is not bypassed.

I built the shop shown here to verify the repair. The recorded orders are unpaid checkout checks. No customer-site result or completed sale is claimed.
