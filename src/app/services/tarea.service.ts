import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Tarea } from '../models/taskhub.models';

const TAREAS_FALLBACK: Tarea[] = [
  {
    id: 1,
    titulo: 'Implementar PWA con App Manifest, Service Worker e IndexedDB',
    curso: 'Desarrollo Web - Módulo 3',
    descripcion: 'Configurar manifiesto de aplicación, registrar Angular Service Worker (ngsw) para modo offline y almacenar entregas locales estructuradas en IndexedDB con soporte de reintento.',
    fechaEntrega: '2026-10-25',
    estadoAcademico: 'PENDIENTE',
    archivosAdjuntos: ['guia-pwa-senati.pdf', 'rubrica-evaluacion.pdf'],
    instrucciones: 'Crear interfaz responsive PWA, validar entradas, guardar entregas en IndexedDB y probar escenarios sin red.'
  },
  {
    id: 2,
    titulo: 'Práctica 2: Configuración de Router y Enrutamiento Dinámico',
    curso: 'Redes y Comunicaciones',
    descripcion: 'Diseño de topología de red en IPv4 e IPv6 con switches gestionables y enrutamiento estático redundante.',
    fechaEntrega: '2026-10-28',
    estadoAcademico: 'EN_PROGRESO',
    archivosAdjuntos: ['topologia-pkt.pkt'],
    instrucciones: 'Subir informe técnico en PDF y capturas de ping y traceroute comprobando conectividad.'
  },
  {
    id: 3,
    titulo: 'Modelado Entidad-Relación y Normalización 3FN',
    curso: 'Base de Datos',
    descripcion: 'Elaborar diagrama conceptual, lógico y físico para sistema transaccional de facturación electrónica.',
    fechaEntrega: '2026-10-30',
    estadoAcademico: 'PENDIENTE',
    archivosAdjuntos: ['script-inicial.sql'],
    instrucciones: 'Presentar script SQL con llaves primarias, foráneas e índices optimizados.'
  },
  {
    id: 4,
    titulo: 'Seguridad en Aplicaciones y Directivas OWASP Top 10',
    curso: 'Seguridad Informática',
    descripcion: 'Auditoría de vulnerabilidades XSS, CSRF, inyección SQL y remediación con CSP y sanitización.',
    fechaEntrega: '2026-11-02',
    estadoAcademico: 'PENDIENTE',
    archivosAdjuntos: ['checklist-owasp.pdf'],
    instrucciones: 'Documentar evidencias del escaneo y código corregido.'
  },
  {
    id: 5,
    titulo: 'Despliegue Continuo con Docker y Pipelines CI/CD',
    curso: 'Desarrollo Web - Módulo 3',
    descripcion: 'Contenerización de aplicación frontend con NGINX y automatización de pruebas con GitHub Actions.',
    fechaEntrega: '2026-11-05',
    estadoAcademico: 'PENDIENTE',
    archivosAdjuntos: ['Dockerfile', 'nginx.conf'],
    instrucciones: 'Asegurar que la imagen construida no supere los 50MB y pase los healthchecks.'
  }
];

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private cacheKey = 'senati-taskhub-tareas-cache';

  constructor(private http: HttpClient) {}

  obtenerTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>('/data/tareas.json').pipe(
      tap((tareas) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(this.cacheKey, JSON.stringify(tareas));
          }
        } catch (e) {
          console.warn('No se pudo guardar tareas en localStorage', e);
        }
      }),
      catchError((error) => {
        console.warn('Error al cargar /data/tareas.json por HTTP, usando caché o fallback:', error);
        if (typeof window !== 'undefined' && window.localStorage) {
          const cached = localStorage.getItem(this.cacheKey);
          if (cached) {
            try {
              return of(JSON.parse(cached) as Tarea[]);
            } catch {
              // ignore
            }
          }
        }
        return of(TAREAS_FALLBACK);
      })
    );
  }

  obtenerTareaPorId(id: number): Observable<Tarea | undefined> {
    return new Observable((subscriber) => {
      this.obtenerTareas().subscribe({
        next: (tareas) => {
          const encontrada = tareas.find(t => t.id === id);
          subscriber.next(encontrada);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }
}
