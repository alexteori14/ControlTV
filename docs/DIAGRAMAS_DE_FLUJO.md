# Diagramas de Flujo del Sistema - ControlTV

## 1. Flujo de Ejecución de Comandos con Validación Previa de Conectividad

Este diagrama modela el cumplimiento estricto del **Requisito 3**: *"Validar conectividad antes de enviar comandos"*, junto con el registro de auditoría e historial de comandos.

```mermaid
flowchart TD
    Start(["Inicio: Operador envía comando"]) --> AuthCheck{"¿Token JWT válido?"}
    AuthCheck -- No --> Ret401["Retornar 401 No Autorizado"]
    AuthCheck -- Sí --> LoadDevice["Cargar datos de la pantalla desde BD"]
    LoadDevice --> DevExists{"¿Dispositivo existe?"}
    DevExists -- No --> Ret404["Retornar 404 Dispositivo no encontrado"]
    
    DevExists -- Sí --> IsPowerOn{"¿El comando es POWER_ON?"}
    IsPowerOn -- Sí --> WoLCheck{"¿Tiene MAC Address?"}
    WoLCheck -- Sí --> SendWoL["Enviar Magic Packet Wake-on-LAN (UDP 9)"]
    SendWoL --> ResolveDriver
    WoLCheck -- No --> ResolveDriver
    
    IsPowerOn -- No --> CheckPing["Validar enlace TCP activo (timeout 2500ms)"]
    CheckPing --> IsReachable{"¿Pantalla responde?"}
    
    IsReachable -- No --> MarkOffline["Marcar pantalla como OFFLINE en BD"]
    MarkOffline --> LogAbort["Registrar comando ABORTADO en Auditoría & Historial"]
    LogAbort --> BroadcastAbort["Emitir evento WebSocket: command_executed (FAILED)"]
    BroadcastAbort --> RetError["Retornar 400: Pantalla inalcanzable"]

    IsReachable -- Sí --> ResolveDriver["Instanciar Driver mediante DriverFactory"]
    ResolveDriver --> FormatCmd["Construir trama de protocolo (PJLink / Samsung MDC / LG / Sony / Telnet)"]
    FormatCmd --> DispatchSocket["Enviar bytes/tramas por Socket TCP / HTTP"]
    DispatchSocket --> ParseResponse["Analizar respuesta del hardware"]
    ParseResponse --> SuccessCheck{"¿Comando exitoso?"}
    
    SuccessCheck -- Sí --> UpdateState["Actualizar estado de pantalla en BD (vol, brillo, entrada, energía)"]
    SuccessCheck -- No --> LogFail["Registrar falla en Historial"]
    
    UpdateState --> TakeCapture["ScreenCaptureService: Capturar fotograma de pantalla de TV en 1080p"]
    TakeCapture --> LogAudit["Insertar registro en audit_logs y command_history"]
    LogFail --> LogAudit
    LogAudit --> BroadcastWS["Difundir eventos WebSocket: command_executed y screen_captured"]
    BroadcastWS --> End(["Fin: Retornar resultado con tiempo de ejecución y screenshot"])
```

---

## 2. Flujo de Descubrimiento Automático en Red Local (Network Discovery)

Este flujo modela el **Requisito 6**: Detección de dispositivos compatibles por escaneo de puertos clave y fingerprinting.

```mermaid
flowchart TD
    ScanReq(["Inicio: Administrador solicita escaneo"]) --> SubnetParse["Determinar rango de IPs (ej: 192.168.1.0/24)"]
    SubnetParse --> HostLoop["Iterar sobre cada IP objetivo"]
    
    HostLoop --> PortProbing["Sondear puertos Smart TV en paralelo (4352, 1515, 9761, 8001, 80, 23)"]
    PortProbing --> AnyOpen{"¿Algún puerto abierto?"}
    
    AnyOpen -- No --> NextHost["Siguiente host"]
    AnyOpen -- Sí --> Fingerprint["Analizar puertos para identificar fabricante"]
    
    Fingerprint --> Check4352{"¿Puerto 4352 abierto?"}
    Check4352 -- Sí --> SetPJLink["Fabricante: Panasonic / PJLink Standard Display"]
    
    Check4352 -- No --> Check1515{"¿Puerto 1515 u 8001?"}
    Check1515 -- Sí --> SetSamsung["Fabricante: Samsung Electronics (MDC / Tizen)"]
    
    Check1515 -- No --> Check9761{"¿Puerto 9761 o 3000?"}
    Check9761 -- Sí --> SetLG["Fabricante: LG Electronics (SuperSign / webOS)"]
    
    Check9761 -- No --> SetGeneric["Fabricante: Pantalla Genérica Serial / REST"]
    
    SetPJLink --> BuildRecord["Construir objeto DiscoveredDevice (IP, MAC, Puertos, Hostname, Driver sugerido)"]
    SetSamsung --> BuildRecord
    SetLG --> BuildRecord
    SetGeneric --> BuildRecord
    
    BuildRecord --> PushList["Añadir a lista de resultados"]
    PushList --> NextHost
    NextHost --> Finished{"¿Fin de rango?"}
    Finished -- No --> HostLoop
    Finished -- Sí --> ReturnList["Mostrar tabla de pantallas descubiertas"]
    ReturnList --> ImportClick{"¿Operador hace clic en Importar?"}
    ImportClick -- Sí --> CreateInDB["Registrar pantalla en BD y notificar por WebSocket"]
    ImportClick -- No --> EndScan(["Fin"])
```

---

## 3. Flujo de Captura Automática de Pantalla de Televisión tras Acción Remota

Este flujo modela la toma y despliegue de **capturas reales de pantalla de la televisión tras cada acción del control remoto**:

```mermaid
flowchart TD
    Action(["Operador ejecuta acción: Encender / Apagar / Volumen / Entrada / Teclado / D-Pad"]) --> TriggerUI["Disparar efecto de obturador (Shutter Flash) y sonido táctil"]
    TriggerUI --> SendCmd["Enviar comando por API REST al Backend"]
    SendCmd --> PhysicalExec["Ejecutar comando en la Smart TV (WSS / Wake-on-LAN / TCP)"]
    
    PhysicalExec --> ModeCheck{"¿Hay capturadora HDMI USB activa?"}
    
    ModeCheck -- Sí --> GrabVideoFrame["Extraer fotograma nativo del stream de video en canvas"]
    GrabVideoFrame --> UpdateMonitor["Actualizar monitor central con la captura real"]
    
    ModeCheck -- No --> ServerCapture["ScreenCaptureService genera captura fotográfica del estado exacto"]
    ServerCapture --> RetScreenshot["Backend retorna CommandResult con Data URL de captura"]
    RetScreenshot --> UpdateMonitor
    
    UpdateMonitor --> AddToReel["Insertar en Carrete Histórico de Capturas de Pantalla"]
    AddToReel --> ToastNotify["Mostrar notificación toast: 📸 Captura de TV guardada tras: [Acción]"]
    ToastNotify --> FinishCap(["Fin: Operador visualiza el resultado exacto en pantalla"])
```
