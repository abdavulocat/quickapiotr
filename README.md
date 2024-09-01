# QuickAPI

Tu penses qu'il mettrait une API pour consulter les données dans l'appli que tu construis ?
Ben non : on te laisse te debrouiller avec des CSV qu'on te filera de temps en temps.

Et si on avait un petit serveur API CRUD flexible et pas prise de tête ?

Y'a bien quelque truc en lignes, ou suffit de t'inscrire et t'as une url.
Mais j'aime pas m'inscrire et je me dis que c'est l'occasion de refaire un peu de node.js

Le besoin, c'est simple : 
1. je me connecte à une interface d'admin (un peu sécurisé quand même...)
2. je peux y glisser un fichier CSV (tralala.csv)
3. et j'ai une api http://monserveur/tralala/ pour taper dans les données du CSV

Quelques besoins non fonctionnels : 
1. y'a que celui qui a le mot de passe au lancement du service qui peu jouer la-dedans (admin et get)

## Je veux l'utiliser immédiatement

Doucement l'ami, il va falloir donner un peu du tien avant.
Ici t'as une application web mais il lui faut une base de données Postgresl. 

oui, j'aurais pu developper la base ou utiliser des modules déjà fait mais que veux-tu : mon besoin à moi c'est sur des gros fichier (50Mo max), et aujourd'hui, instancier une base de données c'est plus une prouesse comme il y a 10 ans. Donc autant prendre du lourd.  

T'as 2 approches possibles. 

### Approche 1 : t'as déjà ta base postGresql (ou t'es chaud pour en faire une)

D'abord deployer et lancer QuickAPI Sur la machine qui servira l'api (ben oui...faut un serveur. je rentre pas dans le détail...mais si ça te surprend et que tu continues...j'admire ta pérsévérence ! je te suggère quand même d'aller lire quelques tuto sur c'est quoi une API voir un service réseau en fait)

t'as bien sûr git installé sur cette machine.

    git clone https://github.com/abdavulocat/QuickAPI
    cd QuickAPI
    npm install

et à la racine du dossier, tu crées un fichier .env avec dedans : 

    HOST=l'interface réseau qui va écouter : localhost, 0.0.0.0 ou l'adresse IP
    PORT=le port sur lequel l'api écoute.
    FORCEDATABASE=1 si tu veux que l'appli crée la base si elle n'existe pas, sinon 0
    PGHOST=l'adresse IP de ta base de données ou le nom de la machine
    PGPORT=le port d'écoute de ta base
    PGDATABASE=le nom de la base, si quickapi te plait pas
    PGUSER=l'utilisateur qui a droit de créer des base dans postegresql
    PGPASSWORD=et son mot de passe
    QATOKEN=un texte assez long qui servira à proteger un peu les accès. Si vide, on part sur du OpenBar en happy hour

T'as pas envie de faire un .env : tu peux aussi créer ces variables d'environnements.
Bien sûr tu met les bonnes valeurs, tu recopies pas bêtement ça.

Ensuite, si ta base est OK et que t'as mis les bonne valeurs, tu lances :

    npm run start

qui est en fait un raccourci pour lancer node avec les bons paramètres

    node --env-file=.env src/index.js


### 2. Approche 2 : Et Docker !? c'est pour les baleines ?

On va crée un container avec la base et l'api

Comme au dessus, tu installes QuickAPI mais t'en profite en plus pour construire l'image à l'aide du Dockerfile tout prêt.

    git clone https://github.com/abdavulocat/QuickAPI
    cd QuickAPI
    npm install
    docker build -t quickapi:latest .

Et ensuite tu vas dans le dossier /.compose et tu composes (surprenant !)
Libre à toi de modifier le docker-compose.yaml (au moins QATOKEN) mais sache qu'en l'état t'auras 2 conteneur, dont 1 qui va exposer l'api sur le port 90 de l'adresse IP (externe) du host Docker. Et t'auras aussi un volume en plus pour pas perdre ta base à chaque arrêt du conteneur.

    docker compose -p quickapi up

### et ensuite ?

t'as la console d'admin http://tonserveur:tnport/admin 
Si t'as indiqué un QATOKEN dans les variables alors t'aura un formulaire où faudra l'indiquer pour entrer.

Ensuite, tu le laisses guider.

Le principe est simple : 
1. tu indiques un fichier CSV
2. il le parse est t'indique les colonnes
3. tu l'importes : une table est crée et tu peux dorénavant y acceder via http://tonserveur:tnport/api/le nom du fichier

soit un get : ça te renvoi les premières lignes
soit un post avec comme message : 

    {
        "filtre":{
            "colonne1":"critère 1",
            "colonne2":"critère 2",
        }
    }


ou en mode SQL plus souple : 

    {
        "filtre":" [colonne 1]='critère 1' OR [colonne 2] ilike 'critère 2%'"
    }

Je te rappelle c'est du CSV et tout les champs sont du texte.
Pour chercher sur des dates, il va falloir ruser dans le SQL.

## On peut pas sécuriser ça en SSL ?
Bien sûr ! j'attend ton Pull Request ou fais un fork. 
Moi, je deploie ça derrière un reverse-proxy qui se charge de faire du SSL en amont et ça me va.

## C'est pas très beau
C'est vrai...c'est vite fait pour avoir rapidement une API pour taper dans des fichiers CSV.
Je m'amuserez à pimper le CSS à l'occasion
