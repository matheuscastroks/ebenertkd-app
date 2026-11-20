export interface TrainingLocation {
  id: string;
  name: string;
  address?: string;
  complement?: string;
  notes?: string;
  /** Coordenadas do local para o check-in por localização. */
  latitude?: number;
  longitude?: number;
  /** Raio aceito no check-in, em metros (padrão 150 m). */
  check_in_radius_m?: number;
  is_default?: boolean;
  created_at: string;
}
