/** Rota autenticada que serve a foto de perfil do aluno (documento `profile_photo`). */
export function studentPhotoUrl(photoDocumentId?: string | null) {
  return photoDocumentId ? `/api/student-documents/${photoDocumentId}` : undefined;
}

/** Pessoa resumida para grupos de avatares; compatível com `AvatarGroup`. */
export type PersonPreview = { name: string; imageUrl?: string };

/** Pessoa resumida com o id do documento da foto, para linhas que usam `StudentAvatar`. */
export type StudentPreview = PersonPreview & { photoDocumentId?: string };
