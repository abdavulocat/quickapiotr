import {getSchema,querySchema} from './db.js';
import express from 'express';
const router = express.Router();


router.get('/:schemas', async(req, res, next) => {
    let page = req.query.page?req.query.page:0;
    let limit = req.query.limit?req.query.limit:10;
    let schema = req.params.schemas;

    let msg = await getSchema(schema, {page:page, limit:limit});
    res.json(msg);

});

router.post('/:schemas', async(req, res, next) => {
    let page = req.query.page?req.query.page:0;
    let limit = req.query.limit?req.query.limit:10;
    let schema = req.params.schemas;

    let filtre = req.body.filtre;
    let pagination = req.body.pagination?req.body.pagination:{page:page, limit:limit};
    let msg = await querySchema(schema, filtre, pagination);
    res.json(msg);

});

router.get('/:schemas/:id', async(req, res, next) => {
});

export default router;