# SENATI TaskHub PWA

**Reto 2:** Bandeja de entregas offline con validación y control honesto de estado  
**Carrera:** Escuela de Tecnologías de la Información - SENATI  
**Stack:** Angular 19 · TypeScript · Angular Service Worker (`ngsw`) · Cache Storage · IndexedDB  
**Instructor:** Jorge Luque Chambi  

---

## 1. Descripción del Proyecto

SENATI TaskHub PWA es una Aplicación Web Progresiva diseñada para estudiantes que necesitan gestionar actividades académicas y realizar entregas con garantías de persistencia incluso en condiciones de pérdida o ausencia total de conectividad a Internet.

### Características Principales Implementadas:
- **Catálogo Dinámico de Tareas:** Carga inicial desde `/data/tareas.json` cacheable mediante Angular Service Worker y fallback reactivo.
- **Búsqueda y Filtros Combinables (Regla TH-01):** Búsqueda por texto insensible a mayúsculas/minúsculas y filtro por curso simultáneos.
- **Formulario Validado (Regla TH-02):** Comprobación obligatoria de tarea seleccionada y comentario no vacío (mínimo 5 caracteres).
- **Persistencia en IndexedDB (Reglas TH-03, TH-04, TH-08):** Base de datos `TaskHubPWA_DB` con almacén `entregas_locales`, clave autoincrementable e índices para consultas rápidas. Estado inicial estricto: `PENDIENTE`.
- **Bandeja de Entregas Locales (Regla TH-05):** Contadores reactivos derivados directamente de los registros persistidos en `IndexedDB`.
- **Control Honesto de Sincronización (Regla TH-06 & Criterio Transversal):** La aplicación diferencia claramente entre *guardado local*, *pendiente de sincronización* y *sincronizado con servidor*. No genera falsos mensajes de éxito sin una API REST remota que retorne HTTP 200.
- **Eliminación Confirmada (Regla TH-07):** Modal de confirmación que conserva el registro al cancelar y lo elimina solo al confirmar.
- **Paleta y Diseño Visual Profesional:** Diseñado con modo oscuro técnico (azules oscuros institucionales SENATI, acentos ámbar y cian, bordes luminosos y tipografía *Plus Jakarta Sans* y *JetBrains Mono* sin exceso de blanco).

---

## 2. Comandos de Ejecución y Servidor

### A. Compilar para producción (con Service Worker activo):
```powershell
npm run build
```

### B. Servir la PWA en producción (puerto 8080):
```powershell
npx http-server ./dist/taller-pwa1/browser -p 8080 -c-1
```
*O con el comando de desarrollo:*
```powershell
npm start
```

---

## 3. Matriz de Cumplimiento de Reglas de Aceptación

| ID | Regla | Estado | Comportamiento Verificado |
|---|---|---|---|
| **TH-01** | Búsqueda y filtro combinables | Cumplido | Permite filtrar por curso y escribir texto a la vez. |
| **TH-02** | Tarea y comentario obligatorios | Cumplido | Muestra alertas específicas ante formulario incompleto o vacío. |
| **TH-03** | Entrega guarda tarea y fecha | Cumplido | Persiste `tareaId`, `curso`, `tituloTarea`, `comentario` y fecha en `IndexedDB`. |
| **TH-04** | Nueva entrega empieza PENDIENTE | Cumplido | Todo nuevo registro se inicializa en estado `PENDIENTE`. |
| **TH-05** | Contador derivado de registros | Cumplido | El contador de pendientes refleja la cantidad real en `IndexedDB`. |
| **TH-06** | Online no significa sincronizado | Cumplido | Muestra "Con conexión: listo para intentar sincronizar" sin simular éxito remoto falso. |
| **TH-07** | Eliminación confirmada | Cumplido | Modal interactivo: "Cancelar" conserva el registro; "Confirmar" lo elimina. |
| **TH-08** | Errores de IndexedDB informados | Cumplido | Notificaciones visuales ante cualquier fallo de lectura o escritura. |

---

## 4. Respuestas a la Guía de Reflexión (Sección I)

1. **¿Por qué una entrega debe persistir tras recargar el navegador?**  
   Porque en escenarios reales de movilidad o conectividad inestable, el estudiante puede perder la pestaña o el dispositivo puede apagarse. Al persistir en `IndexedDB`, el registro no se pierde y queda listo para sincronizarse cuando haya red.
2. **¿Qué campos relacionan la entrega con su tarea?**  
   Principalmente `tareaId` (identificador numérico único de la tarea) complementado con `curso` y `tituloTarea` para trazabilidad inmediata.
3. **¿Qué riesgo hay al reintentar sincronizar varias veces?**  
   El riesgo de crear entregas duplicadas en la base de datos central. Esto se previene enviando un identificador idempotente (`id` local o UUID) y controlando el campo `intentosSincronizacion`.
4. **¿Qué validaciones debe repetir el servidor al integrar una API?**  
   El backend debe volver a validar que la tarea existe, que la fecha de entrega esté dentro del plazo académico permitido, longitud y sanitización del comentario para prevenir inyecciones (OWASP), y verificar la identidad del alumno autenticado.
