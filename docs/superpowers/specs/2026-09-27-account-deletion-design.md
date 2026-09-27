# Especificação Técnica: Exclusão Irreversível de Contas (Aluno e Admin)

**Data:** 2026-09-27  
**Status:** Aprovado  
**Escopo:**
- Autoexclusão do aluno/usuário em `/configuracoes` (Zona de Perigo).
- Exclusão administrativa pelo professor/admin em `/admin/alunos/acessos` e `/admin/matriculas/[studentId]`.
- Popup de confirmação com aviso de irreversibilidade e digitação obrigatória de `EXCLUIR`.

---

## 1. Regras de Negócio e Segurança

1. **Autoexclusão (Aluno/Usuário)**:
   - Qualquer aluno adulto ou responsável pode solicitar a exclusão de sua própria conta em `/configuracoes`.
   - **Trava de Segurança Admin**: O usuário administrador (`role === "admin"`) não pode se autoexcluir por essa rota.
   - **Fluxo de Expurgo**:
     - Remove o usuário do Appwrite Auth (`users.delete(account_id)`), invalidando imediatamente tokens e sessões.
     - Marca o perfil como `status: "disabled"` no banco de dados.
     - Anonimiza dados pessoais de contato (e-mail vira `excluido_{id}@removido.local`, telefone/whatsapp apagados).
     - Revoga vínculos em `guardian_student_links`.
     - Limpa o cookie de sessão HTTP e redireciona para `/` com mensagem de confirmação.

2. **Exclusão Administrativa (Professor/Admin)**:
   - O professor/admin pode excluir a conta de qualquer aluno em `/admin/alunos/acessos` ou na página de detalhes da matrícula.
   - **Trava de Segurança**: O professor não pode excluir a si mesmo nem outros administradores.
   - **Fluxo**:
     - Remove o aluno do Appwrite Auth (`users.delete`).
     - Desativa o perfil e cancela matrículas ativas em turmas.
     - Atualiza a visualização do painel em tempo real via `revalidatePath`.

3. **Salvaguarda de Confirmação (UI Popup)**:
   - Componente de diálogo modal (`AlertDialog`) com tema destrutivo.
   - Alerta em destaque: *"Esta ação é permanente e irreversível."*
   - Explicação clara dos impactos (perda de histórico, certificados, acesso a aulas e login).
   - Campo de entrada (`<Input>`) exigindo que o usuário digite a palavra exata **`EXCLUIR`** (em maiúsculas) para habilitar o botão vermelho de confirmação.

---

## 2. Arquitetura da Solução

### 2.1 Camada de Serviço (`src/features/auth/account-deletion-service.ts`)
- `deleteSelfAccount(actor: Profile): Promise<{ success: boolean; error?: string }>`
- `deleteStudentAccount(admin: Profile, targetProfileId: string): Promise<{ success: boolean; error?: string }>`

### 2.2 Server Actions (`src/app/actions/account-deletion.ts`)
- `deleteSelfAccountAction(formData: FormData)`: Valida sessão atual, executa expurgo e destrói cookies de sessão.
- `deleteStudentAccountAction(targetProfileId: string)`: Valida perfil de admin e aciona serviço de exclusão.

### 2.3 Componentes de UI
- `src/features/auth/components/delete-account-dialog.tsx`: Diálogo com campo de confirmação `EXCLUIR` e botão destrutivo.
- `src/features/auth/components/danger-zone-card.tsx`: Card vermelho/destrutivo inserido em `/configuracoes`.
- `src/features/students/components/admin-delete-student-dialog.tsx`: Botão de lixeira na tabela de acessos (`StudentAccessTable`) e diálogo de confirmação.

---

## 3. Testes e Validação
- Testes unitários do serviço de exclusão (vitest).
- Testes de componente do diálogo com verificação de bloqueio/desbloqueio do botão com `EXCLUIR`.
- Verificação de proteção do admin (não permitir autoexclusão).
- Verificação de limpeza de sessão.
