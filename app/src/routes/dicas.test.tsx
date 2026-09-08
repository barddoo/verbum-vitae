// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TIP_GROUPS } from '../data/memorization-tips'
import { DicasPage } from './dicas'

describe('DicasPage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the title and intro', () => {
    render(<DicasPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Dicas de memorização' })).toBeTruthy()
    expect(screen.getByText(/Pequenos hábitos fazem mais diferença/)).toBeTruthy()
  })

  it('renders one group per section', () => {
    const { container } = render(<DicasPage />)
    const groups = container.querySelectorAll('.dicas-group')
    expect(groups.length).toBe(TIP_GROUPS.length)
  })

  it('renders every group title and a back link to Ajustes', () => {
    const { container } = render(<DicasPage />)
    for (const group of TIP_GROUPS) {
      expect(screen.getByRole('heading', { level: 2, name: group.title })).toBeTruthy()
    }
    const back = container.querySelector('.dicas-back') as HTMLAnchorElement
    expect(back).not.toBeNull()
    expect(back.getAttribute('href')).toBe('/ajustes')
  })
})
