const readline=require('readline');
const bcrypt=require('bcryptjs');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
rl.question('Enter the admin password to hash (minimum 12 characters): ',async password=>{
  try{
    if(password.length<12) throw new Error('Use at least 12 characters.');
    console.log('\nCopy this bcrypt hash into the INSERT statement in MySQL Workbench:\n');
    console.log(await bcrypt.hash(password,12));
  }catch(e){console.error(e.message);process.exitCode=1;}
  finally{rl.close();}
});
