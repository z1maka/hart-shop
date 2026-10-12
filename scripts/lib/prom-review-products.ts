// Which catalogue product a Prom.ua listing is. The marketplace names were
// written over years in two languages and with size and colour suffixes, so
// the match is by the model codes and words that survived the rename, in
// order of specificity. Anything the catalogue no longer carries (helmet
// covers, balaclavas, trousers) stays unmatched and is left behind.

type Rule = readonly [RegExp, string]

const MULTI_1 =
  'anty-teplovizorna-nakydka-poncho-zakhyst-vid-teplovizoriv-ta-droniv-multi-a6286-antydron-antyteplovizor'
const PIXEL_1 = 'anty-teplovizornyy-zakhyst-nakydka-zakhyst-vid-teplovizoriv-multi-a6286'
const OLIV_B87 = 'anty-teploviziyna-nakydka-poncho-a6286'
const FX_2_MOLLE =
  'poncho-z-posylenym-zakhystom-vid-teplovizoriv-ta-droniv-model-fx-2-iz-dodatkovymy-kriplennyamy-elementiv-maskuvannya-molle-molle-anty-teplovizor-poncho'
const MULTI_3_PONCHO = 'plashch-nakidka-poncho-s-trekhsharovoy-tkanyu-antiteploviziyniy-zakhist'
const MULTI_3_TENT =
  'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor'
const PRO_1_TENT =
  'anty-teploviziynyy-tent-multi-a6286-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor'
const STARLINK_MINI = 'copy-case-anti-thermal-vision-and-anti-dr'
const STARLINK_WINTER = 'winter-cover-anti-thermal-vision-and-anti'
const STARLINK_REINFORCED = 'polozheniya-antiteplovogo-rezhima-na-starlink-iz-sistemy-okhlazhdeniya-bud-yaka-model'
const STARLINK_GEN_3 = 'chokhol-antiteplovizor-i-antidron-dlya-starlinka-starlink-gen-3'
const STARLINK_GEN_2 = 'chekhol-antiteplovizor-i-antidron-dlya-starlink'
const WALKERS_TACTI_GRIP = 'oryhinal-usa-aktyvni-navushnyky-walkers-razor-tacti-grip-electronic-muff'
const WALKERS_KIT = 'komplekt-oryhinalnyy-aktyvni-navushnyky-walkers-razor-usa-z-povorotnymy-kriplennyamy'
const WALKERS_WITH_MOUNTS = 'aktyvni-navushnyky-walkers-razor-oryhinal-usa-iz-kriplennyamy-do-sholoma'
const WALKERS = 'oryhinal-aktyvni-navushnyky-walkers-razor-usa'
const MOUNTS_FOR_MUFFS = 'kriplennya-povorotni-na-reytsi-arc-dlya-aktyvnykh-navushnykiv'
const MOUNTS_ON_HELMET = 'kriplennya-povorotni-na-reytsi-arc-na-sholom'
const MIL_TEC_40 = 'taktychnyy-ryukzak-mil-tec-40l-oryhinal-nimechchyna'
const COOLMAX_PIXEL = 'futbolka-taktychna-coolmax'
const COOLMAX = 'futbolka-taktychna-coolmax-1'
const BLANKET =
  'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya'
const NECK_GUARD = 'balistychnyy-zakhyst-potylytsi-z-kevlaru-na-sholom'
const SESTAN_BUSCH_HELMET = 'sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-chokhol'
const AVENGER_COVER = 'чохол-антитепловізор-та-антидрон-для-2'
const STARLINK_SELF_COOLING = 'посилений-самоохолоджуючий-антитепл'

// Listings the catalogue never carried or carries under a different antenna:
// checked before the Starlink rule, which would otherwise claim them.
const SKIP_PATTERN = /acasom|roc-?\d|gen ?1\b|denmark|pgd-arch|кавер|балаклав|штан|сітк|сетк|сидушк|термобіл|підсумок|пояс|майка|поло|фонарик|костюм|убакс|рукоятк|р0930|oli ?а66/i

const RULES: readonly Rule[] = [
  [/ковдра/i, BLANKET],
  [/потилиц|затылк/i, NECK_GUARD],
  [/sestan/i, SESTAN_BUSCH_HELMET],
  [/avenge/i, AVENGER_COVER],
  [/самоохолодж/i, STARLINK_SELF_COOLING],
  [/molle|молле|[аa] ?6289/i, FX_2_MOLLE],
  [/тришаров|трьохшаров|трехслойн/i, MULTI_3_PONCHO],
  [/(вт|bt) ?6370/i, MULTI_3_TENT],
  [/[аa] ?6285/i, PRO_1_TENT],
  [/[аa] ?6286.*(піксель|пиксель)|(піксель|пиксель).*[аa] ?6286/i, PIXEL_1],
  [/[аa] ?6286.*олива|олива.*[аa] ?6286/i, OLIV_B87],
  [/[аa] ?628\d/i, MULTI_1],
  [/(starlink|старлінк|старлинк).*mini|mini.*(starlink|старлінк|старлинк)/i, STARLINK_MINI],
  [/зимов.*(starlink|старлінк|старлинк)|(starlink|старлінк|старлинк).*зимов/i, STARLINK_WINTER],
  [/посилен.*(starlink|старлінк|старлинк)/i, STARLINK_REINFORCED],
  [/^чохол.*(starlink|старлінк)/i, STARLINK_GEN_3],
  [/(starlink|старлінк|старлинк)/i, STARLINK_GEN_2],
  [/tacti-?grip/i, WALKERS_TACTI_GRIP],
  [/комплект.*walker/i, WALKERS_KIT],
  [/walker.*кріпленн/i, WALKERS_WITH_MOUNTS],
  [/walker/i, WALKERS],
  [/(кріплення|крепления).*(навушник|наушник)|(навушник|наушник).*(кріплення|крепления)/i, MOUNTS_FOR_MUFFS],
  [/поворотн.*(кріплення|крепления)|(кріплення|крепления).*поворотн/i, MOUNTS_ON_HELMET],
  [/mil ?-? ?tec.*40|40 ?л.*mil ?-? ?tec/i, MIL_TEC_40],
  [/футболка.*coolmax.*(піксель|пиксель)/i, COOLMAX_PIXEL],
  [/футболка\s+тактич/i, COOLMAX],
]

export function catalogSlugFor(promProductName: string): string | null {
  const name = promProductName.replace(/\s+/g, ' ').trim()
  if (SKIP_PATTERN.test(name)) return null

  const rule = RULES.find(([pattern]) => pattern.test(name))
  return rule ? rule[1] : null
}

// For a review the marketplace tied to no listing: the words themselves
// name the product often enough (a t-shirt sent in the wrong size).
const TEXT_RULES: readonly Rule[] = [
  [/фу[тд]болк/i, COOLMAX],
  [/starlink|старл[іи]нк/i, STARLINK_GEN_2],
  [/навушник|наушник/i, WALKERS],
  [/рюкзак/i, MIL_TEC_40],
  [/пончо|накидк/i, MULTI_1],
]

export function catalogSlugForText(reviewText: string): string | null {
  const rule = TEXT_RULES.find(([pattern]) => pattern.test(reviewText))
  return rule ? rule[1] : null
}
