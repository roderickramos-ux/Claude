# Pricing rules

All prices are computed **on the server** by `src/lib/pricing/engine.ts`, which is a pure, unit-tested function.
The client never sends prices. The breakdown is saved on each order (`orders.pricing`), so later changes to a
batch's prices never alter an order that has already been placed.

Currency is PHP. Amounts are stored as integer centavos, and discounted unit prices are rounded to the nearest whole peso.
Praxis is **non-VAT registered**, so there is no VAT line. The tax note printed on documents is configurable in Admin → Site settings.

## Order of application

For each batch (run) in the cart:

1. **Base price.** This is the batch's regular price per seat.
2. **Early-bird** (default 15%). It applies if the order is **placed** on or before the early-bird deadline (Manila time).
   The rate is locked when the order is placed, so a buyer who pays after the deadline but within the seat hold keeps it.
3. **Group rate.** It applies when the order has at least *N* seats (default 3) **for the same batch**. Seats in different batches are not combined.
4. **Stacking.** By default early-bird and group rate **do not stack**: each line gets whichever discount is larger,
   and ties go to early-bird. If *Stack early-bird and group discounts* is enabled on a batch, both apply
   multiplicatively (e.g. 18,000 × 0.85 × 0.90 = 13,770).

Then, for the whole order:

5. **Referral code (buyer discount).** This is optional and **0% by default**. When set on a code, it is a percentage off the subtotal from steps 1–4.
6. **Vouchers** *(Phase 2)*. Only one voucher is allowed per order, applied after referral discounts.
7. **Gift codes** *(Phase 2)*. These count as payment, not a discount, and are applied last.

## Referral rewards

A referrer earns a reward once a referred order is **paid**, either a fixed ₱ amount per paid seat or a percentage of the order total.
Rewards are recorded automatically in Admin → Referrals as *pending*. Staff pay them out manually and then mark them *paid*.
A reward is voided if its order is cancelled or fully refunded. Buyers cannot use a code registered to their own email.

## Examples (placeholder prices: regular ₱18,000, early-bird 15%, group 10% for 3+)

| Scenario | Unit price | Total |
|---|---|---|
| 1 seat, before the early-bird deadline | ₱15,300 | ₱15,300 |
| 1 seat, after the deadline | ₱18,000 | ₱18,000 |
| 3 seats, before the deadline (early-bird wins) | ₱15,300 | ₱45,900 |
| 3 seats, after the deadline (group rate) | ₱16,200 | ₱48,600 |
| 3 seats, after the deadline + referral code with 5% buyer discount | ₱16,200 | ₱46,170 |
