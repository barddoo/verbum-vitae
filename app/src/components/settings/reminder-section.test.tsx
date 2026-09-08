// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReminderSection } from './reminder-section'

describe('ReminderSection', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the installed-app hint on web (no native reminders)', () => {
    render(<ReminderSection />)
    expect(screen.getByText(/aplicativo instalado/)).toBeTruthy()
    expect(screen.queryByText('Lembrete diário de revisão')).toBeNull()
  })
})
