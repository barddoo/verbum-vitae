// Generates westminster.json from IPB PDF content
// Source: https://www.ipb.org.br/content/Arquivos/Breve_Catecismo_de_Westminster.pdf
// Run: bun run scripts/build-westminster-ipb.ts

const items: { q: string; a: string }[] = [
  { q: 'Qual é o fim principal do homem?', a: 'O fim principal do homem é glorificar a Deus, e gozá-lo para sempre.' },
  {
    q: 'Que regra deu Deus para nos dirigir na maneira de o glorificar e gozar?',
    a: 'A Palavra de Deus, que se acha nas Escrituras do Velho e do Novo Testamentos, é a única regra para nos dirigir na maneira de o glorificar e gozar.',
  },
  {
    q: 'Qual é a coisa principal que as Escrituras nos ensinam?',
    a: 'A coisa principal que as Escrituras nos ensinam é o que o homem deve crer acerca de Deus, o dever que Deus requer do homem.',
  },
  {
    q: 'Quem é Deus?',
    a: 'Deus é espírito, infinito, eterno e imutável em seu ser, sabedoria, poder, santidade, justiça, bondade e verdade.',
  },
  { q: 'Há mais de um Deus?', a: 'Há só um Deus, o Deus vivo e verdadeiro.' },
  {
    q: 'Quantas pessoas há na Divindade?',
    a: 'Há três pessoas na Divindade: o Pai, o Filho e o Espírito Santo, e estas três são um Deus, da mesma substância, iguais em poder e glória.',
  },
  {
    q: 'Que são os decretos de Deus?',
    a: 'Os decretos de Deus são o seu eterno propósito, segundo o conselho da sua vontade, pelo qual, para sua própria glória, Ele predestinou tudo o que acontece.',
  },
  { q: 'Como executa Deus os seus decretos?', a: 'Deus executa os seus decretos nas obras da criação e da providência.' },
  {
    q: 'Qual é a obra da criação?',
    a: 'A obra da criação é aquela pela qual, Deus fez todas as coisas do nada, no espaço de seis dias, e tudo muito bem.',
  },
  {
    q: 'Como criou Deus o homem?',
    a: 'Deus criou o homem macho e fêmea, conforme a sua própria imagem, em conhecimento, retidão e santidade com domínio sobre as criaturas.',
  },
  {
    q: 'Quais são as obras da providência de Deus?',
    a: 'As obras da providência de Deus são a sua maneira muito santa, sábia e poderosa de preservar e governar todas as suas criaturas, e todas as ações delas.',
  },
  {
    q: 'Que ato especial de providência exerceu Deus para com o homem no estado em que ele foi criado?',
    a: 'Quando Deus criou o homem, fez com ele um pacto de vida, com a condição de perfeita obediência: proibindo-lhe comer da árvore da ciência do bem e do mal, sob pena de morte.',
  },
  {
    q: 'Conservaram-se nossos primeiros pais no estado em que foram criados?',
    a: 'Nossos primeiros pais, sendo deixados à liberdade da sua própria vontade, caíram do estado em que foram criados, pecando contra Deus.',
  },
  { q: 'Que é pecado?', a: 'Pecado é qualquer falta de conformidade com a lei de Deus, ou qualquer transgressão desta lei.' },
  {
    q: 'Qual foi o pecado pelo qual nossos primeiros pais caíram do estado em que foram criados?',
    a: 'O pecado pelo qual nossos primeiros pais caíram do estado em que foram criados foi o comerem do fruto proibido.',
  },
  {
    q: 'Caiu todo o gênero humano pela primeira transgressão de Adão?',
    a: 'Visto que o pacto foi feito com Adão não só para ele, mas também para sua posteridade, todo gênero humano que dele procede por geração ordinária, pecou nele e caiu com ele na sua primeira transgressão.',
  },
  { q: 'Qual foi o estado a que a queda reduziu o gênero humano?', a: 'A queda reduziu o gênero humano a um estado de pecado e miséria.' },
  {
    q: 'Em que consiste o estado de pecado em que o homem caiu?',
    a: 'O estado de pecado em que o homem caiu consiste na culpa do primeiro pecado de Adão, na falta de retidão original e na corrupção de toda a sua natureza, o que ordinariamente se chama Pecado Original, juntamente com todas as transgressões atuais que procedem dele.',
  },
  {
    q: 'Qual é a miséria do estado em que o homem caiu?',
    a: 'Todo o gênero humano pela sua queda perdeu comunhão com Deus, está debaixo da sua ira e maldição, e assim sujeito a todas as misérias nesta vida, à morte e às penas do Inferno para sempre.',
  },
  {
    q: 'Deixou Deus todo o gênero humano perecer no estado de pecado e miséria?',
    a: 'Tendo Deus, unicamente pela sua boa vontade desde toda a eternidade, escolhido alguns para a vida eterna, entrou com eles em um pacto de graça, para os livrar do estado de pecado e miséria, e trazer a um estado de salvação por meio de um Redentor.',
  },
  {
    q: 'Quem é o Redentor dos escolhidos de Deus?',
    a: 'O único redentor dos escolhidos de Deus é o Senhor Jesus Cristo que, sendo o eterno Filho de Deus, se fez homem, e assim foi e continua a ser Deus e homem em duas naturezas distintas, e uma só pessoa, para sempre.',
  },
  {
    q: 'Como Cristo, sendo o Filho de Deus, se fez homem?',
    a: 'Cristo, o Filho de Deus, fez-se homem tomando um verdadeiro corpo, e uma alma racional, sendo concebido pelo poder do Espírito Santo no ventre da virgem Maria, e nascido dela, mas sem pecado.',
  },
  {
    q: 'Que funções exerce Cristo como nosso Redentor?',
    a: 'Cristo, como nosso Redentor, exerce as funções de profeta, sacerdote e rei, tanto no seu estado de humilhação como no de exaltação.',
  },
  {
    q: 'Como exerce Cristo as funções de profeta?',
    a: 'Cristo exerce as funções de profeta, revelando-nos, pela sua Palavra e pelo seu Espírito, a vontade de Deus para a nossa salvação.',
  },
  {
    q: 'Como exerce Cristo as funções de sacerdote?',
    a: 'Cristo exerce as funções de sacerdote, oferecendo-se a si mesmo uma vez em sacrifício, para satisfazer a justiça divina, reconciliar-nos com Deus e fazendo contínua intercessão por nós.',
  },
  {
    q: 'Como exerce Cristo as funções de rei?',
    a: 'Cristo exerce as funções de rei, sujeitando-nos a si mesmo, governando-nos e protegendo-nos, contendo e subjugando todos os seus e os nossos inimigos.',
  },
  {
    q: 'Em que consistiu a humilhação de Cristo?',
    a: 'A humilhação de Cristo consistiu em Ele nascer, e isso em condição baixa, feito sujeito à lei; em sofrer as misérias desta vida, a ira de Deus e amaldiçoada morte na cruz; em ser sepultado, e permanecer debaixo do poder da morte durante certo tempo.',
  },
  {
    q: 'Em que consiste a exaltação de Cristo?',
    a: 'A exaltação de Cristo consiste em Ele ressurgir dos mortos no terceiro dia; em subir ao Céu e estar sentado à mão direita de Deus Pai, e em vir para julgar o mundo no último dia.',
  },
  {
    q: 'Como nos tornamos participantes da redenção adquirida por Cristo?',
    a: 'Tornamo-nos participantes da redenção adquirida por Cristo pela eficaz aplicação dela a nós pelo Seu Santo Espírito.',
  },
  {
    q: 'Como nos aplica o Espírito a redenção adquirida por Cristo?',
    a: 'O Espírito aplica-nos a redenção adquirida por Cristo, operando em nós a fé, e unindo-nos a Cristo por meio dela em nossa vocação eficaz.',
  },
  {
    q: 'Que é vocação eficaz?',
    a: 'Vocação eficaz é a obra do Espírito Santo, pela qual, convencendo-nos do nosso pecado, e da nossa miséria, iluminando nossos entendimentos pelo conhecimento de Cristo, e renovando a nossa vontade, nos persuade e habilita a abraçar Jesus Cristo, que nos é oferecido de graça no Evangelho.',
  },
  {
    q: 'Que bênçãos gozam nesta vida aqueles que são eficazmente chamados?',
    a: 'Aqueles que são eficazmente chamados, gozam, nesta vida, da justificação, adoção e santificação, e das diversas bênçãos que acompanham estas graças ou delas procedem.',
  },
  {
    q: 'Que é justificação?',
    a: 'Justificação é um ato da livre graça de Deus, no qual Ele perdoa todos os nossos pecados, e nos aceita como justos diante de Si, somente por causa da justiça de Cristo a nós imputada, e recebida só pela fé.',
  },
  {
    q: 'Que é adoção?',
    a: 'Adoção é um ato de livre graça de Deus, pelo qual somos recebidos no número dos filhos de Deus, e temos direito a todos os seus privilégios.',
  },
  {
    q: 'Que é santificação?',
    a: 'É a obra da livre graça de Deus, pela qual somos renovados em todo o nosso ser, segundo a imagem de Deus, e habilitados a morrer cada vez mais para o pecado e a viver para a retidão.',
  },
  {
    q: 'Quais são as bênçãos que nesta vida acompanham a justificação, adoção e santificação ou delas procedem?',
    a: 'As bênçãos que nesta vida acompanham a justificação, adoção e santificação, ou delas procedem, são: certeza do amor de Deus, paz de consciência, gozo no Espírito Santo, aumento de graça, e perseverança nela até ao fim.',
  },
  {
    q: 'Quais são as bênçãos que os fiéis recebem de Cristo na hora da morte?',
    a: 'As almas dos fiéis na hora da morte são aperfeiçoadas em santidade, e imediatamente entram na glória; e os corpos que continuam unidos Cristo, descansam na sepultura até a ressurreição.',
  },
  {
    q: 'Quais são as bênçãos que os fiéis recebem de Cristo na ressurreição?',
    a: 'Na ressurreição, os fiéis, sendo ressuscitados em glória, serão publicamente reconhecidos e absolvidos no dia de juízo, e tornados perfeitamente felizes no pleno gozo de Deus por toda a eternidade.',
  },
  { q: 'Qual é o dever que Deus exige do homem?', a: 'O dever que Deus exige do homem é obediência à sua vontade revelada.' },
  {
    q: 'Que revelou Deus primeiramente ao homem para regra de sua obediência?',
    a: 'A regra que Deus revelou primeiramente ao homem para sua obediência foi a lei moral.',
  },
  { q: 'Onde está a lei moral resumidamente compreendida?', a: 'A lei moral está resumidamente compreendida nos dez mandamentos.' },
  {
    q: 'Em que se resumem os dez mandamentos?',
    a: 'Os dez mandamentos se resumem em amar ao Senhor nosso Deus de todo o nosso coração, de toda a nossa alma, de todas as nossas forças e de todo o nosso entendimento; e ao nosso próximo como a nós mesmos.',
  },
  {
    q: 'Qual é o prefácio dos dez mandamentos?',
    a: 'O prefácio dos dez mandamentos é: "Eu sou o Senhor teu Deus, que te tirei da terra do Egito, da casa da servidão."',
  },
  {
    q: 'Que nos ensina o prefácio dos dez mandamentos?',
    a: 'O prefácio dos dez mandamentos ensina-nos que nós temos obrigação de guardar todos os mandamentos de Deus, por ser Ele o Senhor nosso Deus e Redentor.',
  },
  { q: 'Qual é o primeiro mandamento?', a: 'O primeiro mandamento é: "Não terás outros deuses além de mim."' },
  {
    q: 'Que exige o primeiro mandamento?',
    a: 'O primeiro mandamento exige de nós o conhecer e reconhecer a Deus como o único Deus verdadeiro, e nosso Deus; e como tal adorá-lo.',
  },
  {
    q: 'Que proíbe o primeiro mandamento?',
    a: 'O primeiro mandamento proíbe o negar, ou deixar de adorar ou glorificar ao verdadeiro Deus, como Deus, e nosso Deus; e dar a qualquer outro a adoração e a glória que só a Ele são devidas.',
  },
  {
    q: 'Que se nos ensina especialmente pelas palavras "além de mim," no primeiro mandamento?',
    a: 'As palavras "além de mim," no primeiro mandamento, ensinam-nos que Deus, que vê todas as coisas, toma conhecimento e muito se ofende do pecado de ter-se em seu lugar outro deus.',
  },
  {
    q: 'Qual é o segundo mandamento?',
    a: 'O segundo mandamento é: "Não farás para ti imagem de escultura, nem figura alguma de tudo que há em cima no Céu, e do que há embaixo na terra, nem de coisa alguma que haja nas águas, debaixo da terra. Não as adorarás, nem lhes darás culto; porque eu sou o Senhor teu Deus, o Deus zeloso, que vinga a iniqüidade dos pais nos filhos até à terceira e quarta geração daqueles que me aborrecem; e que usa de misericórdia com milhares daqueles que me amam e que guardam os meus preceitos."',
  },
  {
    q: 'Que exige o segundo mandamento?',
    a: 'O segundo mandamento exige que recebamos, observemos e guardemos puros e inteiros todo o culto e ordenanças religiosas que Deus instituiu na sua Palavra.',
  },
  {
    q: 'Que proíbe o segundo mandamento?',
    a: 'O segundo mandamento proíbe o adorar a Deus por meio de imagens, ou de qualquer outra maneira não prescrita na sua Palavra.',
  },
  {
    q: 'Quais são as razões anexas ao segundo mandamento?',
    a: 'As razões anexas ao segundo mandamento são a soberania de Deus sobre nós, a sua propriedade em nós em nós, e o zelo que Ele tem pelo seu culto.',
  },
  {
    q: 'Qual é o terceiro mandamento?',
    a: 'O terceiro mandamento é: "Não tomarás o nome do Senhor teu Deus em vão, porque o Senhor não terá por inocente aquele que tomar em vão o nome do Senhor seu Deus."',
  },
  {
    q: 'Que exige o terceiro mandamento?',
    a: 'O terceiro mandamento exige o santo e reverente uso dos nomes, títulos, atributos, ordenanças, palavras e obras de Deus.',
  },
  {
    q: 'O que proíbe o terceiro mandamento?',
    a: 'O terceiro mandamento proíbe toda a profanação ou abuso das coisas por meio das quais Deus se faz conhecer.',
  },
  {
    q: 'Qual é a razão anexa ao terceiro mandamento?',
    a: 'A razão anexa ao terceiro mandamento é que, embora os transgressores deste mandamento escapem do castigo dos homens, o Senhor nosso Deus não os deixará escapar do seu justo juízo.',
  },
  {
    q: 'Qual é o quarto mandamento?',
    a: 'O quarto mandamento é: "Lembra-te de santificar o dia do Sábado. Trabalharás seis dias, e farás nele tudo o que tens para fazer. O sétimo dia, porém, é o Sábado do Senhor teu Deus. Não farás nesse dia, obra alguma, nem tu, nem teu filho, nem tua filha, nem o teu servo, nem a tua serva, nem o teu animal, nem o peregrino que vive das tuas portas para dentro. Porque o Senhor fez em seis dias o céu, a terra e o mar, e tudo o que neles há, e descansou no sétimo dia. Por isso o Senhor abençoou o dia sétimo e o santificou."',
  },
  {
    q: 'Que exige o quarto mandamento?',
    a: 'O quarto mandamento exige que consagremos a Deus os tempos determinados em sua Palavra, particularmente um dia inteiro em cada sete, para ser um dia de santo descanso a Ele dedicado.',
  },
  {
    q: 'Qual dos sete dias designou Deus para esse descanso semanal?',
    a: 'Desde o princípio do mundo até à ressurreição de Cristo, Deus designou o sétimo dia da semana para o descanso semanal; e desde então o primeiro dia da semana para continuar sempre até ao fim do mundo, que é o Sábado cristão, ou Domingo.',
  },
  {
    q: 'De que modo se deve santificar o Domingo?',
    a: 'Deve-se santificar o Domingo com um santo repouso por todo aquele dia, mesmo das ocupações e recreações temporais que são permitidas nos outros dias; empregando todo o tempo em exercícios públicos e particulares de adoração a Deus, exceto o tempo preciso para as obras de pura necessidade e misericórdia.',
  },
  {
    q: 'Que proíbe o quarto mandamento?',
    a: 'O quarto mandamento proíbe a omissão ou a negligência no cumprimento dos deveres exigidos, e a profanação deste dia por meio de ociosidade ou por fazer aquilo que é em si mesmo pecaminoso, ou por desnecessários pensamentos, palavras, ou obras acerca de nossos negócios e recreações temporais.',
  },
  {
    q: 'Quais são as razões anexas ao quarto mandamento?',
    a: 'As razões anexas ao quarto mandamento são: a permissão que Deus nos concede de fazermos uso dos seis dias da semana para os nossos interesses temporais; o reclamar ele para si a propriedade especial do dia sétimo, o seu próprio exemplo, e a benção que ele conferiu ao dia do descanso.',
  },
  {
    q: 'Qual é o quinto mandamento?',
    a: 'O quinto mandamento é: "Honrarás a teu pai e a tua mãe, para teres uma dilatada vida sobre a terra que o Senhor teu Deus te há de dar."',
  },
  {
    q: 'Que exige o quinto mandamento?',
    a: 'O quinto mandamento exige a conservação da honra e o desempenho dos deveres pertencentes a cada um em suas diferentes condições e relações, como superiores, inferiores, ou iguais.',
  },
  {
    q: 'Que proíbe o quinto mandamento?',
    a: 'O quinto mandamento proíbe negligenciarmos ou fazermos alguma coisa contra a honra e dever que pertencem a cada um em suas diferentes condições e relações.',
  },
  {
    q: 'Qual é a razão anexa ao quinto mandamento?',
    a: 'A razão anexa ao quinto mandamento é uma promessa de longa vida e prosperidade (quanto sirva para glória de Deus e bem do homem) a todos aqueles que guardam este mandamento.',
  },
  { q: 'Qual é o sexto mandamento?', a: 'O sexto mandamento é: "Não matarás."' },
  {
    q: 'Que exige o sexto mandamento?',
    a: 'O sexto mandamento exige todos os esforços lícitos para conservar a nossa vida e a dos nossos semelhantes.',
  },
  {
    q: 'Que proíbe o sexto mandamento?',
    a: 'O sexto mandamento proíbe o tirar a nossa própria vida, ou a do nosso próximo injustamente, e tudo aquilo que para isso concorre.',
  },
  { q: 'Qual é o sétimo mandamento?', a: 'O sétimo mandamento é: "Não adulterarás."' },
  {
    q: 'Que exige o sétimo mandamento?',
    a: 'O sétimo mandamento exige a conservação da nossa própria castidade, e da do nosso próximo, no coração, nas palavras e nos costumes.',
  },
  { q: 'Que proíbe o sétimo mandamento?', a: 'O sétimo mandamento proíbe todos os pensamentos, palavras e ações impuras.' },
  { q: 'Qual é o oitavo mandamento?', a: 'O oitavo mandamento é: "Não furtarás."' },
  {
    q: 'Que exige o oitavo mandamento?',
    a: 'O oitavo mandamento exige que procuremos o lícito adiantamento das riquezas e do estado exterior, tanto nosso como do nosso próximo.',
  },
  {
    q: 'Que proíbe o oitavo mandamento?',
    a: 'O oitavo mandamento proíbe tudo o que impede ou pode impedir injustamente o adiantamento da riqueza ou do bem-estar, tanto nosso como do nosso próximo.',
  },
  { q: 'Qual é o nono mandamento?', a: 'O nono mandamento é: "Não dirás falso testemunho contra o teu próximo."' },
  {
    q: 'Que exige o nono mandamento?',
    a: 'O nono mandamento exige a conservação e promoção da verdade entre os homens, e a manutenção da nossa boa reputação, e a do nosso próximo, especialmente quando somos chamados a dar testemunho.',
  },
  {
    q: 'Que proíbe o nono mandamento?',
    a: 'O nono mandamento proíbe tudo o que é prejudicial à verdade, ou injurioso, tanto à nossa reputação como à do nosso próximo.',
  },
  {
    q: 'Qual é o décimo mandamento?',
    a: 'O décimo mandamento é: "Não cobiçarás a casa do teu próximo; não desejarás a sua mulher, nem o seu servo, nem a sua serva, nem o seu boi, nem o seu jumento, nem coisa alguma que lhe pertença."',
  },
  {
    q: 'Que exige o décimo mandamento?',
    a: 'O décimo mandamento exige o pleno contentamento com a nossa condição, bem como disposição caridosa para com o nosso próximo e tudo o que lhe pertence.',
  },
  {
    q: 'O que proíbe o décimo mandamento?',
    a: 'O décimo mandamento proíbe todo o descontentamento com a nossa condição, todo o movimento de inveja ou pesar à vista da prosperidade do nosso próximo e todas as tendências ou afeições desordenadas a alguma coisa que lhe pertence.',
  },
  {
    q: 'Será alguém capaz de guardar perfeitamente os mandamentos de Deus?',
    a: 'Nenhum mero homem, desde a queda de Adão, é capaz, nesta vida, de guardar perfeitamente os mandamentos de Deus, mas diariamente os quebranta por pensamentos, palavras e obras.',
  },
  {
    q: 'São igualmente odiosas todas as transgressões da lei?',
    a: 'Alguns pecados em si mesmos, e em razão de circunstâncias agravantes, são mais odiosos à vista de Deus do que outros.',
  },
  { q: 'Que merece cada pecado?', a: 'Cada pecado merece a ira e a maldição de Deus, tanto nesta vida como na vindoura.' },
  {
    q: 'Que exige Deus de nós para que possamos escapar a sua ira e maldição em que temos incorrido pelo pecado?',
    a: 'Para escaparmos à ira e maldição de Deus, em que temos incorrido pelo pecado, Deus exige de nós fé em Jesus Cristo e arrependimento para a vida, com o uso diligente de todos os meios exteriores pelos quais Cristo nos comunica as bênçãos da redenção.',
  },
  {
    q: 'Que é fé em Jesus Cristo?',
    a: 'Fé em Jesus Cristo é uma graça salvadora, pela qual o recebemos e confiamos só nEle para a salvação, como Ele nos é oferecido.',
  },
  {
    q: 'Que é arrependimento para a vida?',
    a: 'Arrependimento para a vida é uma graça salvadora pela qual o pecador, tendo um verdadeiro sentimento do seu pecado e percepção da misericórdia de Deus em Cristo, se enche de tristeza e de horror pelos seus pecados, abandona-os e volta para Deus, inteiramente resolvido a prestar-lhe nova obediência.',
  },
  {
    q: 'Quais são os meios exteriores e ordinários pelos quais Cristo nos comunica as bênçãos da redenção?',
    a: 'Os meios exteriores e ordinários pelos quais Cristo nos comunica as bênçãos da redenção, são as suas ordenanças, especialmente a Palavra, os sacramentos e a oração; as quais todas se tornam eficazes aos eleitos para a salvação.',
  },
  {
    q: 'Como se torna a Palavra eficaz para a salvação?',
    a: 'O Espírito de Deus torna a leitura e especialmente a pregação da Palavra, meios eficazes para convencer e converter os pecadores, para os edificar em santidade e conforto, por meio da fé para a salvação.',
  },
  {
    q: 'Como se deve ler e ouvir a Palavra a fim de que ela se torne eficaz para a salvação?',
    a: 'Para que a Palavra se torne eficaz para a salvação, devemos ouvi-la com diligência, preparação e oração; recebê-la com fé e amor, guardá-la em nossos corações e praticá-la em nossas vidas.',
  },
  {
    q: 'Como se tornam os sacramentos meios eficazes para a salvação?',
    a: 'Os sacramentos tornam-se meios eficazes para a salvação, não por alguma virtude que eles ou aqueles que os ministram tenham, mas somente pela bênção de Cristo e pela obra do seu Espírito naqueles que pela fé os recebem.',
  },
  {
    q: 'Que é um sacramento?',
    a: 'Um sacramento é uma santa ordenança, instituída por Cristo, na qual, por sinais sensíveis, Cristo e as bênçãos do novo pacto são representadas, seladas e aplicadas aos crentes.',
  },
  { q: 'Quais são os sacramentos do Novo Testamento?', a: 'Os sacramentos do Novo Testamento são o Batismo e a Ceia do Senhor.' },
  {
    q: 'Que é o Batismo?',
    a: 'O Batismo é o sacramento no qual o lavar com água em nome do Pai, do Filho e do Espírito Santo significa e sela a nossa união com Cristo, a participação das bênçãos do pacto da graça, e a promessa de pertencermos ao Senhor.',
  },
  {
    q: 'A quem deve ser ministrado o Batismo?',
    a: 'O Batismo não deve ser ministrado àqueles que estão fora da igreja visível, enquanto não professarem sua fé em Cristo e obediência a Ele; mas os filhos daqueles que são membros da igreja visível devem ser batizados.',
  },
  {
    q: 'O que é a Ceia do Senhor?',
    a: 'A Ceia do Senhor é o sacramento no qual, dando-se e recebendo-se pão e vinho, conforme a instituição de Cristo, se anuncia a sua morte, e aqueles que participam dignamente tornam-se, não de uma maneira corporal e carnal, mas pela fé, participantes do seu corpo e do seu sangue, com todas as suas bênçãos para o seu alimento espiritual e crescimento em graça.',
  },
  {
    q: 'Que se exige para participar dignamente da Ceia do Senhor?',
    a: 'Exige-se daqueles que desejam participar dignamente da Ceia do Senhor que se examine sobre o seu conhecimento em discernir o corpo do Senhor, sobre a sua fé para se alimentarem dele, sobre o seu arrependimento, amor e nova obediência; para não suceder que, vindo indignamente, comam e bebam para si a condenação.',
  },
  {
    q: 'O que é Oração?',
    a: 'A Oração é um santo oferecimento dos nossos desejos a Deus, por coisas conformes com a sua vontade, em nome de Cristo, com a confissão dos nossos pecados, e um agradecido reconhecimento das suas misericórdias.',
  },
  {
    q: 'Qual é a regra que Deus nos deu para nos dirigir em oração?',
    a: 'Toda palavra de Deus é útil para nos dirigir em oração, mas a regra especial de direção é aquela forma de oração que Cristo ensinou aos seus discípulos, e que geralmente se chama a Oração Dominical.',
  },
  {
    q: 'Que nos ensina o prefácio da Oração Dominical?',
    a: 'O prefácio da Oração Dominical, que é: "Pai nosso que estás no Céu," ensina-nos que nos devemos aproximar de Deus com toda a santa reverência e confiança, como filhos a um pai poderoso e pronto para nos ajudar, e também nos ensina a orar com os outros e por eles.',
  },
  {
    q: 'Pelo que oramos na primeira petição?',
    a: 'Na primeira petição que é: "Santificado seja o Teu nome" pedimos que Deus nos habilite a nós e aos outros a glorificá-lo em tudo aquilo em que se dá a conhecer; e que disponha tudo para sua glória.',
  },
  {
    q: 'Pelo que oramos na segunda petição?',
    a: 'Na segunda petição, que é: "Venha o Teu reino," pedimos que o reino de Satanás seja destruído e que o reino da graça seja adiantado; que nós e os outros a ele sejamos guiados e nele guardados, e que cedo venha o reino da glória.',
  },
  {
    q: 'Pelo que oramos na terceira petição?',
    a: 'Na terceira petição, que é: "Seja feita Tua vontade, assim na terra como no Céu," pedimos que Deus, pela sua graça, nos torne capazes e desejosos de conhecer a sua vontade, de obedecer e submeter-nos a ela em tudo, como fazem os anjos no Céu.',
  },
  {
    q: 'Pelo que oramos na quarta petição?',
    a: 'Na quarta petição, que é: "O pão nosso de cada dia nos dá hoje," pedimos que da livre dádiva de Deus recebamos uma porção suficiente das coisas boas desta vida, e gozemos com elas de suas bênçãos.',
  },
  {
    q: 'Pelo que oramos na quinta petição?',
    a: 'Na quinta petição, que é: "E perdoa-nos as nossas dívidas, assim como nós também perdoamos aos nossos devedores," pedimos que Deus, por amor de Cristo, nos perdoe gratuitamente os nossos pecados, o que somos animados a pedir, porque, pela Sua graça somos habilitados a perdoar de coração ao nosso próximo.',
  },
  {
    q: 'Pelo que oramos na sexta petição?',
    a: 'Na sexta petição, que é: "E não nos deixes cair em tentação," pedimos que Deus nos guarde de sermos tentados a pecar, ou nos preserve e livre, quando formos tentados.',
  },
  {
    q: 'Que nos ensina a conclusão da Oração Dominical?',
    a: 'A conclusão da Oração Dominical, que é: "Porque Teu é o reino, o poder e a glória, para sempre. Amém," ensina-nos que na Oração devemos confiar somente em Deus, e louvá-lO em nossas orações, atribuindo-Lhe reino, poder e glória. E em testemunho do nosso desejo e certeza de sermos ouvidos, dizemos: Amém.',
  },
]

const output = {
  type: 'catechism',
  id: 'westminster',
  name: 'Breve Catecismo de Westminster',
  sectionLabel: 'Parte',
  itemLabel: 'Pergunta',
  sections: [
    {
      name: 'Catecismo',
      items,
    },
  ],
}

const outputPath = `${import.meta.dirname}/../app/public/textos/westminster.json`
await Bun.write(outputPath, JSON.stringify(output, null, 2))
console.log(`Written ${items.length} items to ${outputPath}`)
