import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = {
    jwtsecret:process.env.JWTSECRET?process.env.JWT:'jkhkjhqskdhqjkhd',
    qatoken:process.env.QATOKEN?process.env.QATOKEN:'secret',
    forcedatabase:process.env.FORCEDATABASE?process.env.FORCEDATABASE:0,
    __dirname:__dirname,
    __filename:__filename,
    __static:path.join(__dirname,'static'),
    __html:path.join(__dirname,'html'),
}

export const env = {
    port:process.env.PORT?process.env.PORT:3000,
    host:process.env.HOST?process.env.HOST:'localhost',
}

export const db = {
    user:process.env.PGUSER?process.env.PGUSER:'',
    password:process.env.PGPASSWORD?process.env.PGPASSWORD:'',
    host:process.env.PGHOST?process.env.PGHOST: '',
    port:process.env.PGPORT?process.env.PGPORT: 0,
    database:process.env.PGDATABASE?process.env.PGDATABASE: 'quickapi',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 10,    
}
