# Artextilo

Sistema web para la gestión administrativa de Artextilo. Centraliza la operación
de sucursales, personal, productos, inventario, pedidos, pagos y caja en una
interfaz única.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Node.js + Express 5 |
| Base de datos | MySQL 8 / MariaDB 11 |
| Frontend | React 19 + Vite 8 |
| Estilos | Tailwind CSS 4 |
| Validación | Zod 4 |
| Cliente HTTP | Fetch API |

## Requisitos

- **Node.js 22 o superior** (probado con Node 26).
- **npm 10 o superior**.
- **Docker y Docker Compose** si vas a levantar la base localmente. También puedes
  usar la base de datos compartida por el equipo.

## Estructura del repositorio

```text
.
├── backend/
│   ├── src/
│   │   ├── config/          # Conexión a MySQL
│   │   ├── lib/             # Utilidades y errores de la API
│   │   ├── middlewares/     # Manejo centralizado de errores
│   │   ├── modules/
│   │   │   ├── caja/        # Cortes, apertura, cierre y pagos
│   │   │   ├── categorias/
│   │   │   ├── clientes/
│   │   │   ├── empleados/
│   │   │   ├── inventario/
│   │   │   ├── pedidos/     # Pedidos, pagos, estados y cancelaciones
│   │   │   ├── productos/
│   │   │   ├── roles/
│   │   │   └── sucursales/
│   │   ├── routes/          # Agregador de rutas /api
│   │   ├── app.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP y endpoints
│   │   ├── components/      # Layout, modales, botones, campos
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/           # Vistas de la aplicación
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── database/
│   ├── schema.sql           # Esquema v2.0
│   └── seed.sql             # Datos iniciales
├── docker-compose.yml
├── package.json
└── README.md
```

## Puesta en marcha

### 1. Base de datos

**Opción A — Docker (recomendada para desarrollo local):**

```bash
docker compose up -d
```

Esto levanta MariaDB 11 en `localhost:3307`, crea la base `artextilo_db` y
ejecuta `database/schema.sql` y `database/seed.sql` la primera vez.

Credenciales por defecto:

| Variable | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Puerto | `3307` |
| Base | `artextilo_db` |
| Usuario | `artextilo` |
| Contraseña | `artextilo` |

> También puedes usar la imagen `elisasc/artextilo-v2:2.1`, que ya incluye el
> esquema v2.0 y los valores globales. Publícala en el puerto `3307` y crea el
> usuario `artextilo` con permisos sobre `artextilo_db`.
>
> Si ya tienes un contenedor escuchando en el puerto `3307`, deténlo antes de
> ejecutar `docker compose up` para evitar conflictos de puerto.

Para verificar que la base esté lista:

```bash
docker compose ps
```

**Opción B — Base de datos del equipo:**

Si ya tienes acceso a la instancia compartida, configura `backend/.env` con esos
datos y omite el paso de Docker. Asegúrate de que el esquema v2.0 ya esté
importado.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

La API queda disponible en `http://localhost:4000`.

Prueba rápida:

```bash
curl http://localhost:4000/api/health
```

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

El servidor de Vite redirige las peticiones `/api` al backend en el puerto
`4000`, por lo que no necesitas configurar nada adicional en desarrollo.

### Instalación desde la raíz

También puedes instalar y ejecutar ambos proyectos con los scripts de la raíz:

```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```

## Variables de entorno

Archivo `backend/.env` (basado en `backend/.env.example`):

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `PORT` | Puerto del backend | `4000` |
| `CLIENT_ORIGIN` | Origen permitido por CORS (puede ser una lista separada por comas) | `http://localhost:5173,http://127.0.0.1:5173` |
| `DB_HOST` | Host de MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto de MySQL | `3307` |
| `DB_USER` | Usuario de la base | `artextilo` |
| `DB_PASSWORD` | Contraseña de la base | `artextilo` |
| `DB_NAME` | Nombre de la base | `artextilo_db` |

El archivo `.env` está ignorado por Git. Nunca subas credenciales reales al
repositorio. Si tu copia ya tenía `backend/.env` versionado, elimínalo del
índice una sola vez con `git rm --cached backend/.env`; el archivo local puede
seguir existiendo sin ser rastreado.

El frontend acepta una variable opcional `VITE_API_URL` (archivo
`frontend/.env`). En desarrollo no es necesaria: el valor por defecto es `/api`
y Vite se encarga del proxy. Para un despliegue separado, apunta esa variable a
la URL pública de la API, por ejemplo `https://api.artextilo.com/api`.

## API

Todas las rutas están bajo el prefijo `/api`.

### Organización de la API

El backend está organizado por módulos. Cada módulo tiene cuatro archivos:

```text
backend/src/modules/<modulo>/
├── <modulo>.routes.js      # Define las rutas y los métodos HTTP
├── <modulo>.controller.js  # Recibe la petición y devuelve la respuesta
├── <modulo>.service.js     # Consultas a la base de datos y reglas de negocio
└── <modulo>.schema.js      # Validación de datos con Zod
```

El agregador de rutas está en `backend/src/routes/index.js`. Ahí se monta cada
módulo bajo `/api`:

```js
router.use('/roles', rolesRoutes);
router.use('/sucursales', sucursalesRoutes);
router.use('/caja', cajaRoutes);
router.use('/pedidos', pedidosRoutes);
```

Para **ver o editar un endpoint**:

1. Busca la ruta en `backend/src/modules/<modulo>/<modulo>.routes.js`.
2. Revisa el controlador asociado en `<modulo>.controller.js`.
3. La lógica de base de datos está en `<modulo>.service.js`.
4. Las reglas de validación están en `<modulo>.schema.js`.

Ejemplo: para agregar `GET /api/roles/:id`, la ruta ya existe en
`backend/src/modules/roles/roles.routes.js`; el controlador `show` está en
`roles.controller.js` y la consulta `getRole` en `roles.service.js`.

En el frontend, las llamadas están separadas por módulo:

- `frontend/src/api/client.js`: cliente HTTP base.
- `frontend/src/api/caja.js`: endpoints de cortes de caja.
- `frontend/src/api/pedidos.js`: endpoints de pedidos y pagos.
- `frontend/src/api/roles.js`: endpoints de roles.
- `frontend/src/api/sucursales.js`: endpoints de sucursales.
- `frontend/vite.config.js`: proxy `/api` hacia el backend en desarrollo.

### Salud

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica que la API esté en ejecución |

### Sucursales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/sucursales?search=` | Lista sucursales activas |
| `GET` | `/api/sucursales/:id` | Obtiene una sucursal |
| `POST` | `/api/sucursales` | Crea una sucursal |
| `PUT` | `/api/sucursales/:id` | Actualiza una sucursal |
| `DELETE` | `/api/sucursales/:id` | Aplica borrado lógico |

Payload de ejemplo:

```json
{
  "nombre": "Sucursal Norte",
  "direccion": "Av. Madero 456, Col. Centro",
  "codigo_postal": "58000",
  "telefono": "4431234567",
  "horario": "Lunes a sábado de 9:00 a 19:00"
}
```

### Roles

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/roles?search=` | Lista roles activos |
| `GET` | `/api/roles/:id` | Obtiene un rol |
| `POST` | `/api/roles` | Crea un rol |
| `PUT` | `/api/roles/:id` | Actualiza un rol |
| `DELETE` | `/api/roles/:id` | Aplica borrado lógico |

Payload de ejemplo:

```json
{
  "nombre": "Almacenista",
  "descripcion": "Control de inventario y recepción de mercancía"
}
```

### Caja

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/caja?estado=&id_sucursal=&id_empleado=&search=` | Lista cortes de caja |
| `GET` | `/api/caja/abierta?id_empleado=` | Consulta la caja abierta de un empleado |
| `GET` | `/api/caja/:id` | Obtiene un corte con sus pagos y devoluciones |
| `POST` | `/api/caja/abrir` | Abre un turno de caja |
| `POST` | `/api/caja/:id/cerrar` | Cierra el turno y calcula la diferencia |
| `GET` | `/api/caja/:id/pagos` | Lista los pagos asociados al corte |

Payload de apertura:

```json
{
  "id_empleado": 2,
  "id_sucursal": 1,
  "fondo_inicial": 200,
  "descripcion": "Turno matutino"
}
```

Payload de cierre:

```json
{
  "saldo_real": 650,
  "descripcion": "Cierre sin diferencias"
}
```

### Pedidos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/pedidos?search=&estado=&estado_pago=&id_sucursal=&id_cliente=` | Lista y filtra pedidos |
| `GET` | `/api/pedidos/stats` | Totales de pedidos, ventas y saldo por cobrar |
| `GET` | `/api/pedidos/:id` | Obtiene el detalle con productos, servicios, pagos y devoluciones |
| `POST` | `/api/pedidos` | Crea un pedido, descuenta inventario y registra el pago inicial opcional |
| `POST` | `/api/pedidos/:id/pagos` | Registra un pago posterior |
| `PATCH` | `/api/pedidos/:id/estado` | Avanza el estado del pedido |
| `POST` | `/api/pedidos/:id/cancelar` | Cancela, devuelve inventario y registra la devolución |

Payload de creación (el pago inicial es opcional):

```json
{
  "id_cliente": 1,
  "id_empleado": 2,
  "id_sucursal": 1,
  "productos": [{ "id_producto": 1, "cantidad": 2 }],
  "servicios": [
    {
      "tipo": "bordado",
      "descripcion": "Iniciales en camisa",
      "cantidad": 1,
      "precio": 150
    }
  ],
  "descuento_tipo": "ninguno",
  "pago_inicial": {
    "monto": 450,
    "metodo_pago": "efectivo",
    "id_empleado": 2
  }
}
```

Reglas principales:

- El anticipo mínimo es el 50% del total o el total completo; si no se cobra
  al crear, el pedido queda pendiente y se puede cobrar después.
- El descuento de mayoreo se aplica desde 12 piezas con 10% (valores en
  `global_values`).
- El descuento manual requiere motivo y empleado autorizador.
- Los pagos se asocian a una caja abierta del empleado que los recibe.
- La cancelación devuelve las piezas al inventario y permite registrar una
  devolución en efectivo o transferencia.

### Formato de respuesta

Listados:

```json
{
  "data": []
}
```

Creación y actualización:

```json
{
  "data": {},
  "message": "Rol creado correctamente"
}
```

Errores de validación:

```json
{
  "error": "Datos inválidos",
  "details": [
    { "field": "nombre", "message": "El nombre es obligatorio" }
  ]
}
```

## Base de datos

El proyecto utiliza el esquema **v2.0** de Artextilo. Algunas consideraciones:

- El borrado es lógico: se usa `deleted_at` y las consultas excluyen los
  registros con `deleted_at` distinto de `NULL`.
- `rol.nombre` y `sucursal.nombre` **no tienen restricción `UNIQUE`** en la base;
  por eso la API valida duplicados antes de insertar o actualizar.
- Los campos de auditoría `created_by`, `updated_by` y `deleted_by` son
  opcionales y pueden permanecer en `NULL`.
- Los valores de mayoreo y anticipo se leen de `global_values`.
- El archivo `database/schema.sql` incluye `DROP DATABASE` y `CREATE DATABASE`.
  No lo ejecutes sobre una base con datos que quieras conservar; está pensado
  para instalaciones limpias o para el contenedor de desarrollo.

Para reiniciar la base local desde cero:

```bash
docker compose down -v
docker compose up -d
```

> `down -v` elimina el volumen de datos. Úsalo solo en desarrollo.

## Scripts

Desde la raíz:

| Comando | Descripción |
| --- | --- |
| `npm run install:all` | Instala dependencias de backend y frontend |
| `npm run dev:backend` | Inicia el backend en modo desarrollo |
| `npm run dev:frontend` | Inicia el frontend en modo desarrollo |
| `npm run build:frontend` | Genera el build de producción del frontend |

Desde `backend/`:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia la API con recarga automática |
| `npm start` | Inicia la API en modo producción |

Desde `frontend/`:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en desarrollo |
| `npm run build` | Genera el build en `dist/` |
| `npm run preview` | Previsualiza el build |

## Solución de problemas

**El backend no conecta a MySQL**

- Verifica que el contenedor esté saludable: `docker compose ps`.
- Revisa que `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en
  `backend/.env` coincidan con tu instancia.
- Si usas la base del equipo, confirma que tu red permita la conexión.

**El puerto 3307 ya está ocupado**

Cambia el mapeo en `docker-compose.yml` y actualiza `DB_PORT` en
`backend/.env` con el puerto que elijas.

**El puerto 4000 ya está ocupado**

Cambia `PORT` en `backend/.env` y el `target` del proxy en
`frontend/vite.config.js`.

**Error de CORS**

Agrega el origen exacto del frontend en `CLIENT_ORIGIN`. Puedes separar varios
orígenes con comas.

**El frontend muestra "No se pudo conectar con el servidor"**

Confirma que el backend esté corriendo en `http://localhost:4000` y que
`/api/health` responda.

## Flujo de trabajo con Git

- Trabaja en una rama por módulo o funcionalidad.
- No subas `node_modules/`, `dist/` ni archivos `.env`.
- Abre un Pull Request hacia `main` cuando el módulo esté probado.
- Mantén los cambios de base de datos y de API documentados en el PR.
