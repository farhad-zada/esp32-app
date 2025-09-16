# ESP32 Relay Control Panel

This project allows you to control ESP32-connected relays through a web interface with secure access. It uses **WebSockets** for real-time communication between the ESP32 devices and the web control panel.

## Hardware Repository
- [ESP32 Relay Control Hardware](https://github.com/farhad-zada/esp32-hardware.git)

## Features

- Control multiple relays (Relay 1 and Relay 2) connected to ESP32.
- Real-time device status updates (connected devices, heap memory, RSSI).
- Secure access using HTTP Basic Authentication.
- Automatic WebSocket reconnection and heartbeat monitoring.

## Web Interface

The control panel is served using **Express.js** and provides:

- Device connection status
- Relay control buttons (ON/OFF)
- Visual feedback with toast notifications

### Access Control

- HTTP Basic Authentication is enforced.
- Credentials are read from environment variables:
  ```bash
  BASIC_USER=yourusername
  BASIC_PASS=yourpassword

