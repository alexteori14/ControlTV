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
    
    UpdateState --> LogAudit["Insertar registro en audit_logs y command_history"]
    LogFail --> LogAudit
    LogAudit --> BroadcastWS["Difundir evento WebSocket a clientes conectados"]
    BroadcastWS --> End(["Fin: Retornar resultado con tiempo de ejecución en ms"])
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

## 3. Flujo de Verificación de Compatibilidad de Transmisión de Pantalla y Fallback

Este flujo responde a la **Nota Importante** de las especificaciones: *"Antes de asumir que la TV puede mostrar su contenido remotamente, verificar si el modelo soporta RTSP, WebRTC, Screen Capture API. Proponer alternativas usando PC intermedia o HDMI Capture"*.

```mermaid
flowchart TD
    ReqStream(["Inicio: Solicitar vista remota de pantalla"]) --> CheckModel["Consultar capacidades del modelo de TV"]
    CheckModel --> DirectSupport{"¿El modelo soporta salida RTSP nativa?"}
    
    DirectSupport -- Sí --> ConnectRTSP["Conectar flujo RTSP mediante proxy WebSocket/HLS"]
    ConnectRTSP --> DisplayVideo["Reproducir video en vivo en la aplicación"]
    
    DirectSupport -- No --> WebRTCSupport{"¿Soporta WebRTC Receiver?"}
    WebRTCSupport -- Sí --> ConnectWebRTC["Establecer canal WebRTC SDP/ICE con el receptor"]
    ConnectWebRTC --> DisplayVideo
    
    WebRTCSupport -- No --> CheckCompanion{"¿Hay PC intermedia o dispositivo HDMI Capture?"}
    CheckCompanion -- Sí --> ScreenCaptureAPI["Activar Screen Capture API en el navegador del operador / PC"]
    ScreenCaptureAPI --> CaptureDisplay["Capturar señal HDMI del display vía getDisplayMedia()"]
    CaptureDisplay --> DisplayVideo
    
    CheckCompanion -- No --> ShowFallback["Activar simulador de patrón de prueba visual (SMPTE / Signage Feed)"]
    ShowFallback --> AlertOperator["Mostrar banner diagnóstico recomendando dongle HDMI Capture USB"]
    AlertOperator --> EndVideo(["Fin"])
```
