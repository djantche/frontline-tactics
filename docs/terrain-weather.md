# Terrains, météo et brouillard : état réel

Audit du 4 novembre 2026, comparé à l’arbre Git Commander Wars
`1317abdca8bac906d3aebfb360075660e7c27243`.

## Fichiers présents et fonctionnalités intégrées

Les **1 232 PNG** de `resources/images/terrain/` de Commander Wars sont présents
sous `public/commander-wars/images/terrain/`, palettes comprises. Leur contenu a
été comparé aux SHA Git de l’arbre : aucun fichier manquant ou différent.
Cela comprend **93 fichiers de plage**, **115 fichiers de mer** et les masques de
brouillard. Présence sur disque et prise en charge par le moteur sont distinctes.

L’éditeur propose les 19 terrains/bâtiments déjà compris par le format et les
règles de Frontline Tactics. Les terrains supplémentaires de Commander Wars
(désert, ruines, lave/plasma, téléporteurs, etc.) ne deviennent pas jouables par
la simple présence de leurs images.

## Correction des plages et du littoral

L’ancien rendu utilisait `shoal.png` partout, sans tenir compte des voisins.
Le nouveau rendu sélectionne les masques côtiers selon la terre, l’eau, les plages
adjacentes et les diagonales. Les récifs ont un fond de mer, puis leur couche de
rochers. Éditeur, miniatures et partie utilisent la même sélection.

Les masques Commander Wars encodent les coordonnées d’une palette dans leurs
canaux rouge et vert. Ils doivent être recolorés, et non affichés directement.
`coastal-atlas.ts` fait cette conversion avec les palettes AW2 existantes pour
conserver le style des autres terrains. Un atlas rassemble 169 variantes
(1 352 images d’animation) pour éviter des centaines de requêtes HTTP. Les huit
images des bandes côtières sont conservées ; la partie les anime et l’éditeur
montre une image fixe.

Reconstruction de l’atlas, sans téléchargement ni modification des sources :

```sh
python3 tools/build-coastal-atlas.py
```

Pillow est nécessaire uniquement pour reconstruire cet asset ; le jeu utilise
les fichiers PNG/JSON générés, sans Python.

Références : [BEACH.js](https://github.com/Robosturm/Commander_Wars/blob/master/resources/scripts/terrain/BEACH.js),
[SEA.js](https://github.com/Robosturm/Commander_Wars/blob/master/resources/scripts/terrain/SEA.js),
[shader des palettes](https://github.com/Robosturm/Commander_Wars/blob/master/system/frac_matrix_shader.glsl).
Les assets sources existants conservent leur attribution.

## Météo et brouillard

| Fonction             | Règles / données                                                 | Rendu                                                               | Accès actuel                                                |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Temps clair          | Présent                                                          | Présent                                                             | Réglage des salons actuels                                  |
| Pluie                | Coûts de déplacement, vision et pouvoirs météo existants         | Sélection des sprites pluie existants et palette côtière branchées  | Aperçu de l’éditeur ; peut être déclenchée par les pouvoirs |
| Neige                | Coûts de déplacement et pouvoirs météo existants                 | Sélection des sprites neige existants et palette côtière branchées  | Aperçu de l’éditeur ; peut être déclenchée par les pouvoirs |
| Tempête de sable     | Déclarée dans le schéma et certaines règles AWDS                 | Pas de rendu spécifique dans cette intégration                      | Pas de choix dans le salon                                  |
| Brouillard de guerre | Calcul de vision et filtrage d’événements partiellement présents | Pas de masque de carte ni de synchronisation complète de visibilité | Désactivé dans la création des salons                       |

Les variantes pluie/neige n’existent pas pour tous les anciens sprites ; une
route ou un pont sans variante dédiée conserve son image normale. Il n’y a pas
d’effet de précipitations (gouttes/flocons) ajouté par ce correctif. Les règles
météorologiques préexistantes ne sont pas présentées comme une reproduction
exhaustive de toutes les versions de Commander Wars.

Le menu « Aperçu météo » de l’éditeur ne modifie ni les tuiles sauvegardées, ni les
règles d’une partie. La météo appartient aux règles et à l’état de la partie.
La création des salons conserve actuellement `weatherSetting: "clear"` et
`fogOfWar: false`.

### Pourquoi ne pas activer le brouillard immédiatement ?

`match.full` renvoie toutes les unités. Il ne suffit donc pas de dessiner un voile
sur la carte : le serveur doit d’abord limiter les snapshots et les événements aux
informations autorisées pour chaque joueur. Le rendu doit ensuite utiliser cette
visibilité, y compris après une reconnexion. `Vision` et certains événements ont
aussi besoin de tests dédiés avant d’exposer ce mode. Les masques PNG sont déjà
présents, mais cela ne constitue pas un brouillard de guerre fonctionnel.
