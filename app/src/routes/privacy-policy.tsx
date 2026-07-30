export function PrivacyPolicyPage() {
  return (
    <div className="privacy-policy">
      <h1>Política de Privacidade</h1>
      <p className="last-updated">Última atualização: 30 de julho de 2025</p>

      <p>
        O <strong>Verbum Vitae</strong> ("aplicativo") é desenvolvido e mantido por Charles Fonseca. Esta Política de
        Privacidade descreve como coletamos, usamos e protegemos suas informações ao usar o aplicativo.
      </p>

      <h2>1. Público-alvo e Política para Famílias</h2>
      <p>
        O Verbum Vitae é um aplicativo de memorização de versículos bíblicos destinado a <strong>usuários de todas as
        idades</strong>, incluindo crianças. Todo o conteúdo do aplicativo é adequado para crianças. O aplicativo{' '}
        <strong>não exibe anúncios de terceiros</strong> e não contém conteúdo impróprio.
      </p>
      <p>
        O aplicativo cumpre as leis e regulamentos de proteção à privacidade de crianças aplicáveis, incluindo:
      </p>
      <ul>
        <li>
          <strong>COPPA</strong> (Children&apos;s Online Privacy Protection Act) — EUA
        </li>
        <li>
          <strong>GDPR</strong> (General Data Protection Regulation) — União Europeia, incluindo o Art. 8 relativo a
          menores
        </li>
        <li>
          <strong>LGPD</strong> (Lei Geral de Proteção de Dados) — Brasil, incluindo o Art. 14 relativo ao tratamento de
          dados de crianças e adolescentes
        </li>
      </ul>
      <p>
        Para usuários identificados como menores de 13 anos (ou idade equivalente na jurisdição local), não coletamos
        dados pessoais além do estritamente necessário para o funcionamento do aplicativo. O uso sem conta é totalmente
        funcional e não envia nenhum dado a servidores.
      </p>

      <h2>2. Dados Coletados</h2>

      <h3>Conta de usuário (opcional)</h3>
      <p>
        Ao criar uma conta, coletamos seu <strong>endereço de e-mail</strong> e uma senha (armazenada com hash
        criptográfico). Esses dados são usados exclusivamente para autenticação e sincronização entre dispositivos. A
        criação de conta por menores de 13 anos requer consentimento dos pais ou responsáveis.
      </p>

      <h3>Dados de uso</h3>
      <p>O aplicativo armazena localmente (no dispositivo, via IndexedDB) e, quando autenticado, sincroniza:</p>
      <ul>
        <li>Versículos memorizados e anotações pessoais</li>
        <li>Progresso de revisão (sistema de repetição espaçada — SRS)</li>
        <li>Coleções criadas pelo usuário</li>
        <li>Configurações de preferências</li>
      </ul>

      <h3>Dados técnicos</h3>
      <p>
        Não coletamos dados de diagnóstico, rastreamento de comportamento, identificadores de dispositivo, informações de
        localização ou dados biométricos.
      </p>

      <h2>3. Uso dos Dados</h2>
      <p>Os dados coletados são usados somente para:</p>
      <ul>
        <li>Autenticar sua conta e manter sessão ativa</li>
        <li>Sincronizar progresso e coleções entre dispositivos</li>
        <li>Garantir o funcionamento offline do aplicativo</li>
      </ul>
      <p>Não utilizamos seus dados para fins publicitários, análise de comportamento ou criação de perfis comerciais.</p>

      <h2>4. Publicidade</h2>
      <p>
        O aplicativo <strong>não exibe anúncios</strong> de nenhuma rede publicitária, incluindo terceiros. Não há SDKs
        de publicidade integrados.
      </p>

      <h2>5. Compartilhamento de Dados</h2>
      <p>
        Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros, exceto quando exigido por lei
        ou ordem judicial.
      </p>
      <p>
        A infraestrutura do aplicativo é hospedada na <strong>Cloudflare</strong> (Workers e D1 SQLite), sujeita à{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
          Política de Privacidade da Cloudflare
        </a>
        .
      </p>

      <h2>6. Armazenamento e Segurança</h2>
      <p>
        Seus dados são transmitidos via HTTPS e armazenados em banco de dados protegido. Senhas são armazenadas com hash
        seguro e nunca em texto simples. Tokens de autenticação têm validade de 30 dias.
      </p>

      <h2>7. Seus Direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>
          <strong>Acessar</strong> seus dados exportando seu progresso pelo aplicativo
        </li>
        <li>
          <strong>Excluir</strong> sua conta e todos os dados associados entrando em contato conosco
        </li>
        <li>
          <strong>Usar offline</strong> sem criar conta — nenhum dado é enviado ao servidor sem autenticação
        </li>
        <li>
          <strong>Revogar consentimento</strong> a qualquer momento, mediante exclusão da conta
        </li>
      </ul>
      <p>
        Para exercer esses direitos ou solicitar a exclusão de dados de uma criança, entre em contato pelo e-mail abaixo.
        Atendemos solicitações em até 15 dias úteis.
      </p>

      <h2>8. Alterações nesta Política</h2>
      <p>
        Alterações significativas serão comunicadas dentro do próprio aplicativo. O uso continuado após a publicação de
        mudanças constitui aceite da nova política.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas, solicitações de exclusão de dados ou questões sobre privacidade de crianças:{' '}
        <a href="mailto:vvitae.com.galleria929@passmail.net">vvitae.com.galleria929@passmail.net</a>
      </p>
    </div>
  )
}
