import { describe, expect, it } from 'vitest'
import { parseTestimonialsPage, promReviewSourceId } from '../../../scripts/lib/prom-reviews'

const PAGE = `
<ul class="b-comments__list">
<li class="b-comments__item">
  <strong class="b-comments__author-name" data-qaid="author_name">Анна Т.</strong>
  <time class="b-comments__date" datetime="2025-01-09T09:45:41" data-qaid="review_date">09.01.2025</time>
  <span class="b-deal-confirm" data-qaid="deal_confirmation">Угода на маркетплейсі Prom.ua</span>
  <div class="b-comments__rating b-rating"><span class="b-rating__state" title="Рейтинг 5 з 5">Відмінно</span></div>
  <div class="b-comments__answer" data-bazooka="CompanyReviewsProducts" data-reviews-products="[{&#34;id&#34;: 1, &#34;name&#34;: &#34;Кріплення &amp; навушники&#34;, &#34;url&#34;: &#34;/p1.html&#34;}]"></div>
  <p class="b-comments__text" data-qaid="review_text">Замовляв <b>двічі</b>, обидва рази швидко &amp; без питань.</p>
  <ul class="b-comments-tags"><li class="b-comments-tags__item" data-tag-title="Швидко відправили" data-tag-emoji="rocket"></li><li class="b-comments-tags__item" data-tag-title="Швидко зв&#39;язались" data-tag-emoji="phone"></li></ul>
</li>
<li class="b-comments__item">
  <strong class="b-comments__author-name" data-qaid="author_name">Ігор К.</strong>
  <time class="b-comments__date" datetime="2025-02-05T14:44:15" data-qaid="review_date">05.02.2025</time>
  <div class="b-comments__rating b-rating"><span class="b-rating__state" title="Рейтинг 4 з 5">Добре</span></div>
</li>
</ul>`

describe('parseTestimonialsPage', () => {
  it('keeps the whole text, inline tags stripped and entities decoded', () => {
    const [first] = parseTestimonialsPage(PAGE)

    expect(first?.text).toBe('Замовляв двічі, обидва рази швидко & без питань.')
    expect(first?.rating).toBe(5)
    expect(first?.isDealConfirmed).toBe(true)
    expect(first?.products).toEqual([{ id: 1, name: 'Кріплення & навушники' }])
    expect(first?.tags).toEqual(['Швидко відправили', "Швидко зв'язались"])
  })

  it('reads a rating-only review as empty text without products', () => {
    const [, second] = parseTestimonialsPage(PAGE)

    expect(second?.author).toBe('Ігор К.')
    expect(second?.text).toBe('')
    expect(second?.rating).toBe(4)
    expect(second?.products).toEqual([])
    expect(second?.tags).toEqual([])
    expect(second?.isDealConfirmed).toBe(false)
  })

  it('reads the moment on Kyiv time, winter and summer alike', () => {
    const [first] = parseTestimonialsPage(PAGE)
    const [summer] = parseTestimonialsPage(
      PAGE.replace('2025-01-09T09:45:41', '2025-07-09T09:45:41'),
    )

    // 09:45 in Kyiv is 07:45 UTC in January and 06:45 UTC in July.
    expect(first?.writtenAt.toISOString()).toBe('2025-01-09T07:45:41.000Z')
    expect(summer?.writtenAt.toISOString()).toBe('2025-07-09T06:45:41.000Z')
  })

  it('identifies a review by its moment and signature', () => {
    const [first] = parseTestimonialsPage(PAGE)

    expect(first && promReviewSourceId(first)).toBe('2025-01-09T07:45:41.000Z|Анна Т.')
  })
})
