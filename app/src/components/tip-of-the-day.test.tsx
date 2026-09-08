// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { dailyTip } from '../data/memorization-tips'
import { TipOfTheDay } from './tip-of-the-day'

describe('TipOfTheDay', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders today’s tip text', () => {
    const { container } = render(<TipOfTheDay />)
    expect(container.textContent).toContain('Dica:')
    expect(container.textContent).toContain(dailyTip().text)
  })

  it('links to the full tips page', () => {
    render(<TipOfTheDay />)
    const link = screen.getByRole('link', { name: 'Ver todas' })
    expect(link.getAttribute('href')).toBe('/dicas')
  })
})
