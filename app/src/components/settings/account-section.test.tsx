// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../../lib/auth'
import { cachedRemove } from '../../lib/storage'
import { AccountSection } from './account-section'

const payload = { sub: 'user-1', email: 'pessoa@exemplo.com' }
const FAKE_TOKEN = `e30.${btoa(JSON.stringify(payload))}.sig`

function renderSection() {
  return render(
    <AuthProvider>
      <AccountSection />
    </AuthProvider>,
  )
}

describe('AccountSection', () => {
  beforeEach(() => {
    localStorage.clear()
    cachedRemove('auth_token')
    cachedRemove('auth_display_name')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows sign-in actions when logged out', () => {
    renderSection()
    const actions = within(screen.getByText(/Conta opcional/).parentElement as HTMLElement)
    expect(actions.getByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(actions.getByRole('button', { name: 'Criar conta' })).toBeTruthy()
  })

  it('opens the auth modal on the login tab', () => {
    renderSection()
    const actions = within(screen.getByText(/Conta opcional/).parentElement as HTMLElement)
    fireEvent.click(actions.getByRole('button', { name: 'Entrar' }))
    const dialog = screen.getByRole('dialog', { name: 'Entrar' })
    expect(within(dialog).getByText('Entrar', { selector: '.modal-tab.active' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the auth modal on the register tab', () => {
    renderSection()
    const actions = within(screen.getByText(/Conta opcional/).parentElement as HTMLElement)
    fireEvent.click(actions.getByRole('button', { name: 'Criar conta' }))
    const dialog = screen.getByRole('dialog', { name: 'Criar conta' })
    expect(within(dialog).getByText('Criar Conta', { selector: '.modal-tab.active' })).toBeTruthy()
  })

  it('shows the account email and signs out', () => {
    localStorage.setItem('auth_token', FAKE_TOKEN)
    renderSection()
    expect(screen.getByText('pessoa@exemplo.com')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(screen.getByText(/Conta opcional/)).toBeTruthy()
    expect(screen.queryByText('pessoa@exemplo.com')).toBeNull()
  })
})
