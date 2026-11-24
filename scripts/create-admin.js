require('dotenv').config();
const readline=require('readline'),bcrypt=require('bcryptjs'),mysql=require('mysql2/promise');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=q=>new Promise(ok=>rl.question(q,ok));
(async()=>{let db;try{
 const name=(await ask('Admin full name: ')).trim(),username=(await ask('Admin username: ')).trim(),password=await ask('Admin password (minimum 12 characters): ');
 if(name.length<2||!/^[A-Za-z0-9_.-]{3,50}$/.test(username)||password.length<12)throw new Error('Invalid input or password shorter than 12 characters.');
 const hash=await bcrypt.hash(password,12);
 db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'swms_app',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'smart_water_db'});
 await db.execute(`INSERT INTO users(full_name,username,password_hash,phone,role) VALUES(?,?,?,'ADMIN-N/A','admin')
 ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),password_hash=VALUES(password_hash),role='admin',is_active=TRUE`,[name,username,hash]);
 console.log('Administrator provisioned in MySQL. Admin signup is not available on the website.');
 }catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.end();rl.close();}})();
