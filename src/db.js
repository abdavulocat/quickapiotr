/**
 * Persistance (PostGreSql)
 * 
 * - créer une table pour un schema CSV
 * - Modifier uen table d'un schema
 * 
 * - Ajouter des entrées dans une table (import CSV) / contrôle PK
 * 
 * Nomenclature en base
 * SCH_xxxxx : table d'un schema
 * 
 */
import {db as dbconfig} from './config.js';
import pg from 'pg'
const { Pool, Client } = pg

import pgp from 'pg-promise';
const pgpromise = pgp({capSQL:true});
const pgpdb = pgpromise(dbconfig);

const codes_erreur = {
    "3D000": {type:'NODB',message:`Base de données inexistante.`},
    "42P07": {type:'TABLEEXIST',message:`La table existe déjà dans la base.`},
    "00001": {type:'TABLEEXIST',message:`Le schema csv existe déjà dans la base.`},
}

let gSchemas = [];
let pool = null;

const initPool = async()=>{
    pool = new Pool(dbconfig);
    pool.on('error', (err, client) => {
        console.error('Pool Oups !', err);
    });
    return pool;
}

export const dbcreate = async()=>{
    let check = {code:0};
    const ddl = `CREATE DATABASE "${dbconfig.database}"`;
    let nconfig = {...dbconfig,database:"postgres"};
    let client = new Client(nconfig);
    try {
        await client.connect();
        let res = await client.query(ddl);
        client.end();
        await initPool();
    } catch (error) {
        check.code = error.code;
        check.message = codes_erreur[error.code].message;
        check.type = codes_erreur[error.code].type;
    }finally{
        return check;
    }
}

export const dbconnect = async()=>{
    let check = {code:0,message:"",type:""};
    try {
        let client = new Client(dbconfig);
        await client.connect();
        let res = await client.query("SELECT NOW()");
        client.end();
        check.code = 0;
        await initPool();
    } catch (error) {
        check.code = error.code;
        check.message = codes_erreur[error.code].message;
        check.type = codes_erreur[error.code].type;
    }finally{
        return check;
    }
}

export const loadSchemas = async ()=>{
    let msg = {code:0};
    const sql = `SELECT 
                    isc.table_name,
                    obj_description(format('%s.%s',isc.table_schema,isc.table_name)::regclass::oid, 'pg_class') as table_description,
                    isc.ordinal_position,
                    isc.column_name,
                    pg_catalog.col_description(format('%s.%s',isc.table_schema,isc.table_name)::regclass::oid,isc.ordinal_position) as column_description
                FROM
                    information_schema.columns isc
                WHERE isc.table_schema='public' AND TABLE_NAME LIKE 'sch_%' order by 1,3;`

    try {
        let data = await pool.query(sql);
        let _schemas = new Set(data.rows.map(d=>d.table_description));
        let schemas = [];

        for(let schema of _schemas){
            let _fields = data.rows.filter(d=>d.table_description==schema);
            let sch = {
                id:_fields[0].table_description,
                table:_fields[0].table_name,
                fields:_fields.map(f=>{return {index:f.ordinal_position,name:f.column_name,description:f.column_description}})
            };
            schemas.push(sch);
        }
        gSchemas = schemas;
        msg.data = schemas;
    } catch (error) {
        console.error(error);
        msg.code = error.code;
        msg.message = codes_erreur[error.code].message;
    }finally{
        return msg;
    }
}

export const createSchema = async (schema,force=false)=>{
    // schema = [{index:n, name:'nom',type:'text',length:nnn}]
    let msg = {code:0};

    let s = gSchemas.find(s=>s.id==schema.id);
    if(s && !force){
        msg.code = "00001";
        msg.message = codes_erreur[msg.code].message;
        return msg;
    }
    
    if(!s){
        let lastSchemaNum = gSchemas.map(s=>s.table.slice(4)).reduce((a,b)=>Math.max(parseInt(a),parseInt(b)),0);
        lastSchemaNum = parseInt(lastSchemaNum);
        lastSchemaNum++;
        schema.table = "sch_" + lastSchemaNum;    
    }else{
        schema.table = s.table;
    }

    let colonnes = schema.fields.map((f,i)=>`F${f.index} VARCHAR(${f.length})`);
    const ddldrop = `DROP TABLE IF EXISTS ${schema.table}`;
    const ddl = `CREATE TABLE ${schema.table} (
        _id SERIAL PRIMARY KEY,
        ${colonnes.join(',')}
    )`;

    let instructions = schema.fields.map((f,i)=>`COMMENT ON COLUMN ${schema.table}.F${f.index} IS '${f.name.replace("'","''")}';`);
    instructions.push(`COMMENT ON TABLE ${schema.table} IS '${schema.id.replace("'","''")}';`);

    try {
        let res = [];
        if(force){            
            res.push(await pool.query(ddldrop));
        }
        res.push(await pool.query(ddl));
        for(let instr of instructions){
            res.push(await pool.query(instr));
        };
        msg.resulat = res;
    } catch (error) {
        console.error(error);
        msg.code = error.code;
        msg.message = codes_erreur[error.code].message;
    }finally{
        await loadSchemas();
        return msg;
    }
};

export const deleteSchema = async (schemaId)=>{
    let msg = {code:0};
    let s = gSchemas.find(s=>s.id==schemaId);
    
    if(s){
        const ddldrop = `DROP TABLE ${s.table}`;
        try {
            let res = await pool.query(ddldrop);
            
            msg.data = res;
        } catch (error) {
            console.error(error);
            msg.code = error.code;
            msg.message = codes_erreur[error.code].message;
        }finally{
            loadSchemas();
            return msg;
        }
    }else{
        msg.code = "00002";
        msg.message = "Le schema n'existe pas";
        return msg;
    }
};

export const insertData = async (schema)=>{
    let msg = {code:0};

    let _schema = gSchemas.find(s=>s.id==schema.id);
   

    // Transformer la ligne de donnée en objet avec F1,F2,F3...
    let mapping = _schema.fields.filter(f=>f.name!='_id').map((f,i)=>{return {
                                                        name:f.name,
                                                        prop:'f'+schema.fields.findIndex(sf=>sf.name==f.description),
                                                        def:''
                                                    }});

    schema.data = schema.data.map(d=>{
        let obj = {};
        d.forEach((v,i)=>{
            obj['f'+i] = v;
        })
        return obj;
    });
    
    const cs = new pgpromise.helpers.ColumnSet(mapping, {table: `${_schema.table}`});
    const insert = pgpromise.helpers.insert(schema.data, cs);

    try {
        let data = await pgpdb.none(insert)
        msg.data = data;
    } catch (error) {
        msg.code = error.code;
    }finally{
        return msg;
    }

}

export const getSchema = async (schemaId,pagination={page:0,limit:10})=>{
    let msg = {code:0};
    let _schema = gSchemas.find(s=>s.id==schemaId);
    if(!_schema){
        msg.code = "00002";
        msg.message = "Le schema n'existe pas";
        return msg;
    }
    let offset = pagination.page*pagination.limit;
    const sql = `SELECT * FROM ${_schema.table} ORDER BY _id OFFSET ${offset} LIMIT ${pagination.limit}`;
    try {
        let data = await pool.query({text:sql,rowMode: 'array'});
        msg.data = data.rows;
        msg.fields = _schema.fields;
        msg.pageination = pagination;
    } catch (error) {
        msg.code = error.code;
    }finally{
        return msg;
    }

}

export const querySchema = async (schemaId, filtre,pagination={page:0,limit:10})=>{
    let msg = {code:0};
    let _schema = gSchemas.find(s=>s.id==schemaId);
    if(!_schema){
        msg.code = "00002";
        msg.message = "Le schema n'existe pas";
        return msg;
    }

    let sql = `SELECT * FROM ${_schema.table}`;
    let where = [];

    if (typeof filtre === 'string') {
        
        let sWhere = convertSQL(_schema, filtre);
        if(sWhere)sql = sql + ' WHERE ' + sWhere;
    }else{
        for(let f in filtre){
            let champ = _schema.fields.find(sf=>sf.description==f);
            if(champ)where.push(`${champ.name}='${filtre[f]}'`);
        }
        sql = sql + (where.length>0?' WHERE '+where.join(' AND '):'');
    }

    sql = sql + ` ORDER BY _id OFFSET ${pagination.page*pagination.limit} LIMIT ${pagination.limit}`;
    msg.sql = sql;
    try {
        let data = await pool.query({text:sql,rowMode: 'array'});
        msg.data = data.rows;
        msg.fields = _schema.fields;
        msg.pageination = {page:pagination.page,limit:pagination.limit};
    } catch (error) {
        console.error(error);
        
        msg.code = error.code;
    }finally{
        return msg;
    }
}

const convertSQL = (schema, sql)=>{
    let res = sql;
    for(let f of schema.fields){
        res = res.replace(new RegExp(`\\[${f.description}\\]`,'gi'),`${f.name}`);
    }
    return res;
}

// retourne une connexion et check s'il est bien relachée
export const getClient = async () => {
    const client = await pool.connect()
    const query = client.query
    const release = client.release
    // Timeout de 5s avant d'alerter une fuite dans le pool
    const timeout = setTimeout(() => {
      console.error('ça fait 5 secondes qu\'on a pas relaché le client. C\'est louche.')
      console.error(`voici la requete: ${JSON.stringify(client.lastQuery)}`)
    }, 5000)
    // on patch la fonction query pour qu'elle log la dernière requête de ce client
    client.query = (...args) => {
      client.lastQuery = args
      return query.apply(client, args)
    }
    // on patch la fonction release pour qu'elle clear le timeout si pas declenchée
    client.release = () => {
      clearTimeout(timeout)
      client.query = query
      client.release = release
      return release.apply(client)
    }
    return client
  }
