# Contexto de la Plataforma — Incidencias App

## Arquitectura General

Stack: **React + TypeScript + Vite**, UI con **Ant Design**, framework de datos con **Refine**.

---

## Backend y Persistencia

### 1. API REST externa — `https://desarrollotecnologicoar.com/api3/`
Es el backend principal para el CRUD de incidencias. Refine lo consume con `dataProvider("https://desarrollotecnologicoar.com/api3")`.

| Ruta | Método | Descripción |
|---|---|---|
| `/incidencias` | GET / POST / PUT / DELETE | CRUD completo de incidencias (resource principal) |
| `/lideres_inmediatos/` | GET | Lista de líderes inmediatos (nombre, area, correo, id) |
| `/usuarios_permitidos/` | GET | Correos con permisos especiales (gerentes/líderes) |
| `/tabla_permisos` | (Refine resource) | Bandeja de entrada de permisos |

### 2. Firebase (proyecto: `incidencias-a781e`)
| Servicio | Uso |
|---|---|
| **Firebase Auth** | Autenticación de usuarios (email/password) |
| **Firestore** — colección `usuarios` | Perfil del usuario: nombre, apellido_paterno, apellido_materno, area, correo, fecha_creado |
| **Firebase Storage** (`gs://incidencias-a781e.firebasestorage.app`) | Adjuntos de incidencias (comprobantes, etc.) |
| **Cloud Functions** (`createUser`) | Crea usuarios en Auth + guarda perfil en Firestore sin afectar la sesión activa |

> Firestore NO almacena las incidencias — eso vive en la API REST externa.

---

## Estructura de Módulos

| Ruta App | Componente | Descripción |
|---|---|---|
| `/` | `inicio.tsx` | Home / Dashboard inicial |
| `/incidencias` | `list.tsx` | Lista de incidencias filtrada por área |
| `/incidencias/create` | `create.tsx` | Crear incidencia (POST a API) |
| `/incidencias/edit/:id` | `edit.tsx` | Editar incidencia |
| `/incidencias/show/:id` | `show.tsx` | Ver detalle de incidencia |
| `/actas` | `listado_actas.tsx` | Listado de actas generadas |
| `/impresion_acta` | `formato_acta.tsx` | Editor + generador de actas PDF |
| `/dashboard` | `dashboard.tsx` | Gráficas y métricas de incidencias |
| `/bandeja_entrada` | `bandeja_entrada.tsx` | Bandeja de permisos (solo líderes) |
| `/user_form` | `users_form.tsx` | Alta de usuarios |
| `/lideres` | `lideres.tsx` | Gestión de líderes inmediatos |
| `/create_permit` | `new_permit.tsx` | Crear nuevo permiso |

---

## Modelo de Datos — Incidencia (API REST)

```
id
marca_temporal       — fecha de creación (ISO string)
persona_emisor       — nombre del jefe/líder que emite
nombre_emisor        — nombre del trabajador afectado
jefe_inmediato       — jefe del trabajador
tipo_registro        — categoría de la incidencia
fecha_permiso        — fecha del evento
info_registro        — descripción libre
status_acta          — estado del acta
area                 — área del trabajador
downloadURL          — URL del adjunto en Firebase Storage
```

## Modelo de Datos — Usuario (Firestore `usuarios`)

```
nombre
apellido_paterno
apellido_materno
area
correo
fecha_creado
```

---

## Generación de Actas PDF

- Base: PDFs plantilla en `/public/` (`acta_españoles.pdf`, `acta_8julio.pdf`, etc.)
- Librería: `pdf-lib` — dibuja texto sobre el PDF con coordenadas absolutas
- Configuración de coordenadas por sede: `src/pages/impresion_actas/pdf_config.tsx`
- Campos dibujados: `fecha`, `hora`, `asunto`, `lider_recortado`, `lider_area`, `empleado`, `fecha_suceso`, `area`

---

## Cambios Realizados

### 1. Nombre del líder aparece completo en el acta (`formato_acta.tsx`)
**Problema:** La lógica de truncado `value.slice(0, value.indexOf('/'))` cortaba los nombres que no contenían `/` (devolvía -1, haciendo `slice(0,-1)` que borraba el último caracter).

**Fix:** Se eliminó el slicing destructivo. Ahora solo se reduce el tamaño de fuente:
- Longitud > 40 → tamaño 7
- Longitud > 30 → tamaño 8
- Normal → tamaño del config (10 por defecto)

### 2. "En su carácter de:" muestra "Jefe de [puesto]" (`formato_acta.tsx`)
**Problema:** El campo `lider_area` mostraba solo el nombre del área (ej. "Contabilidad y Finanzas").

**Fix:** Ahora se prefija automáticamente con `"Jefe de "`:
```ts
lider_area: actaValues.area_lider ? `Jefe de ${actaValues.area_lider}` : ""
```

### 3. Incidencias más recientes primero (`list.tsx`)
**Problema:** La lista de incidencias mostraba primero las más antiguas.

**Fix:** Se agregó función `sortByRecent` que ordena por `marca_temporal` descendente. Se aplica en ambas ramas de `filtrarDatos` (usuario con permisos especiales y usuario de área).

---

## Quick Wins Sugeridos

1. **Columna "Fecha" ordenable en la tabla de incidencias** — Agregar `sorter` en la columna `marca_temporal` de `list.tsx` para que el usuario pueda reordenar con click.

2. **Indicador de estado visual en la lista** — El campo `status_acta` ya tiene lógica de colores en `show.tsx` pero no se usa en `list.tsx`. Agregar una Badge/Tag de color en la columna de status mejoraría mucho la visibilidad.

3. **Paginación del lado del servidor** — Actualmente toda la data se carga en memoria y se pagina en el cliente. Si la cantidad de incidencias crece, esto puede ralentizar la app. Migrar a paginación con query params en la API sería una mejora de rendimiento importante.

4. **Mensajes de error más descriptivos** — Varios `catch` solo logean en consola. Agregar `message.error` con textos claros para el usuario en los flujos críticos (crear incidencia, generar PDF).

5. **Prefill del líder inmediato al abrir el acta** — Si el usuario autenticado es un líder, rellenar automáticamente el campo "Nombre del líder inmediato" con sus propios datos evitaría un paso manual.
