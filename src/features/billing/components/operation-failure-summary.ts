/** Describe operational causes without rendering backend messages that may contain personal data. */
export function operationFailureSummary(details?: string) {
  if (!details) return "A execução falhou sem uma causa detalhada disponível.";
  if (/permission|unauthorized|forbidden|\b40[13]\b/i.test(details)) return "A rotina não conseguiu acessar um recurso necessário. Revise as permissões.";
  if (/timeout|timed out|ECONN|network|fetch failed/i.test(details)) return "A comunicação com um serviço não foi concluída. Confira a conexão e tente novamente.";
  if (/quota|storage|space|\b429\b/i.test(details)) return "Um limite de uso ou armazenamento impediu a conclusão. Revise a capacidade disponível.";
  if (/key|credential|token|oauth|configur/i.test(details)) return "Uma configuração de acesso precisa ser revisada antes de repetir a rotina.";
  return "A rotina encontrou um erro. Consulte os detalhes da execução para investigar.";
}
