export interface MemorizationTip {
  title: string
  text: string
}

export interface TipGroup {
  id: string
  title: string
  tips: MemorizationTip[]
}

export const TIP_GROUPS: TipGroup[] = [
  {
    id: 'aproveite-o-app',
    title: 'Aproveite o app',
    tips: [
      {
        title: 'Revisar todo dia',
        text: 'Cinco minutos por dia rendem mais que uma hora no fim de semana. Ative o lembrete diário em Ajustes.',
      },
      {
        title: 'Três modos, três objetivos',
        text: 'Flashcard para conhecer, lacunas para treinar e digitação para fixar. Textos novos rendem mais na digitação.',
      },
      {
        title: 'Coleções temáticas',
        text: 'Memorize blocos com sentido, como os Frutos do Espírito, em vez de versículos soltos e sem conexão.',
      },
      {
        title: 'Memorize no contexto',
        text: 'Abra o capítulo em Bíblia e entenda quem fala e o que acontece antes de decorar o versículo.',
      },
      {
        title: 'Leve seu progresso',
        text: 'Crie uma conta para sincronizar e revisar no celular ou no computador, em qualquer lugar.',
      },
    ],
  },
  {
    id: 'memorize-melhor',
    title: 'Como memorizar melhor',
    tips: [
      {
        title: 'Teste-se antes de olhar',
        text: 'Tente lembrar o texto de cabeça antes de revelar a resposta. É esse esforço que grava a memória.',
      },
      {
        title: 'Fale e escreva',
        text: 'Repetir em voz alta e digitar ativa mais caminhos de memória do que apenas ler.',
      },
      {
        title: 'Poucos e bons',
        text: 'Três a cinco textos por vez. Qualidade vence quantidade.',
      },
      {
        title: 'Entenda antes de repetir',
        text: 'O significado e a lógica do texto ancoram a decoreba.',
      },
      {
        title: 'Revise antes de dormir',
        text: 'O sono consolida o que você revisou durante o dia.',
      },
      {
        title: 'Seja honesto na avaliação',
        text: 'Marcar 1 hoje evita ter que reaprender tudo depois. O FSRS usa sua avaliação para agendar a revisão na hora certa.',
      },
    ],
  },
  {
    id: 'evite-erros',
    title: 'Evite os erros comuns',
    tips: [
      {
        title: 'Não fique só relendo',
        text: 'Reler sem tentar lembrar dá uma falsa sensação de domínio, a chamada fluência ilusória.',
      },
      {
        title: 'Não exagere na quantidade',
        text: 'Encher a fila de dezenas de textos novos desanima e quebra o hábito.',
      },
      {
        title: 'Não pare tudo se falhar um dia',
        text: 'Pular um dia é normal. Retome no dia seguinte sem culpa.',
      },
      {
        title: 'Não tenha medo do 1',
        text: 'Marcar "vi de novo" agora evita um buraco de memória muito maior mais tarde.',
      },
    ],
  },
  {
    id: 'planos-rapidos',
    title: 'Planos rápidos',
    tips: [
      {
        title: 'Semana 1',
        text: 'Um texto novo por dia, sempre revisando os anteriores.',
      },
      {
        title: 'Versículo da semana',
        text: 'Escolha um versículo e pratique a digitação todo dia até sair de cor.',
      },
      {
        title: 'Sequência temática',
        text: 'Uma série curta, como Salmos de confiança, mantém a motivação.',
      },
      {
        title: 'Meta realista',
        text: 'Melhor três por semana que ficam do que trinta que você esquece.',
      },
    ],
  },
]

const ALL_TIPS = TIP_GROUPS.flatMap((group) => group.tips)

/** Deterministic tip of the day — rotates by day of year, stable within a single day. */
export function dailyTip(now: Date = new Date()): MemorizationTip {
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  return ALL_TIPS[dayOfYear % ALL_TIPS.length] ?? ALL_TIPS[0]
}
