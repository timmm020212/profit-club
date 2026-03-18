@echo off
echo Starting Client Bot...
cd /d "c:\Users\timur\Downloads\Profit Club"
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" tsx telegram-bot\client-simple.ts
