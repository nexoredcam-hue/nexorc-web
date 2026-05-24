# =====================================================================
# NEXORC RECOVERY CENTER - SISTEMA DE PUBLICACIÓN AUTOMATIZADA
# Script: subir a WEB (subir_a_WEB.ps1)
# =====================================================================

# Configurar codificación para evitar caracteres extraños en Windows
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     NEXORC SYSTEM - PUBLICACIÓN AUTOMATIZADA EN VERCEL     " -ForegroundColor Black -BackgroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar descripción del cambio al usuario
$mensaje = Read-Host "Describa brevemente el cambio realizado (Presione ENTER para usar descripción genérica)"

# Si el usuario no ingresa nada, se le asigna un mensaje genérico por defecto
if ([string]::IsNullOrWhiteSpace($mensaje)) {
    $mensaje = "Actualización de contenidos y optimización de diseño NEXORC"
}

Write-Host ""
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host "[1/3] Preparando archivos modificados (git add)..." -ForegroundColor Yellow
git add .

Write-Host "[2/3] Registrando cambios en el historial (git commit)..." -ForegroundColor Yellow
git commit -m "$mensaje"

Write-Host "[3/3] Subiendo actualizaciones a la nube (git push)..." -ForegroundColor Yellow
Write-Host "(Si es requerido, inicie sesión en la ventana emergente)" -ForegroundColor Gray
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

git push origin main

# Verificar si el último comando de Git finalizó con éxito
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host "            ¡PUBLICACIÓN INICIADA CON ÉXITO!                 " -ForegroundColor Black -BackgroundColor Green
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host " ✔️ Código subido correctamente a tu repositorio de GitHub." -ForegroundColor Green
    Write-Host " 🚀 Vercel está actualizando tu sitio web en vivo (tardará ~15s)." -ForegroundColor Cyan
    Write-Host "=============================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host "            HA OCURRIDO UN ERROR EN LA SUBIDA                " -ForegroundColor White -BackgroundColor Red
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host " ❌ El proceso falló. Revise los mensajes de error de arriba." -ForegroundColor Red
    Write-Host "=============================================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Presione la tecla ENTER para finalizar..."
