export interface Tarea {
  id: number;
  titulo: string;
  curso: string;
  descripcion: string;
  fechaEntrega: string;
  estadoAcademico: 'PENDIENTE' | 'EN_PROGRESO' | 'ENTREGADO';
  archivosAdjuntos?: string[];
  instrucciones?: string;
}

export type EstadoSincronizacion = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface EntregaLocal {
  id?: number;
  tareaId: number;
  curso: string;
  tituloTarea: string;
  comentario: string;
  fechaRegistro: string;
  estadoSincronizacion: EstadoSincronizacion;
  intentosSincronizacion: number;
  ultimoError?: string;
}
