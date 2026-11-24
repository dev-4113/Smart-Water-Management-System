# Smart Water Management System — MySQL Edition

This project retains the uploaded dashboard and replaces local browser account authentication with a Node.js + MySQL backend.

## Changes
- User registration is available on the website.
- The backend always creates public registrations with `role='user'`.
- Admin login remains, but admin signup and admin password-recovery controls are removed.
- Admin credentials are provisioned from the terminal using `npm run create-admin`; bcrypt hashes are stored in MySQL.
- Added signed-in user label, sign-out control and live clock.
- MySQL schema and complaint API endpoints are included.

**Important:** The existing dashboard's complaint screen still uses browser-local storage in this starter build; the included complaint API is ready for the next integration step. The original sensor readings are simulated demo values, not live sensor data.

## Requirements
Windows 10/11, Node.js LTS (18+), MySQL Server 8+, MySQL Workbench.

## Step 1 — Create the database in MySQL Workbench
1. Open MySQL Workbench and connect to your local MySQL Server.
2. Open `sql/schema.sql` using File → Open SQL Script.
3. Replace `CHANGE_THIS_DATABASE_PASSWORD` with a strong database password in the `CREATE USER` line.
4. Execute the script with the lightning button.
5. Refresh Schemas; `smart_water_db` should contain `users` and `complaints`.

The script creates the least-privilege application account `swms_app`. Keep its password for the next step.

## Step 2 — Configure `.env`
1. In the project root, copy `.env.example` and rename the copy to `.env`.
2. Set `DB_PASSWORD` to the same password you used in Workbench.
3. Set `JWT_SECRET` to a random value of at least 32 characters. Keep `.env` private.

Generate a random secret in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Step 3 — Install packages
Open the project root folder in VS Code (the folder containing `package.json`) and run:
```powershell
npm install
```

## Step 4 — Create the administrator account in MySQL Workbench
1. In the VS Code terminal, run `npm run hash-password`.
2. Enter the admin password (minimum 12 characters). Copy the bcrypt hash printed by the script. The password itself is not stored in the project.
3. Open MySQL Workbench and run this query, replacing the sample name, username and hash with your own values:

```sql
USE smart_water_db;

INSERT INTO users (full_name, username, password_hash, phone, role)
VALUES (
  'System Administrator',
  'your_admin_username',
  'PASTE_THE_BCRYPT_HASH_HERE',
  'ADMIN-N/A',
  'admin'
);
```

4. Verify the new admin row:

```sql
SELECT id, full_name, username, role, is_active
FROM users
WHERE role = 'admin';
```

The administrator username and password are now the credentials you just entered/generated. Do not paste the plain-text password into SQL, HTML or JavaScript.

## Step 5 — Start the website
```powershell
npm start
```
Open `http://localhost:3000`. Do not open the HTML file directly with `file://`.

## Step 6 — Test
1. Use **Create a new account** to register a normal user.
2. Log in as the user and check the user dashboard.
3. Sign out.
4. Log in using the admin credentials created in Step 4.
5. Confirm the admin complaint inbox/monitoring navigation appears.
6. Confirm there is no admin registration link. The server's registration endpoint hardcodes role `user`, so sending `role: admin` from a modified browser request cannot create an admin.

## Verify in MySQL Workbench
```sql
USE smart_water_db;
SELECT id,full_name,username,role,is_active,created_at FROM users;
SELECT id,user_id,category,subject,status,created_at FROM complaints;
```
Do not expose `password_hash` in screenshots.

## Folder structure
```text
public/index.html
scripts/hash-password.js
sql/schema.sql
.env.example
.gitignore
package.json
server.js
README.md
original-index(7).html
```

## Security notes
- Role checks are performed by the backend, not merely hidden UI elements.
- MySQL should not be exposed directly to the public internet.
- Use HTTPS, private environment variables, backups, and secure HttpOnly cookies for a production deployment.
- The starter uses short-lived JWTs in sessionStorage; this is a learning project baseline, not a final hardened public service.
