require('dotenv').config();
const path=require('path'), express=require('express'), helmet=require('helmet'), cors=require('cors');
const rateLimit=require('express-rate-limit'), bcrypt=require('bcryptjs'), jwt=require('jsonwebtoken');
const mysql=require('mysql2/promise');
const app=express(), PORT=Number(process.env.PORT||3000);
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) throw new Error('Set a random JWT_SECRET of at least 32 characters in .env');
const pool=mysql.createPool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),
 user:process.env.DB_USER||'swms_app',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'smart_water_db',
 waitForConnections:true,connectionLimit:10,queueLimit:0});
app.use(helmet({contentSecurityPolicy:false})); app.use(cors({origin:false})); app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(__dirname,'public')));
const limiter=rateLimit({windowMs:15*60*1000,max:25,standardHeaders:true,legacyHeaders:false});
const validUsername=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]{3,50}$/.test(s);
const tokenFor=u=>jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'2h'});
async function auth(req,res,next){try{
 const h=req.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7):'';
 if(!t)return res.status(401).json({message:'Please sign in again.'});
 const p=jwt.verify(t,process.env.JWT_SECRET);
 const [r]=await pool.execute('SELECT id,full_name,username,phone,role,is_active FROM users WHERE id=?',[p.sub]);
 if(!r.length||!r[0].is_active)return res.status(401).json({message:'Account unavailable.'});
 req.user=r[0];next();
 }catch(e){res.status(401).json({message:'Session expired. Please sign in again.'});}}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({message:'Administrator access required.'});next();}

app.post('/api/auth/register',limiter,async(req,res)=>{try{
 const {name,username,password,phone}=req.body||{};
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>120)return res.status(400).json({message:'Enter a valid full name.'});
 if(!validUsername(username))return res.status(400).json({message:'Username must be 3–50 characters using letters, numbers, dot, underscore or hyphen.'});
 if(typeof password!=='string'||password.length<8||password.length>72)return res.status(400).json({message:'Password must be at least 8 characters.'});
 if(typeof phone!=='string'||phone.trim().length<7||phone.trim().length>25)return res.status(400).json({message:'Enter a valid phone number.'});
 const hash=await bcrypt.hash(password,12);
 // SECURITY: role is deliberately hard-coded to 'user'; the client cannot request admin.
 await pool.execute('INSERT INTO users(full_name,username,password_hash,phone,role) VALUES(?,?,?,?,\'user\')',
 [name.trim(),username.trim(),hash,phone.trim()]);
 res.status(201).json({message:'User account created. Please sign in.'});
 }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({message:'Username already registered.'});console.error(e);res.status(500).json({message:'Could not create account.'});}});

app.post('/api/auth/login',limiter,async(req,res)=>{try{
 const {username,password,role}=req.body||{};
 if(!validUsername(username)||typeof password!=='string'||!['user','admin'].includes(role))return res.status(400).json({message:'Enter valid sign-in details.'});
 const [rows]=await pool.execute('SELECT id,full_name,username,password_hash,phone,role,is_active FROM users WHERE username=? AND role=? LIMIT 1',[username.trim(),role]);
 if(!rows.length||!rows[0].is_active||!(await bcrypt.compare(password,rows[0].password_hash)))return res.status(401).json({message:'Invalid username or password.'});
 const u=rows[0];res.json({token:tokenFor(u),user:{id:u.id,name:u.full_name,username:u.username,phone:u.phone,role:u.role}});
 }catch(e){console.error(e);res.status(500).json({message:'Sign-in failed.'});}});
app.get('/api/me',auth,(req,res)=>res.json({user:{id:req.user.id,name:req.user.full_name,username:req.user.username,phone:req.user.phone,role:req.user.role}}));

app.get('/api/complaints',auth,async(req,res)=>{try{
 const [rows]=req.user.role==='admin'
 ?await pool.query('SELECT c.*,u.full_name,u.username,u.phone FROM complaints c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC')
 :await pool.execute('SELECT * FROM complaints WHERE user_id=? ORDER BY created_at DESC',[req.user.id]);
 res.json({complaints:rows});
 }catch(e){console.error(e);res.status(500).json({message:'Could not load complaints.'});}});
app.post('/api/complaints',auth,async(req,res)=>{try{
 const {category,location,subject,description}=req.body||{};
 if(![category,location,subject,description].every(v=>typeof v==='string'&&v.trim()))return res.status(400).json({message:'Complete all complaint fields.'});
 const [r]=await pool.execute('INSERT INTO complaints(user_id,category,location,subject,description) VALUES(?,?,?,?,?)',
 [req.user.id,category.trim(),location.trim(),subject.trim(),description.trim()]);
 res.status(201).json({id:r.insertId,message:'Complaint submitted.'});
 }catch(e){console.error(e);res.status(500).json({message:'Could not submit complaint.'});}});
app.patch('/api/complaints/:id',auth,adminOnly,async(req,res)=>{try{
 const {status,adminNote}=req.body||{};
 if(!['Submitted','In Progress','Resolved'].includes(status))return res.status(400).json({message:'Invalid status.'});
 await pool.execute('UPDATE complaints SET status=?,admin_note=? WHERE id=?',[status,typeof adminNote==='string'?adminNote:null,req.params.id]);
 res.json({message:'Complaint updated.'});
 }catch(e){console.error(e);res.status(500).json({message:'Could not update complaint.'});}});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
(async()=>{try{await pool.query('SELECT 1');app.listen(PORT,()=>console.log(`Open http://localhost:${PORT}`));}
catch(e){console.error('MySQL connection failed:',e.message);process.exit(1);}})();
