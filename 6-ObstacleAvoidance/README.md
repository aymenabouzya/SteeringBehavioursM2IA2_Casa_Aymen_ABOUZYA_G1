# Orbital Drift — course aux cristaux

Ouvrir `index.html` avec Live Server pour lancer le jeu. Avant chaque départ, l'écran de briefing présente la campagne de 20 niveaux, le pilotage manuel et automatique, les cristaux, les combats, les portails A/B et les réglages. Le vaisseau du joueur démarre en mode manuel : déplace la souris pour le diriger rapidement vers le pointeur; plus la souris bouge vite, plus le vaisseau accélère pour la suivre. Quand elle s'arrête, sa vitesse maximale revient progressivement à la normale. Le bouton de pilotage ou la touche M bascule en mode automatique, où il poursuit le cristal vivant le plus proche, évite les corps célestes et fuit les avions rouges qui approchent. Le mode sélectionné reste actif entre les parties jusqu'à ce que le joueur le change. Les chasseurs rouges gardent les cristaux et interceptent les avions blancs qui s'en approchent. Le joueur peut tirer des missiles à tête chercheuse, activer le tir automatique et inverser l'attraction des planètes. En difficulté Pilote, les vagues arrivent toutes les 25 secondes, ajoutent deux chasseurs (jusqu'à 28) et accélèrent progressivement les ennemis jusqu'à un plafond de 50 %.

L'écran de briefing propose trois difficultés, sauvegardées dans le navigateur et sélectionnées avant la partie :

- **Cadet** : 7 chasseurs, vagues toutes les 35 secondes, renforts limités et boss à 3 points de vie.
- **Pilote** : 12 chasseurs, vagues toutes les 25 secondes et boss à 5 points de vie.
- **As** : 16 chasseurs, vagues toutes les 20 secondes, renforts et vitesse ennemie accrus, boss à 7 points de vie.

La campagne comprend 20 niveaux : **1 Premier contact** (ramasser 3 cristaux), **2 Ceinture d'astéroïdes** (survivre 20 s), **3 Patrouille ennemie** (détruire 3 chasseurs), **4 Ravitaillement d'urgence** (récupérer 2 cristaux bonus), **5 Le gardien du secteur** (vaincre le boss); **6 Renforts rouges** (5 cristaux), **7 Course contre la vague** (survivre 30 s), **8 Briser l'encerclement** (détruire 5 chasseurs), **9 Réserve de munitions** (3 cristaux bonus), **10 Croiseur de l'avant-garde** (boss); **11 Navigation à vue** (6 cristaux), **12 Fuite gravitationnelle** (survivre 40 s), **13 Éliminer les poursuiveurs** (détruire 6 chasseurs), **14 Bouclier critique** (4 cristaux bonus), **15 Le commandant apparaît** (boss); **16 Dernier ravitaillement** (7 cristaux), **17 La flotte entière** (survivre 50 s), **18 Ouvrir le passage** (détruire 8 chasseurs), **19 Dernière chance** (5 cristaux bonus) et **20 Bataille de la Terre** (vaincre le commandant). Le briefing permet de consulter cette liste complète. Avant le premier départ et à chaque transition, un panneau présente une consigne précise et la quantité à atteindre; pour un boss, il affiche aussi ses points de vie selon la difficulté. Le HUD affiche le numéro et la progression de chaque niveau. À chaque objectif atteint, la simulation s'arrête et le panneau présente le prochain objectif; clique sur **PASSER À L'ÉTAPE** pour continuer. Les boss arrivent aux niveaux 5, 10, 15 et 20 et gagnent 2 points de vie à chaque apparition. Chaque transition augmente aussi les renforts et la vitesse des chasseurs. La victoire est acquise en détruisant le commandant du niveau 20. Le score dépend du nombre de cristaux capturés et d'ennemis détruits; il constitue un bonus et un record, pas une condition de victoire.

Les cristaux standards rapportent 25 points et une munition. Des cristaux bonus dorés rechargent jusqu'à 10 missiles; les violets restaurent le bouclier. Chaque cristal bonus donne 75 points. À chaque niveau de boss, celui-ci poursuit le joueur avec les mêmes comportements de pilotage des chasseurs; son indicateur de vie est visible au-dessus de lui et chaque missile lui retire un point de vie. Sa collision reste fatale, même si le bouclier est actif.

Deux petits trous noirs, **A** et **B**, apparaissent loin des planètes et des autres corps célestes. En entrant dans l'un, le joueur ressort par l'autre. Les deux portails se rechargent ensuite pendant 3 secondes; leur état est indiqué dans le HUD.

Les records sont séparés par difficulté. **Espace**, **Échap** ou le bouton de pause suspend/reprend la simulation et ses minuteries; l'écran de pause permet de reprendre. Après une défaite, **RECOMMENCER CE NIVEAU** et **R** relancent le niveau perdu depuis le début avec le score et les ressources réinitialisés; **RECOMMENCER AU NIVEAU 1** redémarre la campagne. Après une victoire, ces options permettent de rejouer le niveau final ou de relancer la campagne. **CHOISIR UNE AUTRE DIFFICULTÉ** revient au briefing sans recharger la page.

Les panneaux **SYSTEM DIAGNOSTICS** et **FLIGHT CONTROL** sont visibles au briefing et après la partie, puis se masquent au lancement pour dégager l'écran. Le bouton **AFFICHER LES PANNEAUX** les révèle à la demande pendant la partie; **MASQUER LES PANNEAUX** les replie de nouveau. Les commandes clavier restent disponibles.

La vitesse de vol démarre à **1,4×**. Tu peux l'augmenter à tout moment avec le curseur **VITESSE DE VOL**, jusqu'à **2×**. Le réglage choisi reste actif entre les parties.

Le fond spatial est une galaxie spirale générée localement sur un canvas secondaire : noyau blanc-rosé décalé vers la gauche, deux bras bleus et violets aux contours diffus, nuages de gaz rose-magenta, bandes de poussière sombres et champ dense d'étoiles bleues, blanches et dorées. Sa composition elliptique et inclinée évoque une galaxie vue de biais. Il n'utilise aucune image distante et reste disponible hors ligne. La texture fixe est mise en cache et recréée au redimensionnement; seules quelques étoiles du premier plan scintillent et se déplacent légèrement en parallaxe pendant la simulation. Le soleil et les planètes utilisent aussi des textures procédurales mises en cache : le soleil présente une granulation rouge-orange dense, des régions actives, des taches sombres, une couronne lumineuse et des éruptions animées; les planètes ont des bandes atmosphériques, un ombrage sphérique et des anneaux dessinés en deux couches autour de Saturne. Trois astéroïdes facettés, stationnaires et évitables complètent l'arène; **Maj + clic** en ajoute un à la position du curseur pendant la partie. Les zones d'influence restent cachées en jeu et apparaissent avec le mode debug.

## Commandes

- **Entrée** ou bouton **JOUER** : commencer depuis l'écran d'accueil.
- Après une défaite : **RECOMMENCER CE NIVEAU** ou **R** pour rejouer le niveau perdu; **RECOMMENCER AU NIVEAU 1** pour redémarrer la campagne.
- **Espace**, **Échap** ou bouton **PAUSE** : suspendre/reprendre la simulation et ses minuteries.
- À la fin d'une étape : le panneau **OBJECTIF ATTEINT** arrête la simulation jusqu'au clic sur **PASSER À L'ÉTAPE**.
- **Souris** : en mode manuel, dirige le vaisseau vers la position du pointeur avec un steering d'arrivée; le vaisseau ralentit en s'approchant de la cible.
- Un repère circulaire vert apparaît à côté du pointeur en mode manuel et le suit rapidement pour visualiser la cible du vaisseau.
- **Bouton PILOTAGE AUTOMATIQUE** ou **M** : activer l'IA depuis le mode manuel initial; le même bouton permet ensuite de revenir au pilotage manuel à la souris. Le pilotage automatique, la fuite, l'évitement et la gravité n'imposent pas leur trajectoire au joueur en mode manuel. Les chasseurs, eux, conservent leur IA.
- **Clic** : tirer vers le chasseur ou le boss le plus proche.
- **T** : activer ou couper le tir automatique.
- **B** ou bouton de bouclier : protéger toute l'escadrille pendant 4 secondes; recharge de 15 secondes.
- **G** : activer ou désactiver l'anti-gravité.
- **D** : visualiser les projections d'évitement et les cercles de collision.
- **Espace**, **Échap** ou **PAUSE** : suspendre ou reprendre la partie sans faire avancer les vagues, les missiles ou les rechargements.
- **Maj + clic** : ajouter un astéroïde à la position du curseur.
- **P / O** : ajouter une planète ou un petit obstacle au curseur.
- **Trous noirs A/B** : entrer dans l'un pour ressortir par l'autre; ils sont éloignés des planètes et se rechargent en 3 secondes.
- **Panneau FLIGHT CONTROL** : régler la vitesse, choisir de 8 à 60 cristaux, ajuster la portée de défense rouge de 80 à 300 px et ajouter jusqu'à 20 avions supplémentaires dans chaque escadrille. Le bouton ⚙️ replie le panneau.
- **Comportement de flotte** : `MISSION` poursuit les cristaux (mode initial), `ESSAIM` ajoute séparation, alignement et cohésion, et `PATROUILLE` suit un circuit elliptique par projection sur ses segments.
- Un chasseur rouge ou une planète qui touche l'avion blanc du joueur termine immédiatement la partie, quelle que soit la difficulté. Le bouclier actif protège des chasseurs mais pas des planètes. Le pilotage automatique donne priorité à l'évitement des corps célestes; en mode manuel, le joueur doit les éviter lui-même. Les avions blancs alliés peuvent être interceptés sans terminer la partie. **R** ou le bouton de reprise relance la partie.
- Le meilleur score est affiché au HUD et sauvegardé localement dans le navigateur.
- Le radar tactique en bas à gauche place les chasseurs rouges autour de votre avion; ceux hors de la portée radar apparaissent au bord du cercle.

Chaque cristal ramassé par l’avion joueur ou un allié rapporte des points et fournit les bonus indiqués ci-dessus. Le stock est plafonné à 50; recevoir des munitions interrompt le rechargement si le chargeur n'est plus vide. Détruire un chasseur rapporte 50 points. La victoire nécessite de terminer les quatre premiers objectifs puis de détruire le boss; le contact fatal avec un chasseur, le boss ou un corps céleste termine immédiatement la partie.

## Architecture et steering

`index.html` relie les modules dans l'ordre de leurs dépendances : p5.js, `vehicle.js`, entités et comportements, `boss.js`, règles, HUD, puis `sketch.js`. Le fichier de style est chargé par la même page. `sketch.js` orchestre la simulation et l'affichage; il ne remplace pas les calculs de locomotion des véhicules.

`Vehicle` fournit les vecteurs, `seek`/`arrive`, `applyForce`, `update` et les bords. `Ship` étend cette base et réutilise le passage d'un bord à l'autre du canvas. Son apparence ajoute un fuselage, des ailes, une verrière et des jets; le roulis visuel suit l'accélération latérale avec amortissement et la poussée suit l'accélération. Ces détails n'interviennent pas dans les règles de locomotion héritées. En mode manuel, `Ship.steerToPointer()` utilise `arrive` vers le pointeur de la souris, puis applique cette force avec `applyForce`; un repère circulaire vert suit rapidement le pointeur, en rattrapant 82 % de son déplacement à chaque image. Le pilote doit éviter les planètes. Le mode `MISSION` choisit le cristal vivant le plus proche, fuit les chasseurs rouges, évite les corps célestes et sépare les appareils proches. Si un corps céleste menace sa trajectoire, le pilotage automatique donne priorité à la force d'évitement au seek. Le contact avec le soleil ou une planète termine immédiatement la partie; le bouclier ne protège que des chasseurs. Le mode `ESSAIM` ajoute les forces distinctes d'alignement et de cohésion; les forces sont additionnées puis bornées par `maxForce`. Le mode `PATROUILLE` anticipe sa position, projette ce point sur chaque segment du circuit, puis seek une cible légèrement en avant de la projection. L'évitement prédictif, la gravité, la poursuite des cibles et le wander des cristaux restent disponibles pour le pilotage autonome.

Les comportements réutilisent les principes des autres exemples du dépôt sans dupliquer ni modifier la locomotion de `Vehicle` :

- `flocking.js` calcule séparément séparation, alignement et cohésion dans un voisinage local; `ship.js` compose ces forces selon le mode choisi.
- `pathFollowing.js` projette un point anticipé sur le circuit avant de calculer le steering de patrouille.
- `ship.js` combine arrive/seek, fuite, évitement prédictif, séparation et gravité; en manuel, `steerToPointer()` suit le pointeur de la souris avec arrive.
- `hunter.js` applique la poursuite et l'interception des avions menaçant les cristaux; `target.js` combine wander et fuite; `missile.js` poursuit une position prédite.
- `obstacle.js` définit des corps stationnaires qui restent dans la hiérarchie `Vehicle`; `gameRules.js` isole les collisions et la collecte; `hud.js` affiche l'état fourni par le contrôleur.
- `blackHole.js` dessine les deux portails appariés et gère le transfert du joueur et leur recharge; `gameRules.js` vérifie les positions éloignées des corps célestes.

Les réseaux neuronaux de voitures et les séquences génétiques de missiles sont des systèmes d'apprentissage différents des comportements réactifs de ce jeu; ils ne remplacent pas son steering.

## Déploiement et présentation

- **GitHub Pages** : publier le dépôt depuis sa racine puis ouvrir `6-ObstacleAvoidance/`.
- **IDE** : à compléter par l'étudiant.
- **Modèles d'IA utilisés** : à compléter selon les outils réellement utilisés.
- **Capture d'écran** : à ajouter après la partie de démonstration.

## MON EXPERIENCE

- Pourquoi ai-je choisi le thème spatial ?
- Comment seek, arrive et l'évitement ont-ils modifié le mouvement du vaisseau ?
- Quels réglages ai-je changés pour rendre les chasseurs intéressants ?
- Quelle difficulté ai-je rencontrée et comment l'ai-je résolue ?
- Qu'est-ce que je souhaite améliorer dans une prochaine version ?
