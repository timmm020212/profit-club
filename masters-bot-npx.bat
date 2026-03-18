@echo off
echo Starting Masters Bot...
cd /d "c:\Users\timur\Downloads\Profit Club"
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" tsx telegram-bot\masters-bot-full.ts
