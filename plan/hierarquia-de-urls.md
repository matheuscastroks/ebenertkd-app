# Hierarquia de URLs do Portal

## Estrutura definida

```text
/
├── recuperar/
├── admin/
│   ├── matriculas/
│   │   └── [studentId]/
│   └── turmas/
├── aluno/
│   └── matricula/
└── responsavel/
    └── dependentes/
        └── [profileId]/
            └── matricula/
```

## Implementação

- [x] Consolidar aluno adulto e menor sob `/aluno`.
- [x] Mover a matrícula própria para `/aluno/matricula`.
- [x] Separar visão geral e gestão de dependentes do responsável.
- [x] Criar matrícula contextual em `/responsavel/dependentes/[profileId]/matricula`.
- [x] Renomear `/admin/alunos` para `/admin/matriculas`.
- [x] Atualizar sidebar, links, redirects de ações e revalidações.
- [x] Adicionar redirects permanentes para URLs antigas.
- [x] Atualizar testes de resolução de dashboard.
- [x] Validar testes, lint, TypeScript e build.
