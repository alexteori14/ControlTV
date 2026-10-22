# Buenas Prácticas de Seguridad - ControlTV NOC

## 1. Modelo de Control de Acceso Basado en Roles (RBAC)

Para garantizar el principio de menor privilegio, el sistema implementa tres perfiles jerárquicos estrictos:

| Funcionalidad / Módulo | ADMIN | SUPERVISOR | OPERADOR |
| :--- | :---: | :---: | :---: |
| **Control Remoto (Encender, Apagar, Volumen, Entrada, Teclado)** | Sí | Sí | Sí |
| **Motor de Capturas de TV (Automática y Manual)** | Sí | Sí | Sí |
| **Descarga de Fotogramas de Captura (PNG / SVG)** | Sí | Sí | Sí |
| **Ver Telemetría y Dashboard NOC** | Sí | Sí | Sí |
| **Registrar / Editar Pantallas** | Sí | Sí | No |
| **Escanear Red LAN (Network Discovery)** | Sí | Sí | No |
| **Consultar Historial de Auditoría** | Sí | Sí | No |
| **Eliminar Pantallas Registradas** | Sí | No | No |
| **Gestión de Cuentas de Usuario** | Sí | No | No |

---

## 2. Seguridad en Autenticación y Tokens
- **Algoritmo de Hash:** Bcrypt con factor de costo 10 rounds para contraseñas de usuarios. Nunca se persisten contraseñas en texto claro.
- **Tokens JWT:** Firma simétrica HMAC-SHA256 con tiempo de expiración forzado (24 horas).
- **Protección de Cabeceras:** Middleware `helmet` habilitado para mitigar Clickjacking, Cross-Site Scripting (XSS) e inyección MIME.
- **CORS Estricto:** Configuración restrictiva de orígenes permitidos en entornos de producción.

---

## 3. Seguridad a Nivel de Red y Capa de Datos
- **Consultas Parametrizadas:** Tanto la capa de PostgreSQL (`$1, $2`) como la de SQLite (`?`) utilizan sentencias preparadas (Prepared Statements) que neutralizan cualquier vector de inyección SQL (SQLi).
- **Timeouts en Sockets:** Todos los sockets TCP hacia pantallas tienen tiempos de espera estrictos (2500ms - 3000ms) para evitar agotamiento de descriptores de archivo por dispositivos colgados.
- **Limitación en Escaneo de Red:** El motor de escaneo procesa bloques de red controlados con timeouts cortos para no provocar saturación de tabla ARP ni degradar el tráfico de switches industriales.

---

## 4. Registro de Auditoría Inmutable
Toda acción de impacto (inicio de sesión, cambio de canal o entrada, apagado de un videowall, registro o borrado de displays) genera automáticamente un registro en `audit_logs` que captura:
1. `user_id` y `username` del operador responsable.
2. `device_id` y nombre del display involucrado.
3. `action` efectuada.
4. `status` (SUCCESS / FAILED).
5. `ip_address` del cliente que originó la petición.
6. Marca temporal precisa `timestamp` generada por el servidor.

---

## 5. Hardening Recomendado para Smart TVs
1. **Deshabilitar servicios innecesarios:** Desactivar UPnP no autenticado, servicios cloud de telemetría de fabricantes que no se utilicen en entornos cerrados, y Miracast abierto en pantallas de salas de juntas para evitar intrusiones de invitados.
2. **Contraseñas PJLink y Claves PSK:** Configurar contraseñas PJLink robustas y Pre-Shared Keys en pantallas Sony y Samsung.
3. **VLAN de Monitoreo:** Mantener las pantallas en un segmento de red privado sin acceso directo a Internet si no es estrictamente necesario.
