import {env,app as appconfig,db} from './config.js';
import path from 'path';
import jwt from 'jsonwebtoken';
const {verify, sign} = jwt;
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import cors from 'cors';
import {dbcreate, dbconnect,loadSchemas} from './db.js';

import routesAdmin from './route-admin.js';
import routesApi from './route-api.js';
import { log } from 'console';

// Connexion au serveur de données
const initdb = async()=>{
    
    let checkdb = await dbconnect();

    if(checkdb.code!=0 && checkdb.type=='NODB' && appconfig.forcedatabase!="0"){
        checkdb = await dbcreate();
        console.log('Création de la base de données terminé\n',checkdb);
    }
    
    if(checkdb.code!=0){
        console.log("Erreur de connexion à la base:", checkdb.message);
        console.log("Verifiez les paramètres de connexion (PGUSER,PGPASSWORD,PGHOST,PGPORT,PGDATABASE)");
        process.exit(1);
    }
    

    console.log('Connexion à la base de données établie');
    
}

// lancement du serveur HTTP
let app;

const launch = async()=>{
    app = express();
    console.log('Lancement du serveur HTTP');

    app.use(cors({ origin: '*' }));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '300kb', extended: true}));
    // app.use(formdataparse({}));
    app.use(cookieParser());
    
    //app.use(express.raw({ type: '*/*', limit: '10mb' }));


    app.use(checkToken);

    app.use('/admin', routesAdmin);
    app.use('/api', routesApi);
    app.use('/static',express.static(appconfig.__static));
    app.use('/favicon.ico', express.static('favicon.ico'));
    
    app.listen(env.port, env.host, err => {
        if (err) {
            console.log('ERR#>'+err);
            return;
        }
        console.log(`API en écoute sur ${env.host}:${env.port}`);
    });

    app.get('/login', async(req, res, next) => {
        res.sendFile(path.join(appconfig.__html,'login.html'));
    });
    app.get('/logout', async(req, res, next) => {
        res.clearCookie('qatoken');
        res.redirect('/login');
    });
    
    app.post('/login', async(req, res, next) => {
        
        if(req.body.pwd==appconfig.qatoken){
            const token = sign({
                id: 'quickapiuser',
            }, appconfig.jwtsecret, { expiresIn: '3 hours' });

            res.cookie('qatoken', token, {  httpOnly: true, expires: new Date(Date.now() + 3*3600*1000) });
            res.json({success:true})
        }else res.json({success:false});
    });

}

// Verification of JWT
const checkToken = (req, res, next) => {
    let jwtSecretKey = appconfig.jwtsecret;
    try {
        let sessionToken = req.cookies.qatoken;
        if(sessionToken)req.token = verify(sessionToken, jwtSecretKey);
    }finally{
        next();
    }
}

await initdb();
await loadSchemas();
await launch();



