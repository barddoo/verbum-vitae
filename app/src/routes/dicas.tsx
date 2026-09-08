import { PageMeta } from '../components/page-meta'
import { TIP_GROUPS } from '../data/memorization-tips'

export function DicasPage() {
  return (
    <>
      <PageMeta
        title="Dicas de memorização — Verbum Vitae"
        description="Pequenos hábitos que multiplicam sua retenção: aproveite melhor o Verbum Vitae e memorize a Bíblia com mais eficiência."
        path="/dicas"
      />
      <div className="page dicas-page">
        <a className="dicas-back" href="/ajustes">
          ← Ajustes
        </a>
        <h1 className="dicas-title">Dicas de memorização</h1>
        <p className="dicas-intro">
          Pequenos hábitos fazem mais diferença do que longas horas de estudo. Escolha uma dica por vez e aplique por uma semana.
        </p>

        {TIP_GROUPS.map((group) => (
          <section key={group.id} className="dicas-group" aria-labelledby={`dicas-${group.id}`}>
            <h2 id={`dicas-${group.id}`} className="dicas-group-title">
              {group.title}
            </h2>
            <ol className="dicas-list">
              {group.tips.map((tip) => (
                <li key={tip.title} className="dicas-item">
                  <span className="dicas-item-title">{tip.title}</span>
                  <span className="dicas-item-text">{tip.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}
