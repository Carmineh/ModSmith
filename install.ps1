# Links the Modsmith skill from this clone into Claude Code and/or Codex (Windows, no admin needed).
# Usage: .\install.ps1 [-Claude] [-Codex] [-AllAgents] [-Uninstall]
# Default: -Claude. Updating later is just `git pull` in this clone.
param(
    [switch]$Claude,
    [switch]$Codex,
    [switch]$AllAgents,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$skillDir = Join-Path $PSScriptRoot 'skills\modsmith'
$name = 'modsmith'

if (-not (Test-Path (Join-Path $skillDir 'SKILL.md'))) {
    Write-Error "SKILL.md not found in $skillDir"
}

$targets = @()
if ($Claude -or $AllAgents) { $targets += Join-Path $env:USERPROFILE '.claude\skills' }
if ($Codex -or $AllAgents) { $targets += Join-Path $env:USERPROFILE '.codex\skills' }
if ($targets.Count -eq 0) { $targets += Join-Path $env:USERPROFILE '.claude\skills' }

foreach ($dir in $targets) {
    $link = Join-Path $dir $name
    $existing = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
    if ($Uninstall) {
        if ($existing -and $existing.LinkType) { $existing.Delete(); Write-Output "Removed $link" }
        else { Write-Output "Nothing to remove at $link" }
        continue
    }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    if ($existing) {
        if ($existing.LinkType) { $existing.Delete() }
        else { Write-Warning "Skipped ${link}: it exists and is not a link (remove it first)."; continue }
    }
    New-Item -ItemType Junction -Path $link -Target $skillDir | Out-Null
    Write-Output "Linked $link -> $skillDir"
}
Write-Output 'Restart your agent to load the skill.'
