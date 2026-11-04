import type { CO } from "shared/schemas/co";

export type COTexts = { dayToDay?: string; power?: string; superPower?: string };

export const guideFr = {
  title: "Comment jouer",
  description:
    "Frontline Tactics reprend les règles d'Advance Wars 2 : un jeu de tactique au tour par tour où l'économie compte autant que le combat. Tous les chiffres de ce guide viennent directement du moteur du jeu.",
  contents: "Sommaire",
  sections: {
    objective: "Objectif",
    turn: "Déroulement d'un tour",
    units: "Unités",
    terrain: "Terrain",
    combat: "Combat",
    economy: "Capture et économie",
    cos: "Commandants",
    weather: "Météo",
    controls: "Commandes",
  },
  objective: {
    intro:
      "Une partie oppose deux armées sur une carte. Vous gagnez dès que l'un de ces cas se produit :",
    conditions: [
      "Vous capturez le QG adverse.",
      "Vous détruisez la dernière unité adverse.",
      "Vous atteignez la limite de propriétés capturées fixée par le salon.",
    ],
    crash:
      "Attention : une armée dont toutes les unités s'écrasent ou coulent faute de carburant perd aussi la partie.",
  },
  turn: {
    intro:
      "Les joueurs jouent chacun leur tour. Une journée se termine quand tout le monde a joué. Au début de votre tour :",
    start: [
      "Vous touchez le revenu de vos propriétés.",
      "Vos unités posées sur une propriété adaptée sont ravitaillées et réparées.",
      "Vos unités aériennes et navales consomment du carburant, et s'écrasent ou coulent s'il n'en reste plus.",
    ],
    during:
      "Ensuite, vous agissez dans l'ordre de votre choix : produire des unités, déplacer, attaquer, capturer. Chaque unité agit une seule fois par tour. Une unité produite ne peut agir qu'à partir du tour suivant. Terminez avec le bouton « Fin du tour ».",
  },
  units: {
    intro:
      "Chaque unité a un coût, une capacité de déplacement, une portée de tir, du carburant et parfois des munitions. Les unités se produisent là où leur type l'exige.",
    tabLand: "Base (terre)",
    tabAir: "Aéroport (air)",
    tabSea: "Port (mer)",
    name: "Unité",
    cost: "Coût",
    move: "Déplacement",
    range: "Portée",
    vision: "Vision",
    fuel: "Carburant",
    ammo: "Munitions",
    none: "—",
    roles: [
      {
        title: "Fantassins",
        text: "Infanterie et bazookas sont les seuls à capturer les propriétés. Peu chers, ils passent presque partout.",
      },
      {
        title: "Unités directes",
        text: "Elles se déplacent puis attaquent une case adjacente. Elles peuvent riposter si elles survivent.",
      },
      {
        title: "Unités indirectes",
        text: "Artillerie, roquettes, missiles et cuirassés tirent à distance, mais seulement sans s'être déplacés ce tour-ci. Ils ne ripostent jamais.",
      },
      {
        title: "Transports",
        text: "Ils chargent des unités pour les déposer plus loin. Le VTT ravitaille aussi les unités voisines.",
      },
    ],
  },
  terrain: {
    intro:
      "Le terrain change tout. Ses étoiles réduisent les dégâts reçus, et son coût de déplacement limite la portée de vos unités. Une case marquée d'un tiret est infranchissable.",
    name: "Terrain",
    stars: "Défense",
    foot: "Infanterie",
    boots: "Bazooka",
    treads: "Chenilles",
    tires: "Roues",
    air: "Air",
    sea: "Mer",
    lander: "Barge",
    none: "—",
    names: {
      plain: "Plaine",
      road: "Route",
      bridge: "Pont",
      river: "Rivière",
      forest: "Forêt",
      mountain: "Montagne",
      sea: "Mer",
      shoal: "Plage",
      reef: "Récif",
      city: "Ville",
      base: "Base",
      airport: "Aéroport",
      port: "Port",
      hq: "QG",
      lab: "Laboratoire",
      commtower: "Tour de com.",
    },
  },
  combat: {
    intro:
      "Une unité attaque après s'être déplacée (sauf les unités indirectes). Les dégâts dépendent de l'attaquant, de la cible et de plusieurs facteurs :",
    factors: [
      {
        title: "Les PV de l'attaquant",
        text: "Une unité à 5 PV sur 10 frappe deux fois moins fort. Attaquer en premier réduit donc la riposte.",
      },
      {
        title: "Le terrain du défenseur",
        text: "Chaque étoile protège d'autant plus que le défenseur a de PV. Un tank sur une ville encaisse bien mieux que sur une route.",
      },
      {
        title: "La chance",
        text: "Un bonus aléatoire de 0 à 9 % s'ajoute aux dégâts. Certains commandants le modifient.",
      },
      {
        title: "Les bonus de commandant",
        text: "Ils modifient la puissance de feu et la défense, surtout quand un pouvoir est actif.",
      },
    ],
    counter:
      "Si le défenseur survit à une attaque au corps à corps et possède une arme directe, il riposte avec les PV qui lui restent.",
    explorerTitle: "Dégâts de base",
    explorerIntro:
      "Choisissez un attaquant pour voir ses dégâts de base à pleine santé, sur un terrain sans étoile et sans chance.",
    attacker: "Attaquant",
    cantAttack: "Aucune unité ne peut être attaquée.",
    formulaTitle: "La formule complète",
    formula:
      "Dégâts % = (base × attaque / 100 + chance) × PV attaquant / 10 × (200 − (défense + étoiles × PV défenseur)) / 100",
  },
  economy: {
    capture: {
      title: "Capturer",
      text: "Une propriété possède 20 points de capture. Placez dessus un fantassin et choisissez « Capturer » : elle perd autant de points que l'unité a de PV. Une unité à 10 PV capture donc en deux tours. Si elle quitte la case, le compteur repart de zéro.",
    },
    income: {
      title: "Revenu",
      text: "Chaque ville, base, aéroport, port et QG possédé rapporte le revenu fixé par le salon à chaque tour. Les laboratoires et tours de communication ne rapportent rien.",
    },
    repair: {
      title: "Réparer et ravitailler",
      text: "Au début de votre tour, une unité sur une propriété alliée adaptée récupère son carburant et ses munitions, et jusqu'à 2 PV. Chaque PV coûte 10 % du prix de l'unité : sans fonds, pas de réparation.",
    },
    fuel: {
      title: "Carburant",
      text: "Se déplacer consomme du carburant. Les unités aériennes et navales en consomment aussi à chaque tour et disparaissent à zéro, sauf si elles sont sur une propriété de réparation adaptée.",
    },
  },
  cos: {
    intro:
      "Chaque joueur choisit un commandant. Il donne des effets permanents et deux pouvoirs à activer. La jauge se remplit quand vos unités subissent des dégâts, et deux fois moins vite quand elles en infligent. Le coût en étoiles augmente de 20 % à chaque utilisation. Tant qu'un pouvoir est actif, vos unités gagnent 10 % de défense.",
    dayToDay: "En permanence",
    noDayToDay: "Aucun effet permanent.",
    power: "Pouvoir",
    superPower: "Super pouvoir",
    stars: (stars: number) => `${stars} ★`,
    texts: {
      andy: {
        power: "Toutes les unités récupèrent 2 PV.",
        superPower:
          "Toutes les unités récupèrent 5 PV et gagnent 20 % de puissance de feu et 1 de déplacement.",
      },
      max: {
        dayToDay:
          "Les unités directes hors fantassins ont +20 % de puissance de feu. Les unités indirectes ont -10 % de puissance de feu et -1 de portée.",
        power:
          "Les unités directes hors fantassins gagnent 1 de déplacement et +20 % de puissance de feu.",
        superPower:
          "Les unités directes hors fantassins gagnent 2 de déplacement et +40 % de puissance de feu.",
      },
      sami: {
        dayToDay:
          "Les fantassins ont +30 % de puissance de feu et capturent 1,5 fois plus vite (arrondi à l'inférieur). Les transports ont +1 de déplacement. Les autres unités directes ont -10 % de puissance de feu.",
        power: "Les fantassins gagnent 1 de déplacement et +20 % de puissance de feu.",
        superPower:
          "Les fantassins gagnent 2 de déplacement, +50 % de puissance de feu et capturent instantanément.",
      },
      nell: {
        dayToDay: "La chance augmente de 10 % (20 % au total).",
        power: "La chance augmente de 40 % de plus (60 % au total).",
        superPower: "La chance augmente de 80 % de plus (100 % au total).",
      },
      hachi: {
        dayToDay: "Les unités coûtent 10 % de moins.",
        power: "Le coût des unités passe à 50 %.",
        superPower:
          "Le coût des unités passe à 50 %. Les unités terrestres peuvent être produites dans les villes.",
      },
      olaf: {
        dayToDay:
          "Les unités se déplacent dans la neige comme par temps clair, et sous la pluie comme dans la neige.",
        power: "Il neige jusqu'au prochain tour.",
        superPower: "Toutes les unités ennemies perdent 2 PV, et il neige jusqu'au prochain tour.",
      },
      grit: {
        dayToDay:
          "Les unités indirectes ont +1 de portée et +20 % de puissance de feu. Les unités directes ont -20 % de puissance de feu (fantassins normaux).",
        power: "Les unités indirectes gagnent +1 de portée et +30 % de puissance de feu.",
        superPower: "Les unités indirectes gagnent +2 de portée et +30 % de puissance de feu.",
      },
      colin: {
        dayToDay: "Les unités coûtent 20 % de moins, mais ont -10 % de puissance de feu.",
        power: "Les fonds actuels sont multipliés par 1,5.",
        superPower:
          "Toutes les unités gagnent 1 % de puissance de feu par tranche de 300 de fonds.",
      },
      eagle: {
        dayToDay:
          "Les unités aériennes ont +15 % de puissance de feu et +10 % de défense, et consomment 2 carburants de moins par jour. Les unités navales ont -30 % de puissance de feu.",
        power: "Les unités aériennes gagnent +15 % de puissance de feu et +10 % de défense.",
        superPower:
          "Les unités aériennes gagnent +15 % de puissance de feu et +10 % de défense. Toutes les unités hors fantassins peuvent se déplacer et tirer à nouveau, même produites ce tour-ci.",
      },
      drake: {
        dayToDay:
          "Les unités navales ont +1 de déplacement et +10 % de défense. Les unités aériennes ont -30 % de puissance de feu. Drake se déplace sous la pluie comme par temps clair et augmente de 7 % les risques de pluie en météo aléatoire.",
        power:
          "Toutes les unités ennemies perdent 1 PV (minimum 0,1 PV) et la moitié de leur carburant.",
        superPower:
          "Toutes les unités ennemies perdent 2 PV (minimum 0,1 PV) et la moitié de leur carburant. Il pleut pendant 1 jour.",
      },
      jess: {
        dayToDay:
          "Les véhicules terrestres ont +10 % de puissance de feu. Les autres unités, fantassins compris, ont -10 %.",
        power:
          "Ravitaille toutes les unités. Les véhicules terrestres gagnent +20 % de puissance de feu et +1 de déplacement.",
        superPower:
          "Ravitaille toutes les unités. Les véhicules terrestres gagnent +40 % de puissance de feu et +2 de déplacement.",
      },
      kanbei: {
        dayToDay:
          "Les unités ont +30 % de puissance de feu et de défense, mais coûtent 20 % de plus.",
        power: "Les unités gagnent +20 % de puissance de feu.",
        superPower:
          "Les unités gagnent +20 % de puissance de feu et de défense, et leurs ripostes sont 50 % plus fortes.",
      },
      sonja: {
        dayToDay:
          "Les unités ont 1 de vision en plus, leurs statistiques sont cachées à l'ennemi, elles ont 10 % de malchance, et leurs ripostes font 50 % de dégâts en plus.",
        power:
          "Les unités gagnent 1 de vision de plus (+2 au total), et les forêts et récifs à portée de vision sont révélés.",
        superPower:
          "Les unités gagnent 1 de vision de plus (+2 au total), et les forêts et récifs à portée de vision sont révélés. Les unités attaquent en premier quand elles sont attaquées.",
      },
      sensei: {
        dayToDay:
          "Les fantassins ont +40 % de puissance de feu, les Hélicos C +50 % et les transports +1 de déplacement. Les véhicules terrestres et les unités navales ont -10 % de puissance de feu.",
        power:
          "Les Hélicos C gagnent +25 % de puissance de feu. Fait apparaître une infanterie à 9 PV, prête à agir, sur chaque ville alliée libre.",
        superPower:
          "Les Hélicos C gagnent +25 % de puissance de feu. Fait apparaître un bazooka à 9 PV, prêt à agir, sur chaque ville alliée libre.",
      },
      sturm: {
        dayToDay:
          "Les unités ont +20 % de puissance de feu et de défense. Tout terrain coûte 1 de déplacement (sauf dans la neige).",
        superPower:
          "Les unités gagnent encore +20 % de puissance de feu et de défense. Un météore inflige 8 PV à toutes les unités à 2 cases ou moins du point d'impact, alliées comprises. Il vise la zone où il cause le plus de pertes en valeur.",
      },
      hawke: {
        dayToDay: "Les unités ont +10 % de puissance de feu.",
        power:
          "Toutes les unités récupèrent 1 PV, et les unités ennemies perdent 1 PV (minimum 0,1 PV).",
        superPower:
          "Toutes les unités récupèrent 2 PV, et les unités ennemies perdent 2 PV (minimum 0,1 PV).",
      },
      adder: {
        power: "Toutes les unités gagnent 1 de déplacement.",
        superPower: "Toutes les unités gagnent 2 de déplacement.",
      },
      lash: {
        dayToDay:
          "Les unités gagnent 10 % de puissance de feu par étoile de terrain (les unités aériennes n'en profitent pas).",
        power: "Tout terrain coûte 1 de déplacement (sauf dans la neige).",
        superPower:
          "Les étoiles de terrain sont doublées, et tout terrain coûte 1 de déplacement (sauf dans la neige).",
      },
      flak: {
        dayToDay: "Les unités ont 15 % de chance et 10 % de malchance (au lieu de 10 % et 0 %).",
        power: "La chance passe à 40 % et la malchance à 20 %.",
        superPower: "La chance passe à 80 % et la malchance à 40 %.",
      },
    } as Partial<Record<CO, COTexts>>,
  },
  weather: {
    intro:
      "Les salons démarrent par temps clair. La météo peut ensuite changer sous l'effet d'un pouvoir, comme ceux d'Olaf ou de Drake. Elle n'affecte que les déplacements :",
    rain: {
      title: "Pluie",
      text: "Les véhicules (chenilles et roues) paient 1 de plus sur les plaines et en forêt.",
    },
    snow: {
      title: "Neige",
      text: "Les unités aériennes paient le double partout. Les fantassins paient le double en montagne. L'infanterie et les véhicules paient 1 de plus sur les plaines, l'infanterie aussi en forêt, et les navires 1 de plus en mer et dans les ports.",
    },
  },
  controls: {
    items: [
      { action: "Cliquer sur une de vos unités", result: "affiche les cases où elle peut aller." },
      {
        action: "Cliquer sur une case bleue",
        result: "déplace l'unité et ouvre le menu d'actions (attendre, attaquer, capturer…).",
      },
      { action: "Cliquer sur une unité ennemie", result: "affiche sa zone de déplacement." },
      {
        action: "Cliquer sur une de vos bases, aéroports ou ports libres",
        result: "ouvre le menu de production.",
      },
      {
        action: "Boutons Pouvoir et Super pouvoir",
        result: "activent le pouvoir de votre commandant quand la jauge est assez remplie.",
      },
      { action: "Bouton Fin du tour", result: "passe la main à votre adversaire." },
    ],
  },
};
