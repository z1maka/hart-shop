ALTER TABLE "categories" ADD COLUMN "google_product_category" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "google_product_category" integer;--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 5462 WHERE "slug" = 'anti-dronovi-nakidki';--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 5476 WHERE "slug" = 'чохли-для-starlink';--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 7460 WHERE "slug" IN ('sholomi-bronepliti', 'navushniki-taktichni-kreplenya');--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 100 WHERE "slug" = 'ryukzaki';--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 499858 WHERE "slug" = 'noshi';--> statement-breakpoint
UPDATE "categories" SET "google_product_category" = 212 WHERE "slug" = 'taktichna-forma';--> statement-breakpoint
UPDATE "products" SET "google_product_category" = 1034 WHERE "slug" IN ('anty-teploviziynyy-tent-multi-a6286-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor', 'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor', 'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya');--> statement-breakpoint
UPDATE "products" SET "google_product_category" = 5635 WHERE "slug" = 'ryukzak-hidrator';