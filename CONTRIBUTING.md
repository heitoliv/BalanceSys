
# 🤝 Guia de Contribuição — Projeto de PS

Obrigado por colaborar com o projeto! Este documento descreve como contribuir, criar tarefas, organizar branches e manter o repositório limpo e profissional.

---

## ✔ 1. Criando Tarefas (Issues)
Todas as atividades devem ser registradas como **Issues**.

### Cada Issue deve conter:
- Título claro
- Descrição detalhada da tarefa
- Checklist (se necessário)
- Responsável
- Labels
- Sprint relacionada

### Exemplo:
```
Título: Criar protótipo da tela de login

Descrição:
- [ ] Criar layout no Figma
- [ ] Validar com o grupo
- [ ] Salvar no diretório /design

Responsável: @usuario
Labels: design, feature
Sprint: Sprint 1
```

---

## ✔ 2. Padrão de Branches
Crie sempre uma branch a partir de `dev`.

Padrões:
```
feature/nome-da-feature
fix/ajuste-especifico
doc/alteracao-documentacao
hotfix/correcao-urgente
```

Exemplos:
- feature/cadastro-usuario
- fix/erro-validação-email
- doc/relatorio-sprint1

---

## ✔ 3. Padrão de Commits
Utilize mensagens curtas e descritivas:
```
feat: adiciona módulo de login
fix: corrige erro ao salvar usuário
docs: adiciona documentação da sprint
style: ajusta formatação do código
refactor: reorganiza funções
```

---

## ✔ 4. Pull Requests (PR)
Após concluir uma tarefa:
1. Suba sua branch
2. Crie um Pull Request para `dev`
3. Preencha o template
4. Aguarde revisão
5. Não faça merge sem aprovação

Checklist do PR:
- Código testado
- Issue relacionada informada
- Prints adicionados (quando aplicável)

---

## ✔ 5. Revisão de Código
Ao revisar um PR, verifique:
- Funcionamento correto
- Código limpo e organizado
- Comentários desnecessários removidos
- Impacto em outros módulos
- Documentação atualizada

---

## ✔ 6. Organização das Sprints
Cada sprint deve conter:
- Issues planejadas
- Atualização no Kanban
- Relatório em `/docs/sprint-X`
- Retrospectiva

---

## ✔ 7. Documentação
Mantenha no diretório `/docs`:
- Diagramas UML
- Requisitos
- Backlog
- Relatórios
- Decisões (ADR)
- Atas

---

## ✔ 8. Boas Práticas
- Não commitar arquivos desnecessários
- Fazer pull antes de iniciar nova tarefa
- Manter a comunicação no grupo
- Explicar alterações importantes no PR
- Garantir que o código funcione antes de enviar

---

## ✔ 9. Dúvidas
Use Discussões ou contato direto com a equipe.

Obrigado por colaborar e manter o projeto organizado! 🚀
