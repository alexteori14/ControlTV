# Estrategia de Despliegue - ControlTV NOC

## 1. Opciones de Despliegue

La plataforma está diseñada con una arquitectura contenerizada y desacoplada, permitiendo tres modalidades principales de despliegue según la infraestructura del cliente:

1. **Docker Compose (Recomendada para centros de control locales / On-Premise)**
2. **Kubernetes (Para infraestructuras corporativas escaladas en alta disponibilidad)**
3. **Servidor Bare-Metal / VM (Node.js + PM2 + Nginx)**

---

## 2. Despliegue con Docker Compose (Producción On-Premise)

El archivo `docker-compose.yml` en la raíz orquesta el ecosistema completo con PostgreSQL 16 persistente, el backend Node.js y el frontend servido por Nginx de alto rendimiento.

### 2.1 Pasos de Despliegue
```bash
# 1. Clonar el repositorio en el servidor NOC
git clone <repo-url>
cd ControlTV

# 2. Configurar variables de entorno si es necesario
cp backend/.env.example backend/.env

# 3. Construir y levantar todos los contenedores en modo detached
docker compose up --build -d

# 4. Verificar salud de los contenedores
docker compose ps
docker compose logs -f backend
```

### 2.2 Puertos Expuestos
- `3000:80`: Consola Web Frontend (Nginx industrial)
- `5000:5000`: API REST y Hub WebSocket del Backend
- `9099:9099`: Socket emulador TCP Smart TV (para pruebas)
- `5432:5432`: Base de Datos PostgreSQL (con volumen persistente `pgdata`)

---

## 3. Despliegue Local Rápido de Desarrollo (Zero-Config)

Si se desea ejecutar la aplicación localmente en una estación de trabajo de ingeniería sin necesidad de Docker ni de instalar PostgreSQL previamente:

### Opción A (Orquestador en 1 Clic - Recomendada):
Desde la raíz del proyecto ejecutar:
```bash
npm start
```
*(O ejecutar `.\start.ps1` / doble clic a `start.bat`).* Esto verificará dependencias, levantará simultáneamente Backend y Frontend y abrirá el navegador en `http://localhost:3000`.

### Opción B (Manual en 2 Terminales):
```powershell
# 1. Iniciar el Backend (conmutará automáticamente al motor SQLite integrado)
cd backend
npm install
npm run dev

# 2. En otra terminal, iniciar el Frontend
cd frontend
npm install
npm run dev
```
La aplicación abrirá la interfaz en `http://localhost:3000` comunicándose con el backend en `http://localhost:5000`.

### Requisitos del Motor de Capturas de Pantalla:
El **Motor de Capturas de Pantalla de TV en Vivo** (`ScreenCaptureService`) está optimizado para funcionar sin dependencias nativas complejas de C++ (no requiere `node-canvas` ni compiladores externos en Windows/Linux), sirviendo fotogramas instantáneos en 1080p/4K sobre WebSockets y HTTP de forma ultraligera.

---

## 4. Matriz de Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`) | `production` |
| `PORT` | Puerto de escucha del servidor HTTP/WS | `5000` |
| `DB_TYPE` | Motor de base de datos (`postgres`, `sqlite`, `auto`) | `auto` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave criptográfica para firmas JWT | `<definir_secreta_segura>` |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `24h` |
| `HEARTBEAT_INTERVAL_MS` | Frecuencia de sondeo de telemetría de pantallas | `15000` (15 segundos) |
| `PING_TIMEOUT_MS` | Timeout de validación de enlace previo a comandos | `2500` ms |
| `SIMULATOR_PORT` | Puerto del servidor socket de pruebas | `9099` |

---

## 5. Estrategia de Red y Firewall en el NOC

1. **Aislamiento de VLAN IoT:** Se recomienda que las Smart TVs se ubiquen en una VLAN de pantallas dedicada (ej: `10.20.0.0/24`) y el servidor ControlTV tenga acceso enrutado únicamente a los puertos de control autorizados (`4352`, `1515`, `9761`, `80`, `443`, `23`).
2. **Habilitación de Broadcast UDP para Wake-on-LAN:** Si las pantallas están en subredes distintas a la del servidor ControlTV, los switches L3 deben tener configurado `ip helper-address` o directed broadcast para el puerto UDP 9 (WoL).
