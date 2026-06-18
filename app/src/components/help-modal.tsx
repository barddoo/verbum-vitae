import { BookOpen, Cloud, Plus, RotateCcw, Smartphone, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface HelpModalProps {
  onClose: () => void
}

const steps: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <BookOpen size={20} aria-hidden />,
    title: 'Encontre um versículo',
    text: 'Vá em Bíblia, escolha um livro, capítulo e segure o dedo sobre o versículo que deseja memorizar.',
  },
  {
    icon: <Plus size={20} aria-hidden />,
    title: 'Adicione à memória',
    text: 'Selecione um ou mais versículos e toque em Memorizar. Eles entram na sua fila de revisão.',
  },
  {
    icon: <RotateCcw size={20} aria-hidden />,
    title: 'Revise todo dia',
    text: 'Abra Revisar para ver os versículos do dia. O app usa repetição espaçada: você vê cada versículo na hora certa.',
  },
  {
    icon: <Cloud size={20} aria-hidden />,
    title: 'Sincronize entre dispositivos',
    text: 'Crie uma conta (opcional) para salvar seu progresso na nuvem e acessar em qualquer aparelho.',
  },
  {
    icon: <Smartphone size={20} aria-hidden />,
    title: 'Instale como aplicativo',
    text: 'No Android/Chrome, toque em "Instalar App" no topo da tela. No iPhone, clique em Compartilhar e "Adicionar à Tela de Início". Instalado, o app funciona offline, sem distrações e com acesso rápido na tela inicial.',
  },
]

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} aria-hidden />
        </button>

        <div className="help-header">
          <span className="help-icon">🕊️</span>
          <h2 id="help-modal-title" className="help-title">
            Como usar o Verbum Vitae
          </h2>
          <span className="help-free-badge">Grátis para sempre</span>
          <p className="help-subtitle">Memorize versículos com repetição espaçada.</p>
        </div>

        <ol className="help-steps">
          {steps.map((s) => (
            <li key={s.title} className="help-step">
              <span className="help-step-icon">{s.icon}</span>
              <div>
                <strong className="help-step-title">{s.title}</strong>
                <p className="help-step-text">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="help-feedback">
          Encontrou um bug ou quer sugerir uma funcionalidade? <a href="mailto:vvitae.com.galleria929@passmail.net">Envie um email</a>
        </p>

        <button type="button" className="btn btn-primary help-cta" onClick={onClose}>
          Entendido!
        </button>
      </div>
    </div>
  )
}
