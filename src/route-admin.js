/**
 * Routes pour administration de l'outil (controle)
 * - checker et créer la base si besoin
 * - Créer un schema à partir d'un CSV (etapes)
 * - Modifier un schéma existant
 */
import path from 'path';
import {app as appconfig} from './config.js';
import {createSchema,deleteSchema,insertData,loadSchemas} from './db.js';
import express from 'express';
const router = express.Router();

router.use(async(req, res, next)=>{
    if(req.url=='/login' || !appconfig.qatoken)next();
    else{
        if(!req.token)res.redirect('/login');
        else next();
    }
});

router.get('/', async(req, res, next) => {
    res.sendFile(path.join(appconfig.__html,'index.html'));
});

router.get('/schemas', async(req, res, next) => {
    let schemas = await loadSchemas();
    let data = schemas.data.map(s=>{return {id:s.id,fields:s.fields}});
    res.json({...schemas,data:data});
});

router.delete('/schemas/:id', async(req, res, next) => {
    let msg = await deleteSchema(req.params.id);
    res.json(msg);
});

// Creation de Schema à partir d'un CSV {}
router.post('/csv', async(req, res, next) => {
    // body.fields = [{index:n, name:'nom',type:'text',length:nnn}]

    let schema = {id:req.body.id};
    schema.fields = req.body.fields;
    schema.data = req.body.data;

    // Creation du schema
    let msg = await createSchema(schema,true);
    
    if(msg.code==0){
        //importer les données
        msg = await insertData(schema);
    }else{
        res.json(msg);
    }
    
    res.json(msg);


});

export default router;