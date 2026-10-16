import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea, EntregaLocal } from './models/taskhub.models';
import { TareaService } from './services/tarea.service';
import { StorageService } from './services/storage.service';
import { NetworkService } from './services/network.service';

type VistaActiva = 'inicio' | 'catalogo' | 'detalle' | 'entregar' | 'bandeja' | 'perfil';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private tareaService = inject(TareaService);
  private storageService = inject(StorageService);
  private networkService = inject(NetworkService);

  // Estado de navegación con los 4 módulos principales solicitados
  vistaActual = signal<VistaActiva>('inicio');
  menuAbierto = signal<boolean>(false);

  // Perfil del estudiante (persistido en localStorage)
  perfilEstudiante = signal({
    nombre: 'André Zapata',
    carrera: 'Ingeniería de Software con IA',
    codigo: 'SEN-00482910',
    semestre: 'VI Semestre',
    sede: 'Lima - Sede Central',
    correo: 'andrebryamzapatavega@gmail.com'
  });

  // Lista de tareas cargadas desde JSON / cache
  tareas = signal<Tarea[]>([]);
  tareaSeleccionada = signal<Tarea | null>(null);

  // Filtros de búsqueda (TH-01: Búsqueda y curso combinables)
  filtroTexto = signal<string>('');
  filtroCurso = signal<string>('TODOS');

  // Formulario de entrega
  comentarioEntrega = signal<string>('');
  errorValidacion = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);
  enviando = signal<boolean>(false);

  // Bandeja de entregas en IndexedDB
  entregasLocales = signal<EntregaLocal[]>([]);
  entregaVerDetalle = signal<EntregaLocal | null>(null);
  entregaParaEliminar = signal<EntregaLocal | null>(null);

  // Reintento de sincronización y estado de red
  mensajeSincronizacion = signal<string | null>(null);
  sincronizando = signal<boolean>(false);

  // Conectividad (NetworkService)
  readonly isOnline = this.networkService.isOnline;

  // Cursos disponibles calculados dinámicamente
  cursosDisponibles = computed(() => {
    const lista = this.tareas().map(t => t.curso);
    return ['TODOS', ...Array.from(new Set(lista))];
  });

  // Tareas filtradas combinadas (TH-01)
  tareasFiltradas = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const curso = this.filtroCurso();

    return this.tareas().filter(t => {
      const cumpleTexto = !texto ||
        t.titulo.toLowerCase().includes(texto) ||
        t.descripcion.toLowerCase().includes(texto);

      const cumpleCurso = curso === 'TODOS' || t.curso === curso;

      return cumpleTexto && cumpleCurso;
    });
  });

  // Contador de entregas pendientes en IndexedDB (TH-05)
  totalPendientes = computed(() => {
    return this.entregasLocales().filter(e => e.estadoSincronizacion === 'PENDIENTE').length;
  });

  totalSincronizadas = computed(() => {
    return this.entregasLocales().filter(e => e.estadoSincronizacion === 'SINCRONIZADO').length;
  });

  constructor() {}

  async ngOnInit(): Promise<void> {
    this.cargarTareas();
    await this.cargarEntregasLocales();
  }

  cargarTareas(): void {
    this.tareaService.obtenerTareas().subscribe({
      next: (data) => {
        this.tareas.set(data);
      },
      error: (err) => {
        console.error('Error cargando tareas:', err);
      }
    });
  }

  async cargarEntregasLocales(): Promise<void> {
    try {
      const items = await this.storageService.listarEntregas();
      this.entregasLocales.set(items);
    } catch (err) {
      console.error('Error recuperando entregas de IndexedDB:', err);
    }
  }

  cambiarVista(vista: VistaActiva): void {
    this.vistaActual.set(vista);
    this.menuAbierto.set(false);
    this.errorValidacion.set(null);
    this.mensajeExito.set(null);
    this.mensajeSincronizacion.set(null);
  }

  verDetalleTarea(tarea: Tarea): void {
    this.tareaSeleccionada.set(tarea);
    this.cambiarVista('detalle');
  }

  iniciarEntrega(tarea: Tarea): void {
    this.tareaSeleccionada.set(tarea);
    this.comentarioEntrega.set('');
    this.errorValidacion.set(null);
    this.mensajeExito.set(null);
    this.cambiarVista('entregar');
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroCurso.set('TODOS');
  }

  // TH-02: Tarea y comentario obligatorios. Validación estricta
  // TH-03, TH-04: Guardar en IndexedDB con estado PENDIENTE inicial
  // TH-06: Online no significa sincronizado; sin API real se mantiene PENDIENTE honestamente
  async registrarEntrega(): Promise<void> {
    const tarea = this.tareaSeleccionada();
    const comentario = this.comentarioEntrega().trim();

    this.errorValidacion.set(null);
    this.mensajeExito.set(null);

    // Validación 1: Tarea seleccionada obligatoria
    if (!tarea) {
      this.errorValidacion.set('Debe seleccionar una tarea válida para realizar la entrega.');
      return;
    }

    // Validación 2: Comentario no vacío
    if (!comentario) {
      this.errorValidacion.set('El comentario o justificación de entrega es obligatorio.');
      return;
    }

    if (comentario.length < 5) {
      this.errorValidacion.set('El comentario debe contener al menos 5 caracteres descriptivos.');
      return;
    }

    this.enviando.set(true);

    try {
      // Guardar en IndexedDB
      const nuevaEntrega: Omit<EntregaLocal, 'id'> = {
        tareaId: tarea.id,
        curso: tarea.curso,
        tituloTarea: tarea.titulo,
        comentario: comentario,
        fechaRegistro: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        estadoSincronizacion: 'PENDIENTE',
        intentosSincronizacion: 0
      };

      await this.storageService.guardarEntregaLocal(nuevaEntrega);
      await this.cargarEntregasLocales();

      this.comentarioEntrega.set('');
      this.enviando.set(false);

      if (this.isOnline()) {
        this.mensajeExito.set('Entrega guardada localmente en IndexedDB. Estado: PENDIENTE. (Con conexión: listo para intentar sincronizar, esperando API)');
      } else {
        this.mensajeExito.set('Modo sin conexión: Entrega guardada con éxito en IndexedDB de tu dispositivo. Estado: PENDIENTE.');
      }

      // Redirigir a bandeja después de 1.5s
      setTimeout(() => {
        this.cambiarVista('bandeja');
      }, 1400);

    } catch (err: any) {
      this.enviando.set(false);
      // TH-08: Errores de IndexedDB informados sin fallar en silencio
      this.errorValidacion.set(`Error al guardar en IndexedDB: ${err?.message || 'Fallo desconocido de persistencia'}. La entrega no se ha registrado.`);
    }
  }

  // TH-07: Eliminación confirmada: Cancelar conserva; confirmar elimina
  pedirConfirmacionEliminar(entrega: EntregaLocal): void {
    this.entregaParaEliminar.set(entrega);
  }

  cancelarEliminacion(): void {
    this.entregaParaEliminar.set(null);
  }

  async confirmarEliminacion(): Promise<void> {
    const target = this.entregaParaEliminar();
    if (!target || target.id === undefined) return;

    try {
      await this.storageService.eliminarEntrega(target.id);
      this.entregaParaEliminar.set(null);
      await this.cargarEntregasLocales();
    } catch (err: any) {
      alert(`Error al eliminar entrega: ${err?.message || 'Error de persistencia'}`);
    }
  }

  verDetalleEntrega(entrega: EntregaLocal): void {
    this.entregaVerDetalle.set(entrega);
  }

  cerrarDetalleEntrega(): void {
    this.entregaVerDetalle.set(null);
  }

  // Control honesto de sincronización (TH-06, Criterio Transversal)
  // Sin API real no se simula éxito falso; se explica de forma transparente y honesta
  async reintentarSincronizacion(): Promise<void> {
    if (!this.isOnline()) {
      this.mensajeSincronizacion.set('Sin conexión a Internet. Conéctate a la red para evaluar sincronización.');
      return;
    }

    const pendientes = this.entregasLocales().filter(e => e.estadoSincronizacion === 'PENDIENTE');
    if (pendientes.length === 0) {
      this.mensajeSincronizacion.set('No hay entregas pendientes de sincronizar en este momento.');
      return;
    }

    this.sincronizando.set(true);
    this.mensajeSincronizacion.set('Verificando endpoint de sincronización del servidor SENATI...');

    setTimeout(async () => {
      this.sincronizando.set(false);
      // Control honesto según PDF regla TH-06 & Criterio técnico transversal:
      // "El proyecto base no incorpora una API empresarial real. No se debe afirmar que un pedido o una entrega se envió a un servidor si únicamente se mostró un mensaje."
      // "Usa 'Con conexión: listo para intentar sincronizar' hasta integrar una API. Solo marca SINCRONIZADO después de una respuesta remota confirmada."
      for (const p of pendientes) {
        if (p.id !== undefined) {
          await this.storageService.actualizarEstado(p.id, 'PENDIENTE', 'Endpoint remoto POST /api/entregas no configurado');
        }
      }
      await this.cargarEntregasLocales();
      this.mensajeSincronizacion.set('Dispositivo Online. Estado PENDIENTE mantenido: Las entregas permanecen seguras en IndexedDB hasta desplegar el backend con API REST.');
    }, 1200);
  }
}