import type { VerseItem } from './blanks'
import { type Difficulty, tokenize } from './blanks'
import { shuffle } from './game'

export interface CatechismEntry {
  q: string
  a: string
}

export const CATECHISM: CatechismEntry[] = [
  { q: 'Qual é nossa única esperança na vida e na morte?', a: 'Que não somos de nós mesmos, mas pertencemos a Deus.' },
  { q: 'Quem é Deus?', a: 'Deus é o Criador de todos os seres humanos e de todas as coisas.' },
  { q: 'Quantas pessoas existem em Deus?', a: 'Existem três pessoas no único Deus: o Pai, o Filho e o Espírito Santo.' },
  { q: 'Como e por que Deus nos criou?', a: 'Deus criou-nos homem e mulher à sua própria imagem para glorificá-lo.' },
  { q: 'O que mais Deus criou?', a: 'Deus criou todas as coisas e sua criação era muito boa.' },
  { q: 'Como glorificamos a Deus?', a: 'Amando-o e obedecendo seus mandamentos e lei.' },
  {
    q: 'O que a lei de Deus requer?',
    a: 'Que amemos a Deus de todo coração, alma, mente e força; e amemos o próximo como a nós mesmos.',
  },
  {
    q: 'Qual é a lei de Deus declarada nos Dez Mandamentos?',
    a: 'Não terás outros deuses diante de mim. Não farás para ti imagens. Não tomarás o nome do SENHOR teu Deus em vão. Lembra-te do sábado para santificá-lo. Honra teu pai e tua mãe. Não matarás. Não cometerás adultério. Não furtarás. Não darás falso testemunho. Não cobiçarás.',
  },
  {
    q: 'O que Deus requer nos mandamentos primeiro, segundo e terceiro?',
    a: 'No primeiro, que conheçamos a Deus como único Deus verdadeiro. No segundo, que evitemos toda idolatria. No terceiro, que tratemos o nome de Deus com temor e reverência.',
  },
  {
    q: 'O que Deus requer nos mandamentos quarto e quinto?',
    a: 'No quarto, que gastemos o tempo no culto público e privado de Deus. No quinto, que amemos e honremos nosso pai e nossa mãe.',
  },
  {
    q: 'O que Deus requer nos mandamentos sexto, sétimo e oitavo?',
    a: 'No sexto, que não firamos ou odiemos a nosso próximo. No sétimo, que vivamos com pureza e fidelidade. No oitavo, que não tomemos, sem permissão, aquilo que pertence a outra pessoa.',
  },
  {
    q: 'O que Deus requer no nono e no décimo mandamento?',
    a: 'No nono, que não mintamos ou enganemos. No décimo, que sejamos felizes, e não invejemos ninguém.',
  },
  {
    q: 'É possível alguém guardar perfeitamente a lei de Deus?',
    a: 'Desde a queda, nenhum ser humano foi capaz de guardar perfeitamente a lei de Deus.',
  },
  {
    q: 'Deus nos criou incapazes de cumprir a sua lei?',
    a: 'Não, mas devido à desobediência de nossos primeiros pais, Adão e Eva, nascemos todos em pecado e culpa, e somos incapazes de guardar a lei de Deus.',
  },
]

export function catechismItems(
  from: number,
  to: number,
  showQuestion: boolean,
  difficulty: Difficulty = 'normal',
  random?: () => number,
): VerseItem[] {
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  const entries = CATECHISM.slice(lo - 1, hi).map((e, i) => ({ ...e, n: lo + i }))
  return (random ? shuffle(entries, random) : entries).map((e) => ({
    reference: `Pergunta ${e.n}`,
    text: e.a,
    tokens: tokenize(e.a, difficulty),
    question: e.q,
    showQuestion,
  }))
}
