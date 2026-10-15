import { Sequelize, QueryTypes } from 'sequelize';
import { writeFile, mkdir } from 'node:fs/promises';
const db=new Sequelize(process.env.DATABASE_URL,{logging:false,dialectOptions:{connectionTimeoutMillis:5000}});
try {
 await db.transaction(async transaction=>{
  const requests=await db.query('SELECT id,created_at,status,code,data,receipt_hash FROM fri_requests ORDER BY created_at,id',{type:QueryTypes.SELECT,transaction});
  const sellers=await db.query('SELECT id,email,name,active FROM sellers',{type:QueryTypes.SELECT,transaction});
  const counters=await db.query("SELECT last_value FROM document_counters WHERE name='fri'",{type:QueryTypes.SELECT,transaction});
  await mkdir('../tmp/migration',{recursive:true});
  await writeFile('../tmp/migration/nest-export.json',JSON.stringify({exportedAt:new Date().toISOString(),requests,sellers,lastValue:counters[0]?.last_value||0},null,2));
  console.log(`Exportadas ${requests.length} solicitudes y ${sellers.length} vendedores a un archivo excluido de Git. No se exportaron contraseñas ni sesiones.`);
 });
} finally {await db.close();}
