from pathlib import Path
import secrets
password = secrets.token_hex(24)
root = secrets.token_hex(24)
admin = secrets.token_hex(24)
p = Path('.runtime/credentials.env')
p.write_text(f'MARIADB_DATABASE=wordpress\nMARIADB_USER=wordpress\nMARIADB_PASSWORD={password}\nMARIADB_ROOT_PASSWORD={root}\nWORDPRESS_DB_HOST=db\nWORDPRESS_DB_NAME=wordpress\nWORDPRESS_DB_USER=wordpress\nWORDPRESS_DB_PASSWORD={password}\nCASE_ADMIN_PASSWORD={admin}\n')
p.chmod(0o600)
