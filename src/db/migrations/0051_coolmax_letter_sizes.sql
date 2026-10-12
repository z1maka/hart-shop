-- The Coolmax t-shirts were imported with the helmets' size labels, which
-- name a head girth («S (52-56 cм)»). They are sewn to the standard men's
-- grid: keep the letter, drop the girth.
UPDATE "product_variants" SET "options" = jsonb_set("options", '{Size}', to_jsonb(split_part("options"->>'Size', ' ', 1)))
WHERE "options" ? 'Size'
  AND "product_id" IN (SELECT "id" FROM "products" WHERE "slug" IN ('futbolka-taktychna-coolmax', 'futbolka-taktychna-coolmax-1'));
