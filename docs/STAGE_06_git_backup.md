# Stage 06 — Git & Database Backup

## Prompt Given
"add this to github commit" / "i want to update data backup also"

## What Was Done

### .gitignore Updated
```
node_modules
.env
.env.*
dist/
build/
```
Note: .env is excluded — never commit database credentials to GitHub.

### Initial Commit
- 150 files, 25,064 insertions
- Commit message: "feat: initial ERP platform — Sara Advanced Trading Company"
- Remote: https://github.com/hbinmadi/ErpClaude

### Git Commands Used
```bash
git add .gitignore docker-compose.yml package.json package-lock.json packages/
git commit -m "feat: initial ERP platform..."
git remote add origin https://github.com/hbinmadi/ErpClaude.git
git push -u origin master
```

### Database Backup (Manual — run in Windows terminal)
PostgreSQL 18 is installed at: C:\Program Files\PostgreSQL\18\bin\

```powershell
# Set password
$env:PGPASSWORD = "301538"

# Dump database
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U erp -h localhost -p 5432 erp_dev > D:\erpclaude\erp\backups\erp_backup_YYYY_MM_DD.sql

# Commit backup
cd D:\erpclaude\erp
git add backups/erp_backup_YYYY_MM_DD.sql
git commit -m "backup: database dump YYYY-MM-DD"
git push
```

### start.bat
Created `D:\erpclaude\erp\start.bat` — double-click to:
1. Open Server terminal (port 3001)
2. Wait 3s, open Client terminal (port 5173)
3. Wait 3s, auto-open http://localhost:5173 in browser
