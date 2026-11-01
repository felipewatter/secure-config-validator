# Changelog

## 1.1.0 — 2026-10-31

- Corrigida exposição de senhas/segredos em relatórios: resultados agora contêm apenas regra, classe de propriedade e linha .env.
- Regras agora analisam chaves e valores estruturados, evitando falsos positivos por buscas em linha completa.
- Suporte real a .env, JSON e YAML, incluindo estruturas aninhadas e listas de mapas.
- YAML com parse seguro, chaves duplicadas não permitidas e limitação de aliases; proteção de objetos contra chaves perigosas.
- Modo production/development explícito; detecção de debug, CORS permissivo, TLS desativado, cookies inseguros, credenciais fracas e segredos embutidos.
- CLI TypeScript/Node.js com saída JSON/texto, limiar de severidade e códigos 0/1/2 para automações.
- Validação de arquivos regulares, limite de tamanho, UTF-8 estrito, e rejeição de arquivos inválidos.
- Testes automatizados, documentação de segurança, CI em Node 22/24 para Linux/Windows/macOS e Dependabot.

## 1.0.0 — 2025-07-07

- Implementação inicial com expressões regulares sobre linhas sem parsing de JSON/YAML.
