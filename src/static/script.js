
let VAR_schemas = [];

const clearId = (id)=>{
    return id.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
}


class Schema {

    onRemove = new Event('remove',{bubbles:true,cancelable:true});
    constructor(id,fields=null,data=null,local=true){
        this.id = clearId(id);
        this.fields = fields;
        this.data = data;

        this.local = local;

        this.DOMSchema=document.createElement('div');
        this.DOMSchema.classList.add('schema');
        this.DOMSchema.dataset.id = this.id;

        this.DOMTitre = document.createElement('h2');
        this.DOMTitre.innerHTML = this.id;
        this.DOMSchema.appendChild(this.DOMTitre);

        this.DOMStatus = document.createElement('div');
        this.DOMStatus.classList.add('status');
        this.DOMSchema.appendChild(this.DOMStatus);

        this.DOMFields = document.createElement('div');
        this.DOMFields.classList.add('data');
        this.DOMSchema.appendChild(this.DOMFields);
        this.DOMFieldsInfos();

        this.DOMExplore = document.createElement('div');
        this.DOMExplore.classList.add('explore');
        
        let query = document.createElement('textarea');
        query.value = '{"filtre":{}}';
        query.placeholder = 'Requete';
        this.DOMExplore.appendChild(query);

        let btnExplore = document.createElement('button');
        btnExplore.innerText = 'Explorer';
        btnExplore.addEventListener('click',this.explorer.bind(this));
        this.DOMExplore.appendChild(btnExplore);
        
        let mode = document.createElement('div');
        mode.classList.add('mode');
        mode.innerHTML =`<label for="filtre">Mode d'interrogation</label>
                        <input type="radio" name="${this.id}_filtre" value="filtre"></input>Filtre
                        <input type="radio" name="${this.id}_filtre" value="sql" checked></input>SQL`;

        this.DOMExplore.appendChild(mode);
        this.DOMSchema.appendChild(this.DOMExplore);

        this.DOMDatas = document.createElement('div');
        this.DOMDatas.classList.add('data');
        this.DOMSchema.appendChild(this.DOMDatas);
        this.DOMDataInfos();

        this.DOMActions = document.createElement('div');
        this.DOMActions.classList.add('actions');
        this.DOMSchema.appendChild(this.DOMActions);

        // Suppression
        let btn = document.createElement('button');
        btn.dataset.action = 'delete';
        btn.innerText = 'supprimer';
        btn.addEventListener('click',this.supprimer.bind(this));
        this.DOMActions.appendChild(btn);
    }

    addToquery(field){
        let mode = this.DOMExplore.querySelector('.mode input:checked').value;
        let query = this.DOMExplore.querySelector('textarea').value;
        if(mode=='filtre'){
            try{query = JSON.parse(query)}
            catch(e){query = {filtre:{}}}
            if(!query.filtre || query.filtre.trim)query.filtre = {};
            query.filtre[field] = "";
            this.DOMExplore.querySelector('textarea').value = `{"filtre":${JSON.stringify(query.filtre)}}`;
        }else{
            try{query = JSON.parse(query)}
            catch(e){query = {filtre:""}}
            if(!query.filtre || !query.filtre.trim)query.filtre = "";
            query.filtre += `${query.filtre.trim().length==0?'':' AND'} [${field}]=''`;
            this.DOMExplore.querySelector('textarea').value = `{"filtre":"${query.filtre}"}`;
        }
    }

    explorer(){
        let query = this.DOMExplore.querySelector('textarea').value;
        query = JSON.parse(query);

        if(query){
            fetch('/api/'+this.id,{
                method:'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(query)
            }).then(response => response.json())
            .then(data => {
                this.data = data.data;
                this.fields = data.fields;
                this.DOMDataInfos();
                console.log('Data:', data);
                
            }).catch((error) => {
                console.error('Error:', error);
            });
        }
    }

    DOMTitle(titre){
        this.DOMTitre.innerText=titre;
    }

    DOMProgress(message){
        this.DOMStatus.innerText=message;
    }

    DOMDataInfos(){

        this.DOMDatas.style.display = this.data?'block':'none';
        if(!this.data)return;

        this.DOMDatas.innerHTML = `<h3>Données</h3><p>${this.data.length} lignes</p>`;
        let table = document.createElement('table');
        
        let thead = document.createElement('thead');
        let trhead = document.createElement('tr');
        for(let field of this.fields){
            let th = document.createElement('th');
            th.innerHTML = `${field.description?field.description:field.name}`;
            trhead.appendChild(th);
        }
        thead.appendChild(trhead);
        table.appendChild(thead);

        let tbody = document.createElement('tbody');
        for(let d of this.data.slice(0,10)){
            let tr = document.createElement('tr');
            for(let field in this.fields){
                let td = document.createElement('td');
                td.innerHTML = d[field];
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        this.DOMDatas.appendChild(table);
    }

    DOMFieldsInfos(){
        this.DOMFields.style.display = this.fields?'block':'none';
        if(!this.fields)return;

        this.DOMFields.innerHTML = `<h3>Colonnes</h3><p>${this.fields?.length} Colonnes</p>`;

        let ul = document.createElement('ul');
        for(let field of this.fields.filter(f=>f.name!='_id')){
            let li = document.createElement('li');
            li.innerHTML = `${field.description?field.description:field.name}`;
            li.addEventListener('click',()=>{this.addToquery(field.description?field.description:field.name)});
            ul.appendChild(li);
        }
        this.DOMFields.appendChild(ul);
    }

    initFromCSV(file){
        this.DOMSchema.classList.add('parsing');
        this.DOMProgress('Parsing ...');
        
        Papa.parse(file, {
            header: false,
            dynamicTyping: false,
            complete: this.loadParsed.bind(this)
        });
    }

    loadParsed(results){
        // Champs
        this.fields = results.data[0].map((f,i)=>{return {index:i,name:f,type:'text',length:0}});
        
        // Recherche des longueur de champs (sauf dans ligne d'entete)
        for(let row of results.data.slice(1)){
            for(let field of this.fields){
                if(row[field.index] && row[field.index].length>field.length){
                    field.length = row[field.index].length;
                }
            }
        }
        // Donnees à importer (sauf en-tete / ligne 1)
        this.data = results.data.slice(1);
        
        // Affichage
        this.DOMSchema.classList.remove('parsing');
        this.DOMSchema.classList.add('parsed');
        this.DOMProgress('Parsed');

        // Affichage des infos datas et fields
        this.DOMDataInfos();
        this.DOMFieldsInfos();

        // Actions
        for(let action of [...this.DOMActions.children].filter(a=>a.dataset.action!='delete')){
            action.remove();
        };
        let btn = document.createElement('button');
        btn.innerText = 'Importer';
        btn.addEventListener('click',this.importer.bind(this));
        this.DOMActions.appendChild(btn);        
    }

    importer(){
        this.DOMSchema.classList.add('importing');
        this.DOMProgress('Importing ...');

        console.log('Import',this);

        fetch('/admin/csv',{
            method:'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({id:this.id,fields:this.fields,data:this.data})
        })
        .then(response => response.json())
        .then(data => {

            if(data.code==0){
                this.local = false;
                // Affichage
                this.DOMSchema.classList.add('imported');
                this.DOMProgress('Imported');
                setTimeout(() => {
                    this.DOMSchema.classList.remove('parsed');
                    this.DOMSchema.classList.remove('imported');
                }, 2000);                

                // Actions
                for(let action of [...this.DOMActions.children].filter(a=>a.dataset.action!='delete')){
                    action.remove();
                };
            }else{
                this.DOMSchema.classList.add('error');
                this.DOMProgress('Import : ' + data.message);
            }
        })
        .catch((error) => {
            this.DOMSchema.classList.add('error');
            console.error('Error:', error);
        }).finally(()=>{
            this.DOMSchema.classList.remove('importing');
        });    
    }

    supprimer(){
        if(!confirm('Supprimer ce schema ?')) return;
        if(this.local){
            this.DOMProgress('Supprimé');
            setTimeout(() => {
                this.DOMSchema.dispatchEvent(this.onRemove);
            }, 2000);
            return;
        }

        fetch('/admin/schemas/'+this.id,{
            method:'DELETE'
        }).then(response => response.json())
        .then(data => {
            console.log('retour',data);
            
            if(data.code==0){
                this.DOMProgress('Supprimé');
                setTimeout(() => {
                    this.DOMSchema.dispatchEvent(this.onRemove);
                }, 2000);
            }else{
                this.DOMSchema.classList.add('error');
                this.DOMProgress('Suppression : ' + data.message);
            }

        })
    }

};

window.onload = function() {

    let DOMSchemas = document.getElementById('workspace');
    DOMSchemas.addEventListener('remove',schemaRemoveListener);

    let file = document.getElementById('file');
    file.addEventListener('change',function(e){
        if(e.target.files.length==0) return;
        let fichier = e.target.files[0];
        addFile(fichier);
    });

    loadSchemas();

}

const loadSchemas = async ()=>{
    fetch('/admin/schemas')
    .then(response => response.json())
    .then(data => {
        data.data.forEach(schema=>{
            addSchema(schema);
        })
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

const addSchema = async (schema)=>{
    let DOMSchemas = document.getElementById('workspace');
    let _schema = VAR_schemas.find(s=>s.id==schema.id);
    if(!_schema){
        _schema = new Schema(schema.id,schema.fields,null,false);
        VAR_schemas.push(_schema);
        DOMSchemas.appendChild(_schema.DOMSchema);
    }else{
        _schema.fields = schema.fields;
    }
}

const addFile = async (fichier)=>{
    let DOMSchemas = document.getElementById('workspace');
    let id = clearId(fichier.name);
    let schema = VAR_schemas.find(s=>s.id==id);
    if(!schema){
        schema = new Schema(id,null,null,true);
        VAR_schemas.push(schema);
        DOMSchemas.prepend(schema.DOMSchema);
    }
    schema.initFromCSV(fichier);
}

const schemaRemoveListener = (event)=>{
    
    let DOMSchemas = document.getElementById('workspace');
    let schema = VAR_schemas.find(s=>s.id==event.target.dataset.id);
    
    if(schema){
        VAR_schemas = VAR_schemas.filter(s=>s.id!=event.target.dataset.id);
    }
    DOMSchemas.removeChild(event.target);
}


afficherParse = ()=>{

    let div = document.getElementById('parsed');
    div.innerHTML = '';

    let table = document.createElement('table');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    let tr = document.createElement('tr');
    for(let field of VAR_schema.fields){
        let th = document.createElement('th');
        th.innerHTML = field.name;
        tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);

    for(let row of VAR_schema.data.slice(0,10)){
        let tr = document.createElement('tr');
        for(let field of VAR_schema.fields){
            let td = document.createElement('td');
            td.innerHTML = row["F"+field.index];
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    div.appendChild(table);
}

