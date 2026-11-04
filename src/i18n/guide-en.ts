import type { guideFr } from "./guide-fr";

export const guideEn: typeof guideFr = {
  title: "How to play",
  description:
    "Frontline Tactics follows the rules of Advance Wars 2: a turn-based tactics game where the economy matters as much as combat. Every number in this guide comes straight from the game engine.",
  contents: "Contents",
  sections: {
    objective: "Objective",
    turn: "How a turn works",
    units: "Units",
    terrain: "Terrain",
    combat: "Combat",
    economy: "Capture and economy",
    cos: "Commanding officers",
    weather: "Weather",
    controls: "Controls",
  },
  objective: {
    intro:
      "A game pits two armies against each other on a map. You win as soon as one of these happens:",
    conditions: [
      "You capture the enemy HQ.",
      "You destroy the last enemy unit.",
      "You reach the property capture limit set by the room.",
    ],
    crash: "Careful: an army whose units all crash or sink from lack of fuel loses the game too.",
  },
  turn: {
    intro: "Players take turns. A day ends once everyone has played. At the start of your turn:",
    start: [
      "You receive the income of your properties.",
      "Your units standing on a suitable property are resupplied and repaired.",
      "Your air and naval units burn fuel, and crash or sink when none is left.",
    ],
    during:
      "Then you act in any order you like: build units, move, attack, capture. Each unit acts once per turn. A newly built unit can only act from your next turn. Finish with the “End turn” button.",
  },
  units: {
    intro:
      "Each unit has a cost, a movement allowance, an attack range, fuel and sometimes ammo. Units are built on the facility their type requires.",
    tabLand: "Base (land)",
    tabAir: "Airport (air)",
    tabSea: "Port (sea)",
    name: "Unit",
    cost: "Cost",
    move: "Move",
    range: "Range",
    vision: "Vision",
    fuel: "Fuel",
    ammo: "Ammo",
    none: "—",
    roles: [
      {
        title: "Footsoldiers",
        text: "Infantry and mechs are the only units that capture properties. They're cheap and go almost anywhere.",
      },
      {
        title: "Direct units",
        text: "They move, then attack an adjacent tile. They can counterattack if they survive.",
      },
      {
        title: "Indirect units",
        text: "Artillery, rockets, missiles and battleships fire from afar, but only if they didn't move this turn. They never counterattack.",
      },
      {
        title: "Transports",
        text: "They load units and drop them further away. The APC also resupplies neighbouring units.",
      },
    ],
  },
  terrain: {
    intro:
      "Terrain changes everything. Its stars reduce the damage taken, and its movement cost limits how far your units go. A dash marks an impassable tile.",
    name: "Terrain",
    stars: "Defense",
    foot: "Infantry",
    boots: "Mech",
    treads: "Treads",
    tires: "Tires",
    air: "Air",
    sea: "Sea",
    lander: "Lander",
    none: "—",
    names: {
      plain: "Plain",
      road: "Road",
      bridge: "Bridge",
      river: "River",
      forest: "Forest",
      mountain: "Mountain",
      sea: "Sea",
      shoal: "Shoal",
      reef: "Reef",
      city: "City",
      base: "Base",
      airport: "Airport",
      port: "Port",
      hq: "HQ",
      lab: "Lab",
      commtower: "Comm tower",
    },
  },
  combat: {
    intro:
      "A unit attacks after moving (except indirect units). Damage depends on the attacker, the target and several factors:",
    factors: [
      {
        title: "The attacker's HP",
        text: "A unit at 5 out of 10 HP hits half as hard. Attacking first therefore weakens the counterattack.",
      },
      {
        title: "The defender's terrain",
        text: "Each star protects more the more HP the defender has. A tank on a city takes far less than on a road.",
      },
      {
        title: "Luck",
        text: "A random bonus of 0 to 9% is added to the damage. Some COs change it.",
      },
      {
        title: "CO bonuses",
        text: "They change firepower and defense, especially while a power is active.",
      },
    ],
    counter:
      "If the defender survives a melee attack and has a direct weapon, it counterattacks with the HP it has left.",
    explorerTitle: "Base damage",
    explorerIntro:
      "Pick an attacker to see its base damage at full health, on a terrain with no stars and without luck.",
    attacker: "Attacker",
    cantAttack: "This unit can't attack anything.",
    formulaTitle: "The full formula",
    formula:
      "Damage % = (base × attack / 100 + luck) × attacker HP / 10 × (200 − (defense + stars × defender HP)) / 100",
  },
  economy: {
    capture: {
      title: "Capturing",
      text: "A property has 20 capture points. Put a footsoldier on it and choose “Capture”: it loses as many points as the unit has HP. A 10 HP unit therefore captures in two turns. If it leaves the tile, the counter resets.",
    },
    income: {
      title: "Income",
      text: "Each owned city, base, airport, port and HQ brings in the income set by the room every turn. Labs and comm towers bring in nothing.",
    },
    repair: {
      title: "Repairs and supplies",
      text: "At the start of your turn, a unit on a suitable allied property gets its fuel and ammo back, and up to 2 HP. Each HP costs 10% of the unit's price: no funds, no repairs.",
    },
    fuel: {
      title: "Fuel",
      text: "Moving burns fuel. Air and naval units also burn fuel every turn and are lost at zero, unless they stand on a suitable repair property.",
    },
  },
  cos: {
    intro:
      "Each player picks a CO, who brings permanent effects and two powers to activate. The meter fills when your units take damage, and half as fast when they deal it. The star cost rises by 20% with each use. While a power is active, your units gain 10% defense.",
    dayToDay: "Always",
    noDayToDay: "No permanent effect.",
    power: "CO Power",
    superPower: "Super Power",
    stars: (stars: number) => `${stars} ★`,
    // The descriptions of the game engine are in English
    texts: {},
  },
  weather: {
    intro:
      "Rooms start in clear weather. It can then change through a power, like those of Olaf or Drake. It only affects movement:",
    rain: {
      title: "Rain",
      text: "Vehicles (treads and tires) pay 1 more on plains and in forests.",
    },
    snow: {
      title: "Snow",
      text: "Air units pay double everywhere. Footsoldiers pay double on mountains. Infantry and vehicles pay 1 more on plains, infantry also in forests, and ships 1 more at sea and in ports.",
    },
  },
  controls: {
    items: [
      { action: "Click one of your units", result: "shows the tiles it can reach." },
      {
        action: "Click a blue tile",
        result: "moves the unit and opens the action menu (wait, attack, capture…).",
      },
      { action: "Click an enemy unit", result: "shows its movement range." },
      {
        action: "Click one of your free bases, airports or ports",
        result: "opens the build menu.",
      },
      {
        action: "CO Power and Super Power buttons",
        result: "activate your CO's power once the meter is full enough.",
      },
      { action: "End turn button", result: "hands over to your opponent." },
    ],
  },
};
