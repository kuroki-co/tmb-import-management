import {Sequelize} from 'sequelize';
const db=new Sequelize(process.env.DATABASE_URL,{logging:false,dialectOptions:{connectionTimeoutMillis:3000}});
try {const [r]=await db.query('select count(*)::integer as requests from fri_requests'); console.log(JSON.stringify(r));}catch{console.log('Base local no accesible');}finally{await db.close();}
