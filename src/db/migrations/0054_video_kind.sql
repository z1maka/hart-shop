-- Each product video says whether it is a test of the fabric or a look at
-- the product, so the buy panel can offer the tests (owner, 28.09.2026).
UPDATE "products" SET "videos" = (
  SELECT jsonb_agg(
    "video" || jsonb_build_object(
      'kind',
      CASE WHEN "video"->>'youtubeId' IN (
        'oj3HwvDkAyc', 'BkRZ4XUzE7E', 'lNs8zFpsssc', 'kDjCklzB0t8',
        '3GYxVd09tXw', '_eY1v4YdfOY', 'V5KVzt0e5g8', 'S6mevDk4s7g', 'dbip3__ZPOU'
      ) THEN 'test' ELSE 'overview' END
    )
    ORDER BY "position"
  )
  FROM jsonb_array_elements("products"."videos") WITH ORDINALITY AS "entries"("video", "position")
)
WHERE jsonb_array_length("videos") > 0;
