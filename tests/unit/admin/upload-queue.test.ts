import { describe, expect, it } from 'vitest'
import { uploadInOrder } from '@/features/admin/ui/upload-queue'

const files = [{ name: 'a.png' }, { name: 'b.png' }, { name: 'c.png' }]

describe('uploadInOrder', () => {
  it('uploads files one at a time in the chosen order', async () => {
    const started: string[] = []
    let inFlight = 0
    let maxInFlight = 0

    await uploadInOrder(
      files,
      async (file) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        started.push(file.name)
        await new Promise((resolve) => setTimeout(resolve, 1))
        inFlight -= 1
        return null
      },
      () => {},
    )

    expect(started).toEqual(['a.png', 'b.png', 'c.png'])
    expect(maxInFlight).toBe(1)
  })

  it('reports progress after every file', async () => {
    const progress: number[] = []

    await uploadInOrder(
      files,
      async () => null,
      (done) => progress.push(done),
    )

    expect(progress).toEqual([1, 2, 3])
  })

  it('keeps going past a failed file and lists the failures', async () => {
    const uploaded: string[] = []

    const failures = await uploadInOrder(
      files,
      async (file) => {
        if (file.name === 'b.png') return 'Файл больше 4 МБ'
        uploaded.push(file.name)
        return null
      },
      () => {},
    )

    expect(uploaded).toEqual(['a.png', 'c.png'])
    expect(failures).toEqual([{ fileName: 'b.png', message: 'Файл больше 4 МБ' }])
  })

  it('returns no failures for an empty selection', async () => {
    expect(
      await uploadInOrder(
        [],
        async () => null,
        () => {},
      ),
    ).toEqual([])
  })
})
