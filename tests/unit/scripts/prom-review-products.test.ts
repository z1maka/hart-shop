import { describe, expect, it } from 'vitest'
import { catalogSlugFor, catalogSlugForText } from '../../../scripts/lib/prom-review-products'

describe('catalogSlugFor', () => {
  it.each([
    [
      'Анти-тепловізор, накидка захисна від тепловізорів та дронів Multi А6286 camouflage',
      'anty-teplovizorna-nakydka-poncho-zakhyst-vid-teplovizoriv-ta-droniv-multi-a6286-antydron-antyteplovizor',
    ],
    ['Анти-тепловизор, пончо защита от тепловизоров и дронов Multi А6286 Піксель', 'anty-teplovizornyy-zakhyst-nakydka-zakhyst-vid-teplovizoriv-multi-a6286'],
    ['Анти-тепловизорная накидка пончо  А6286 Олива', 'anty-teploviziyna-nakydka-poncho-a6286'],
    ['Анти-тепловізорний тент Multi ВТ6370, накидка від дронів', 'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor'],
    ['Анти-тепловізійний тент Multi А6285, екранований захист', 'anty-teploviziynyy-tent-multi-a6286-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor'],
    ['Анти-тепловізорна накидка із системою Молле пончо Multi А6289 khaki', 'poncho-z-posylenym-zakhystom-vid-teplovizoriv-ta-droniv-model-fx-2-iz-dodatkovymy-kriplennyamy-elementiv-maskuvannya-molle-molle-anty-teplovizor-poncho'],
    ['Чехол антитепловизор и антидрон для Старлинк (Starlink gen2 и gen3)', 'chekhol-antiteplovizor-i-antidron-dlya-starlink'],
    ['Чохол антитепловізор та антидрон для Старлінк (Starlink gen2 та gen 3)', 'chokhol-antiteplovizor-i-antidron-dlya-starlinka-starlink-gen-3'],
    ['Чохол антитепловізор та антидрон для Старлінк (Starlink MINI)', 'copy-case-anti-thermal-vision-and-anti-dr'],
    ['Чехол антитепловизор и антидрон для Старлинк (Starlink) Зимовий', 'winter-cover-anti-thermal-vision-and-anti'],
    ['Посилений чохол антитепловізор та антидрон для Старлінк (Starlink gen2, gen3, gen4)', 'polozheniya-antiteplovogo-rezhima-na-starlink-iz-sistemy-okhlazhdeniya-bud-yaka-model'],
    ['Оригінал Активні навушники  walker’s razor  USA', 'oryhinal-aktyvni-navushnyky-walkers-razor-usa'],
    ['Комплект оригінальний Активні навушники  walker’s razor  USA із поворотними кріпленнями', 'komplekt-oryhinalnyy-aktyvni-navushnyky-walkers-razor-usa-z-povorotnymy-kriplennyamy'],
    ['Активні навушники  walker’s razor оригінал USA із кріпленнями до шолома', 'aktyvni-navushnyky-walkers-razor-oryhinal-usa-iz-kriplennyamy-do-sholoma'],
    ['Поворотні кріплення для навушників на шолом каску', 'kriplennya-povorotni-na-reytsi-arc-dlya-aktyvnykh-navushnykiv'],
    ['Кріплення поворотні на шолом Олива', 'kriplennya-povorotni-na-reytsi-arc-na-sholom'],
    ['Тактичний рюкзак MiL -Tec оригінал 40 л', 'taktychnyy-ryukzak-mil-tec-40l-oryhinal-nimechchyna'],
    ['Футболка тактична Coolmax піксель койот, 52', 'futbolka-taktychna-coolmax'],
    ['Анти-тепловізійна ковдра Multi А44, екранований захист від тепловізорів', 'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya'],
    ['Баллистическая защита затылка на шлем кевларовая пиксель', 'balistychnyy-zakhyst-potylytsi-z-kevlaru-na-sholom'],
    ['Шолом 3А Sestan Busch BK-ACH-HC оригінал', 'sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-chokhol'],
    ['Посилений самоохолоджуючий чохол антитепловізор та антидрон для Старлінк  (Starlink mini)', 'посилений-самоохолоджуючий-антитепл'],
    ['Чохол антитепловізор та антидрон для антени AvengeAngel  Avenger  2.4G, 5.2G, 5.8G', 'чохол-антитепловізор-та-антидрон-для-2'],
  ])('maps «%s»', (name, slug) => {
    expect(catalogSlugFor(name)).toBe(slug)
  })

  it.each([
    ['Кавер чохол на шолом фаст Fast'],
    ['Зимова  балаклава шапка'],
    ['Тактические штаны «Гетман» комуфляжные мультикам 52'],
    ['Чохол антитепловізор і антидрон для антени Acasom Roc-6, Roc-4 Roc 6, Мультиким'],
    ['Чохол антитепловізор та антидрон для Старлінк (Starlink gen1)'],
    ['Комплект Шолом Denmark Military PGD-ARCH NIJ IIIA оригінал із активними навушниками'],
  ])('leaves «%s» without a product', (name) => {
    expect(catalogSlugFor(name)).toBeNull()
  })
})

describe('catalogSlugForText', () => {
  it('names the product from the words when the marketplace tied none', () => {
    expect(catalogSlugForText('Замовивши фудболку 50 розміру, прийшла 52')).toBe('futbolka-taktychna-coolmax-1')
    expect(catalogSlugForText('Все супер, дякую')).toBeNull()
  })
})
