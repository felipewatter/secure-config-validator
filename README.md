# Secure Config Validator

[![CI](https://github.com/felipewatter/secure-config-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/felipewatter/secure-config-validator/actions/workflows/ci.yml)

CLI de validação **offline** de configurações para projetos Node.js e outras aplicações. Identifica sinais de configuração insegura em arquivos **.env, .json, .yaml e .yml**, sem executar configurações, consultar a Internet ou imprimir os valores sensíveis encontrados.

## O que mudou na versão 1.1.0

Antes a ferramenta executava regex em linhas inteiras e imprimia os valores que contivessem segredos. Agora a análise usa estruturas de dados e relatórios redigidos.

- **DEBUG em produção:** modo de depuração explicitamente habilitado.
- **CORS permissivo:** `ALLOW_ALL_ORIGINS=true` ou `CORS_ORIGIN=*`.
- **TLS inseguro:** `NODE_TLS_REJECT_UNAUTHORIZED=0`, `TLS_VERIFY=false` e chaves equivalentes. Esta regra continua ativa no modo development.
- **Cookies em produção:** `COOKIE_SECURE=false` ou `COOKIE_HTTP_ONLY=false` e equivalentes.
- **Segredos fracos:** placeholders como `changeme`, `12345`, `password` e valores muito curtos em chaves relacionadas a credenciais.
- **Credenciais embutidas:** valores fortes em chaves sensíveis de JSON/YAML recebem alerta de severidade média; em .env não são automaticamente classificados como vazamento.

A validação de propriedades é por chave, não por substrings em comentários ou em outros valores. Ao contrário de scanners de segredos genéricos, este projeto é focado em **configurações explicitamente inseguras**.

## Requisitos e instalação

Requer Node.js **22 ou 24**, npm; usa o parser YAML do pacote `yaml`, sem depender de serviços online.

```bash
git clone https://github.com/felipewatter/secure-config-validator.git
cd secure-config-validator
npm install
npm run build
node dist/bin/index.js --help
```

Instalação global opcional após compilar: `npm install -g .`.

**A versão aqui descrita não está necessariamente publicada no registro npm**. Prefira utilizar o checkout e o binário compilado.

## Exemplos

```bash
node dist/bin/index.js ./config/.env.production
node dist/bin/index.js ./config/settings.json --format json
node dist/bin/index.js ./deployment/config.yaml --fail-on medium
node dist/bin/index.js ./config/settings.yml --mode development
node dist/bin/index.js --path ./config/.env --max-file-bytes 1048576
```

| Opção | Padrão | Descrição |
|---|---|---|
| Arquivo ou `--path FILE` | obrigatório | Arquivo de configuração |
| `--mode production\|development` | production | Contexto das políticas |
| `--format text\|json` | text | Saída legível ou estruturada |
| `--fail-on none\|medium\|high\|critical` | high | Limiar de falha da execução |
| `--max-file-bytes N` | 1048576 | Tamanho máximo: 1 KiB a 8 MiB |
| `--help`, `--version` | — | Ajuda e versão |

### Códigos de saída

- **0** — análise concluída sem achados **no limiar escolhido** (podem existir avisos de severidade menor).
- **1** — achados no limiar escolhido ou acima dele.
- **2** — erro operacional, entrada inválida ou inspeção incompleta. **Não significa seguro**.

Exemplo de saída (não contém valores):

```text
Secure Config Validator v1.1.0
Format: env | Mode: production | Checked keys: 2
[HIGH] debug-enabled (DEBUG):1
[HIGH] weak-credential (PASSWORD):2
Total findings: 2 | Threshold passed: false
```

## Detalhes dos formatos

- **.env:** aceita `KEY=value`, `export KEY=value`, comentários, aspas simples e duplas; rejeita atribuições malformadas e duplicadas. Não executa substituição de variáveis.
- **JSON:** percorre chaves aninhadas e objetos dentro de arrays. O parser JSON padrão **não detecta chaves duplicadas**.
- **YAML:** schema core, chaves duplicadas recusadas, tags desconhecidas e expansão por aliases não permitidas. Não interpreta objetos especiais e não segue arquivos externos.

Algumas configurações complexas de Helm, Kubernetes ou templates podem usar sintaxes fora desse subconjunto. Nesse caso, a CLI retorna erro operacional e recomenda avaliação por ferramenta específica.

## Qualidade

```bash
npm run typecheck
npm test
npm pack --dry-run
```

O GitHub Actions executa Node 22/24 em Ubuntu, Windows e macOS e inclui compilação, testes, empacotamento e auditoria de dependências.

## Segurança e limites

A ferramenta avalia sinais estáticos, não garante conformidade nem segurança operacional completa. Não substitui análise de configurações reais em produção, políticas de deploy ou ferramentas especializadas como SAST/SCA.

**Privacidade:** as mensagens de erro e relatórios nunca devem incluir trechos ou valores de configuração. A ferramenta não imprime caminhos de arquivos em seus resultados padrão.

Consulte [SECURITY.md](SECURITY.md), [CHANGELOG.md](CHANGELOG.md) e a licença MIT.
