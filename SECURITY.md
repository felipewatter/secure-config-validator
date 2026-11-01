# Política de segurança — Secure Config Validator

Reporte vulnerabilidades de forma privada via GitHub Security Advisories, quando disponível. Não publique senhas reais, tokens ou configurações privadas nas issues.

## Modelo de segurança

O programa **não executa** configurações, scripts, instruções de shell, tags YAML ou interpolação de variáveis. Faz análise **offline** de um arquivo explícito com extensão .env, .json, .yaml ou .yml.

As constatações **não contêm valores**, trechos de arquivo nem mensagens de exceção que poderiam revelar credenciais. Cada achado possui identificador de regra, categoria de propriedade e, para .env, número da linha.

Proteções implementadas:

- Arquivos maiores que o limite configurado são recusados **antes** de serem lidos integralmente; limite padrão de 1 MiB, máximo 8 MiB.
- Arquivos não regulares ou links simbólicos são recusados. Em sistemas Unix, a leitura também solicita O_NOFOLLOW e verifica a identidade por fstat. Não há garantia de que diretórios ancestrais não sejam links simbólicos ou de ausência de condições de corrida em arquivos modificados simultaneamente.
- A entrada é decodificada em UTF-8 com rejeição de bytes inválidos e NUL, sem carregar binários como texto.
- YAML é interpretado em schema core, com rejeição de chaves duplicadas, documentos inválidos, tags desconhecidas e alias expansion desabilitada. Não utiliza interpretações de tags arbitrárias como função ou objeto executável.
- JSON/YAML com objetos não esperados ou profundidade/contagem de entradas excessivas retornam erro.
- O modo de produção é padrão; políticas de desenvolvimento são explícitas e **não** dispensam validação de TLS nem segredos fracos.
- Erros de leitura, parsing e políticas retornam **exit code 2**, não estado limpo.
- Sem dependência de chamadas externas ou banco de dados no runtime, além da biblioteca local de parsing YAML.

## Limitações

- A análise é **heurística**: não comprova que um sistema seja seguro, nem verifica execução real, RBAC, redes, infraestrutura, Kubernetes, helm, templates Jinja ou histórico Git.
- JSON com propriedades duplicadas pode ser interpretado pelo parser JSON padrão adotando a última propriedade; o programa não oferece rejeição de duplicatas JSON.
- Endereços de arquivos, chaves não convencionais e cenários de segredo dinâmico podem exigir revisão manual.
- A detecção de um segredo forte escrito em JSON/YAML indica possível credencial embutida; é informativa (severidade média) e exige análise contextual. Valores em .env não são automaticamente tratados como vazamento se forem fortes.
- Resultados com severidade abaixo do limiar escolhido podem coexistir com exit code 0. Revise o relatório completo em pipelines.
- A CLI omite de propósito caminhos de arquivo na saída, para evitar exposição desnecessária de diretórios sensíveis.
- Execute sobre cópias confiáveis e imutáveis quando os arquivos forem controlados por terceiros.
