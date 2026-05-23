import { Hono } from 'hono'

const versesApp = new Hono()

versesApp.get('/:translation/:bookNumber/:chapter', async (c) => {
  const { translation, bookNumber, chapter } = c.req.param()
  return c.json({
    verses: [],
    message: 'Verse data served from bundled client. Fetch from D1 coming soon.',
    translation,
    bookNumber: parseInt(bookNumber, 10),
    chapter: parseInt(chapter, 10),
  })
})

export { versesApp as versesRoutes }
