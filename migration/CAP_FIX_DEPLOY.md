# Pagination Cap Fix — Deploy Instructions

ERP frontend par sirf 20 products show ho rahe hain kyunki backend ka `paginate(20)` hard-coded hai. Iska fix bana diya hay — ab aap ko sirf 1 PHP file live server par upload karni hay aur ek URL hit karni hay.

## Step 1 — Upload installer to live server

Yeh file:
```
backend/public/apply-pagination-fix.php
```

Live server par yahan upload karein (cPanel File Manager / FTP / kahin se bhi):
```
public_html/erp/public/apply-pagination-fix.php
```
(actual path aap ke hosting layout par depend karta hay; jahan `run-migration.php` hay wahi folder hay)

## Step 2 — URL hit karein

Browser may yeh kholain:
```
https://erp.earntodiemodapk.com/apply-pagination-fix.php?token=carlanisa2026
```

Output kuch aisa aana chahiye:
```
=== Pagination Cap Patch ===
✅ Backup saved: ProductController.php.bak-20260515103045
✅ Patched ProductController.php — per_page param now respected (cap 500).
✅ OPcache invalidated for ProductController.php
✅ Laravel caches cleared.
🎉 Done!
```

## Step 3 — Verify

Browser may ERP products page reload karein:
```
https://erp.earntodiemodapk.com/inventory/products
```

Ab **100 products** ek saath dikhne chahiyein (20 ki bajaye). Frontend already `per_page: 100` maang raha hay — sirf backend ka cap rok raha tha.

## Step 4 — Security cleanup (zaroori)

Patch ke baad live server se yeh 2 files **delete kar dein** (security):
- `public/apply-pagination-fix.php`
- `public/ProductController.php.bak-...` (backup file)

## Agar 500 ke bajaye sare 421 chahiyein

Frontend may bhi `per_page: 500` set ho chuka hay locally. Frontend rebuild + redeploy ke baad sare 421 active products ek hi page par dikhne lagengi:

```bash
cd "/Users/waqas/ACCOUNTING SYSTEM/frontend"
npm run build
# Phir .next/ folder live server par push karein (jahan se frontend serve ho raha hai)
```
