// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyReminderCard } from './daily-reminder-card'

vi.mock('../lib/daily-reminder', () => ({
  remindersAvailable: () => true,
  loadReminder: () => null,
  saveReminder: vi.fn(),
  applyReminder: vi.fn().mockResolvedValue(true),
}))

import { applyReminder, saveReminder } from '../lib/daily-reminder'

describe('DailyReminderCard (native)', () => {
  beforeEach(() => {
    vi.mocked(applyReminder).mockClear()
    vi.mocked(saveReminder).mockClear()
    vi.mocked(applyReminder).mockResolvedValue(true)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the reminder picker when reminders are available', () => {
    render(<DailyReminderCard />)
    expect(screen.getByText('Lembrete diário de revisão')).toBeTruthy()
    expect(screen.queryByText('aplicativo instalado')).toBeNull()
  })

  it('schedules and persists when the reminder is enabled', async () => {
    render(<DailyReminderCard />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(applyReminder).toHaveBeenCalledWith({ enabled: true, hour: 8, minute: 0 })
    await waitFor(() => expect(saveReminder).toHaveBeenCalledWith({ enabled: true, hour: 8, minute: 0 }))
    expect(await screen.findByText('Ativo todos os dias às 08:00')).toBeTruthy()
  })

  it('surfaces a permission error and keeps the reminder disabled', async () => {
    vi.mocked(applyReminder).mockRejectedValueOnce(new Error('permission-denied'))
    render(<DailyReminderCard />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(await screen.findByText('Permissão de notificação negada — ative nas configurações do sistema.')).toBeTruthy()
    expect(saveReminder).toHaveBeenCalledWith({ enabled: false, hour: 8, minute: 0 })
  })
})
