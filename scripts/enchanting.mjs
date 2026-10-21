/** Gathering & Crafting — Enchanting v1.3.
 * Item-specific compatibility, five learnable proficiency ranks, known enchantments,
 * slot limits, and coin math. Pure functions make the rules independently testable.
 */
export const ELEMENTS=Object.freeze(['Fire','Cold','Lightning','Acid','Thunder']);
export const DAY_SECONDS=86400;
export const RANKS=Object.freeze([
 {name:'Untrained',days:0,dc:0},
 {name:'Novice',days:2,dc:10},
 {name:'Apprentice',days:4,dc:12},
 {name:'Adept',days:5,dc:14},
 {name:'Expert',days:7,dc:16},
 {name:'Master',days:10,dc:18}
]);
// Shorter than the original schedule; market values and in-progress deadlines are unchanged. Existing pending jobs keep their own finishAt.
export const reducedDays=days=>Math.max(1,Math.ceil(Number(days)*0.7));
const baseRank=cost=>cost<=250?1:cost<=500?2:cost<=800?3:cost<=1200?4:5;
const weapon=(id,name,cost,days,description,extra={})=>({id:'weapon-'+id,name,kind:'weapon',cost,days:reducedDays(days),description,rank:baseRank(cost),allowed:['weapon'],slots:1,...extra});
const armor=(id,name,cost,days,description,extra={})=>({id:'armor-'+id,name,kind:'armor',cost,days:reducedDays(days),description,rank:baseRank(cost),allowed:['armor','shield'],slots:1,...extra});
const SOURCE_ENCHANTMENTS=[
  weapon('spell-channel','Spell Channel',125,2,'The weapon can be used as a spellcasting focus.'),
  weapon('arcane-infusion','Arcane Infusion',250,5,'The weapon becomes magical and gains a +1 bonus to attack and damage rolls.',{magicalBonus:1,exclusive:'arcane-infusion'}),
  weapon('greater-arcane-infusion','Greater Arcane Infusion',1000,10,'The weapon becomes magical and gains a +2 bonus to attack and damage rolls.',{magicalBonus:2,exclusive:'arcane-infusion',rank:4,slots:2}),
  weapon('elemental-binding','Elemental Binding',300,4,'Adds 1d4 damage of the selected type (Fire, Cold, Lightning, Acid or Thunder).',{elementDice:'1d4',exclusive:'elemental-binding'}),
  weapon('greater-elemental-binding','Greater Elemental Binding',800,10,'Adds 1d6 damage of the selected elemental type.',{elementDice:'1d6',exclusive:'elemental-binding',rank:4,slots:2}),
  weapon('soul-binding','Soul Binding',500,4,'The weapon returns to its owner after 1 minute.'),
  weapon('blessed-weapon','Blessed Weapon',350,2,'The item counts as a holy weapon.'),
  weapon('shadow-binding','Shadow Binding',350,3,'Grants +2 to Stealth while the weapon is equipped.',{passive:{skill:'ste',bonus:2}}),
  weapon('arcane-reservoir','Arcane Reservoir',500,2,'Stores one spell of up to 3rd level.'),
  weapon('hunters-marking',"Hunter's Marking",600,4,"Cast Hunter's Mark once per Long Rest.",{power:{spell:"Hunter's Mark",uses:1}}),
  weapon('fey-blessing','Fey Blessing',750,5,'Cast Misty Step once per Long Rest.',{power:{spell:'Misty Step',uses:1}}),
  armor('magewoven-interior','Magewoven Interior',120,5,'Gain +1 on Constitution saving throws to maintain concentration.',{allowed:['armor'],passive:{concentration:1}}),
  armor('arcane-mesh','Arcane Mesh',150,6,'Gain +2 on Arcana checks.',{passive:{skill:'arc',bonus:2}}),
  armor('shadow-binding','Shadow Binding',350,5,'Gain +2 on Stealth checks while the armor is equipped.',{allowed:['armor'],passive:{skill:'ste',bonus:2}}),
  armor('stone-binding','Stone Binding',750,10,'Gain advantage against being knocked Prone and against forced movement.',{allowed:['armor']}),
  armor('wind-binding','Wind Binding',750,10,'Bonus Action: gain +10 ft movement for 1 minute, once per Long Rest.',{allowed:['boots','light','medium'],power:{name:'Wind Binding',uses:1}}),
  armor('frost-ward','Frost Ward',750,10,'Gain resistance to Cold damage.',{resistance:'cold'}),
  armor('flame-ward','Flame Ward',750,10,'Gain resistance to Fire damage.',{resistance:'fire'}),
  armor('storm-ward','Storm Ward',750,10,'Gain resistance to Lightning damage.',{resistance:'lightning'}),
  armor('fey-blessing','Fey Blessing',750,10,'Cast Misty Step once per Long Rest.',{power:{spell:'Misty Step',uses:1}}),
  armor('phoenix-binding','Phoenix Binding',1500,14,'Once per Long Rest, remain at 1 HP instead of dropping to 0 HP.',{rank:5,slots:2,power:{name:'Phoenix Binding',uses:1}}),
  armor('celestial-blessing','Celestial Blessing',1000,10,'Cast Cure Wounds at 2nd level once per Long Rest.',{power:{spell:'Cure Wounds (2nd level)',uses:1}}),
  armor('arcane-reservoir','Arcane Reservoir',500,7,'Stores one spell of up to 3rd level.'),
  armor('guardian-aura','Guardian Aura',1200,12,'Allies within 5 ft gain +1 against Fear effects.',{allowed:['shield','heavy','medium']}),
  armor('soul-binding','Soul Binding',500,7,'The armor is magically bound to its owner and cannot be used by another person.'),
  // Additional weapon enchantments: melee, blades, bows, crossbows, staves and ranged weapons.
  weapon('keen-edge','Keen Edge',300,4,'This blade ignores nonmagical slashing resistance at the GM’s discretion.',{allowed:['blade']}),
  weapon('sundering-strike','Sundering Strike',450,6,'Once per Long Rest, deal +2d6 force damage to a construct or object.',{allowed:['melee'],power:{name:'Sundering Strike',uses:1}}),
  weapon('frostbite-edge','Frostbite Edge',500,6,'Once per Long Rest, slow a struck foe by 10 ft until your next turn.',{allowed:['blade'],power:{name:'Frostbite Edge',uses:1}}),
  weapon('venom-channel','Venom Channel',300,5,'Once per Long Rest, add 1d6 poison damage to one weapon hit.',{allowed:['piercing','blade'],power:{name:'Venom Channel',uses:1}}),
  weapon('thunderclap','Thunderclap',650,7,'Once per Long Rest, your hit can emit a thunderous shockwave.',{allowed:['bludgeoning','melee'],power:{name:'Thunderclap',uses:1}}),
  weapon('vampiric-edge','Vampiric Edge',950,11,'Once per Long Rest, regain HP equal to 1d6 necrotic damage dealt.',{allowed:['blade'],power:{name:'Vampiric Edge',uses:1}}),
  weapon('dawnstrike','Dawnstrike',1100,12,'Once per Long Rest, deal +2d8 radiant damage on one hit.',{allowed:['melee'],power:{name:'Dawnstrike',uses:1}}),
  weapon('astral-sever','Astral Sever',1800,15,'Once per Long Rest, empower a strike with 3d8 force damage.',{allowed:['blade'],rank:5,slots:2,power:{name:'Astral Sever',uses:1}}),
  weapon('moonfang','Moonfang',650,8,'Against shapechangers the weapon counts as silvered and magical.',{allowed:['blade']}),
  weapon('bloodletter','Bloodletter',450,6,'Once per Long Rest, cause 1d4 bleeding damage at the GM’s discretion.',{allowed:['blade'],power:{name:'Bloodletter',uses:1}}),
  weapon('flameburst','Flameburst',750,8,'Once per Long Rest, erupt in a burst of fire when you hit.',{allowed:['melee'],power:{name:'Flameburst',uses:1}}),
  weapon('echoing-blow','Echoing Blow',1100,12,'Once per Long Rest, echo the impact for +2d6 thunder damage.',{allowed:['bludgeoning'],power:{name:'Echoing Blow',uses:1}}),
  weapon('gravity-hammer','Gravity Hammer',1500,14,'Once per Long Rest, push a creature you strike up to 10 ft (GM adjudicated).',{allowed:['bludgeoning'],rank:5,slots:2,power:{name:'Gravity Hammer',uses:1}}),
  weapon('rapid-reload','Rapid Reload',300,4,'Ignore the loading property once on each of your turns (GM adjudicated).',{allowed:['crossbow']}),
  weapon('steady-aim','Steady Aim',300,4,'Once per Long Rest gain +2 on a ranged weapon attack roll.',{allowed:['ranged'],power:{name:'Steady Aim',uses:1}}),
  weapon('seeking-shot','Seeking Shot',750,9,'Once per Long Rest gain advantage on a ranged attack.',{allowed:['ranged'],power:{name:'Seeking Shot',uses:1}}),
  weapon('storm-arrow','Storm Arrow',850,10,'Once per Long Rest, deal +2d6 lightning damage with a ranged hit.',{allowed:['bow','crossbow'],power:{name:'Storm Arrow',uses:1}}),
  weapon('piercing-winds','Piercing Winds',600,7,'Ignore half cover with this ranged weapon.',{allowed:['ranged']}),
  weapon('hunters-sight','Hunter’s Sight',425,6,'While holding this ranged weapon, gain +1 to Perception checks.',{allowed:['ranged'],passive:{skill:'prc',bonus:1}}),
  weapon('hawkflight','Hawkflight',1600,15,'Once per Long Rest, extend a ranged shot’s effective reach dramatically.',{allowed:['bow'],rank:5,slots:2,power:{name:'Hawkflight',uses:1}}),
  weapon('sniper-rune','Sniper Rune',1150,11,'Once per Long Rest, one ranged attack ignores three-quarters cover.',{allowed:['ranged'],power:{name:'Sniper Rune',uses:1}}),
  weapon('lightweave-string','Lightweave String',350,4,'This bowstring glows softly and forms luminous ammunition.',{allowed:['bow']}),
  weapon('spellstrike','Spellstrike',1000,10,'Once per Long Rest, channel a cantrip through a melee weapon hit.',{allowed:['staff','melee'],power:{name:'Spellstrike',uses:1}}),
  weapon('arcane-repeater','Arcane Repeater',950,9,'Once per Long Rest, reuse a prepared cantrip as a bonus action.',{allowed:['staff'],power:{name:'Arcane Repeater',uses:1}}),
  weapon('warding-staff','Warding Staff',450,5,'While holding the staff, gain +1 on Arcana checks.',{allowed:['staff'],passive:{skill:'arc',bonus:1}}),
  weapon('magepiercer','Magepiercer',1250,12,'Once per Long Rest, disrupt a spellcasting creature you hit.',{allowed:['staff','blade'],power:{name:'Magepiercer',uses:1}}),
  weapon('sunlance','Sunlance',1350,13,'Once per Long Rest, deal +2d8 radiant damage with a spear or polearm.',{allowed:['polearm'],rank:5,slots:2,power:{name:'Sunlance',uses:1}}),
  weapon('defender-rune','Defender Rune',500,7,'Once per Long Rest, gain +2 AC until the start of your next turn after a melee attack.',{allowed:['melee'],power:{name:'Defender Rune',uses:1}}),
  weapon('giants-grip','Giant’s Grip',850,9,'While wielding this heavy melee weapon, gain +1 on Athletics checks.',{allowed:['heavy-weapon'],passive:{skill:'ath',bonus:1}}),
  weapon('voidlash','Voidlash',1800,15,'Once per Long Rest, deal +3d6 necrotic damage on a melee hit.',{allowed:['melee'],rank:5,slots:2,power:{name:'Voidlash',uses:1}}),
  // Additional armor and shield enchantments.
  armor('guardians-crest','Guardian’s Crest',350,5,'Once per Long Rest, grant an ally within 5 ft +1 AC for one round.',{allowed:['shield'],power:{name:'Guardian’s Crest',uses:1}}),
  armor('spellbreaker-shield','Spellbreaker Shield',1100,12,'Once per Long Rest, gain advantage on a save against one spell.',{allowed:['shield'],power:{name:'Spellbreaker Shield',uses:1}}),
  armor('radiant-bulwark','Radiant Bulwark',1600,14,'Once per Long Rest, grant temporary HP equal to your proficiency bonus + 5.',{allowed:['shield'],rank:5,slots:2,power:{name:'Radiant Bulwark',uses:1}}),
  armor('reflecting-sigil','Reflecting Sigil',2000,16,'Once per Long Rest, reflect a magical beam as ruled by the GM.',{allowed:['shield'],rank:5,slots:2,power:{name:'Reflecting Sigil',uses:1}}),
  armor('iron-sentinel','Iron Sentinel',500,6,'Gain +1 on Athletics checks while wearing heavy armor.',{allowed:['heavy'],passive:{skill:'ath',bonus:1}}),
  armor('bastion-weave','Bastion Weave',1050,11,'Once per Long Rest, reduce damage from one attack by 1d8.',{allowed:['heavy','medium'],power:{name:'Bastion Weave',uses:1}}),
  armor('unyielding-plate','Unyielding Plate',1650,14,'Once per Long Rest, resist being knocked prone for one minute.',{allowed:['heavy'],rank:5,slots:2,power:{name:'Unyielding Plate',uses:1}}),
  armor('adamant-ward','Adamant Ward',1800,14,'Once per Long Rest, reduce incoming damage by 2d8.',{allowed:['heavy'],rank:5,slots:2,power:{name:'Adamant Ward',uses:1}}),
  armor('stonehide','Stonehide',450,7,'Gain +1 on checks to resist being shoved.',{allowed:['medium','heavy']}),
  armor('thornmail','Thornmail',650,8,'Once per Long Rest, deal 1d6 piercing damage to a creature that hits you in melee.',{allowed:['medium','heavy'],power:{name:'Thornmail',uses:1}}),
  armor('thunder-plate','Thunder Plate',900,10,'Once per Long Rest, emit thunder when struck for 1d6 thunder damage.',{allowed:['heavy'],power:{name:'Thunder Plate',uses:1}}),
  armor('venom-guard','Venom Guard',750,8,'Gain resistance to poison damage.',{allowed:['medium','heavy','light'],resistance:'poison'}),
  armor('acid-ward','Acid Ward',750,9,'Gain resistance to acid damage.',{allowed:['medium','heavy','light'],resistance:'acid'}),
  armor('necrotic-ward','Necrotic Ward',1100,12,'Gain resistance to necrotic damage.',{allowed:['armor'],resistance:'necrotic'}),
  armor('radiant-ward','Radiant Ward',1200,12,'Gain resistance to radiant damage.',{allowed:['armor'],resistance:'radiant'}),
  armor('shadowweave','Shadowweave',400,6,'Gain +1 to Stealth checks while wearing light armor.',{allowed:['light'],passive:{skill:'ste',bonus:1}}),
  armor('silent-stitch','Silent Stitch',550,7,'Suppress the clinking of equipment and grant +2 to Stealth checks.',{allowed:['light'],passive:{skill:'ste',bonus:2}}),
  armor('nightmantle','Nightmantle',1000,11,'Once per Long Rest, dim your form for one minute.',{allowed:['light'],power:{name:'Nightmantle',uses:1}}),
  armor('quickstep-weave','Quickstep Weave',550,7,'Once per Long Rest, gain +10 ft of movement for one minute.',{allowed:['light'],power:{name:'Quickstep Weave',uses:1}}),
  armor('moonshadow','Moonshadow',1500,14,'Once per Long Rest, cast Invisibility on yourself.',{allowed:['light'],rank:5,slots:2,power:{spell:'Invisibility',uses:1}}),
  armor('mindshell','Mindshell',950,11,'Once per Long Rest, gain advantage on one Wisdom saving throw.',{allowed:['armor'],power:{name:'Mindshell',uses:1}}),
  armor('featherweight','Featherweight',300,5,'Reduce the armor’s carried weight by half (GM adjudicated).',{allowed:['armor']}),
  armor('enduring-rune','Enduring Rune',350,6,'While equipped, gain +1 on Constitution saving throws.',{allowed:['armor'],passive:{save:'con',bonus:1}}),
  armor('sigil-of-clarity','Sigil of Clarity',500,7,'While equipped, gain +1 on Arcana checks.',{allowed:['armor'],passive:{skill:'arc',bonus:1}}),
  armor('titan-ward','Titan Ward',1250,13,'Once per Long Rest, gain +2 to a Strength saving throw.',{allowed:['heavy'],power:{name:'Titan Ward',uses:1}}),
  armor('ironwill','Ironwill',700,8,'While equipped, gain +1 on Wisdom saving throws.',{allowed:['heavy','medium'],passive:{save:'wis',bonus:1}}),
  armor('glacial-reprisal','Glacial Reprisal',1300,13,'Once per Long Rest, deal 2d6 cold damage when struck.',{allowed:['medium','heavy'],power:{name:'Glacial Reprisal',uses:1}}),
  armor('sunward','Sunward',1550,13,'Once per Long Rest, emit daylight for 10 minutes.',{allowed:['armor','shield'],rank:5,slots:2,power:{spell:'Daylight',uses:1}}),
  armor('aegis-of-life','Aegis of Life',2100,16,'Once per Long Rest, cast Aid at 3rd level.',{allowed:['armor'],rank:5,slots:2,power:{spell:'Aid (3rd level)',uses:1}}),
  armor('warden-rune','Warden Rune',600,7,'Gain +1 on Insight checks while equipped.',{allowed:['armor','shield'],passive:{skill:'ins',bonus:1}}),
  // Enchantments dedicated to wearable equipment, robes and accessories.
  armor('mystic-stitching','Mystic Stitching',180,3,'While wearing this robe, gain +1 on Arcana checks.',{passive:{skill:'arc',bonus:1}}),
  armor('spellweave-lining','Spellweave Lining',600,7,'Once per Long Rest, gain advantage on a concentration saving throw.',{power:{name:'Spellweave Lining',uses:1}}),
  armor('astral-embroidery','Astral Embroidery',1400,11,'Once per Long Rest, cast Misty Step while wearing the robe.',{rank:5,slots:2,power:{spell:'Misty Step',uses:1}}),
  armor('mana-mantle','Mana Mantle',550,6,'While wearing this garment, gain +1 on Arcana checks.',{passive:{skill:'arc',bonus:1}}),
  armor('fleetfoot-rune','Fleetfoot Rune',420,5,'Once per Long Rest, gain +10 ft movement for 1 minute.',{power:{name:'Fleetfoot Rune',uses:1}}),
  armor('silent-tread','Silent Tread',340,4,'While wearing these boots, gain +1 to Stealth checks.',{passive:{skill:'ste',bonus:1}}),
  armor('veil-of-shadows','Veil of Shadows',750,8,'Once per Long Rest, conceal your silhouette for one minute.',{power:{name:'Veil of Shadows',uses:1}}),
  armor('windward-cloak','Windward Cloak',390,5,'Once per Long Rest, reduce damage from a ranged attack by 1d6.',{power:{name:'Windward Cloak',uses:1}}),
  armor('runic-grip','Runic Grip',300,4,'While wearing these gloves, gain +1 to Athletics checks.',{passive:{skill:'ath',bonus:1}}),
  armor('spellthread-gloves','Spellthread Gloves',720,8,'Once per Long Rest, gain +1 on a spell attack roll.',{power:{name:'Spellthread Gloves',uses:1}}),
  armor('mindguard-crest','Mindguard Crest',680,8,'Once per Long Rest, gain advantage on a Wisdom saving throw.',{power:{name:'Mindguard Crest',uses:1}}),
  armor('echo-ring','Echo Ring',900,9,'Once per Long Rest, repeat the sound of your voice or a sound you heard.',{power:{name:'Echo Ring',uses:1}}),
  armor('guardian-pendant','Guardian Pendant',720,8,'Once per Long Rest, gain +2 on one saving throw.',{power:{name:'Guardian Pendant',uses:1}}),
  armor('titans-cord',"Titan's Cord",480,6,'While wearing this belt, gain +1 on Athletics checks.',{passive:{skill:'ath',bonus:1}})

];
// Retain the original generic elemental formulas for old Items, pending jobs and
// already learned formula flags. They are no longer offered as selectable cards.
// Explicit and exhaustive compatibility: there is no implicit 'all equipment' fallback.
const ENCHANT_TARGETS=Object.freeze({
  "weapon-spell-channel": [
    "staff",
    "sword",
    "dagger"
  ],
  "weapon-arcane-infusion": [
    "melee",
    "ranged"
  ],
  "weapon-greater-arcane-infusion": [
    "melee",
    "ranged"
  ],
  "weapon-elemental-binding": [
    "melee",
    "ranged"
  ],
  "weapon-greater-elemental-binding": [
    "melee",
    "ranged"
  ],
  "weapon-soul-binding": [
    "melee"
  ],
  "weapon-blessed-weapon": [
    "melee"
  ],
  "weapon-dawnstrike": [
    "melee"
  ],
  "weapon-sundering-strike": [
    "melee"
  ],
  "weapon-defender-rune": [
    "melee"
  ],
  "weapon-voidlash": [
    "melee"
  ],
  "weapon-flameburst": [
    "melee"
  ],
  "weapon-shadow-binding": [
    "sword",
    "dagger",
    "bow",
    "crossbow"
  ],
  "weapon-arcane-reservoir": [
    "staff"
  ],
  "weapon-arcane-repeater": [
    "staff"
  ],
  "weapon-warding-staff": [
    "staff"
  ],
  "weapon-hunters-marking": [
    "bow",
    "crossbow"
  ],
  "weapon-storm-arrow": [
    "bow",
    "crossbow"
  ],
  "weapon-fey-blessing": [
    "staff",
    "sword",
    "dagger"
  ],
  "weapon-keen-edge": [
    "blade"
  ],
  "weapon-frostbite-edge": [
    "blade"
  ],
  "weapon-vampiric-edge": [
    "blade"
  ],
  "weapon-astral-sever": [
    "blade"
  ],
  "weapon-moonfang": [
    "blade"
  ],
  "weapon-bloodletter": [
    "blade"
  ],
  "weapon-venom-channel": [
    "dagger",
    "sword",
    "spear",
    "bow",
    "crossbow"
  ],
  "weapon-thunderclap": [
    "hammer",
    "mace"
  ],
  "weapon-echoing-blow": [
    "hammer",
    "mace"
  ],
  "weapon-gravity-hammer": [
    "hammer",
    "mace"
  ],
  "weapon-rapid-reload": [
    "crossbow"
  ],
  "weapon-steady-aim": [
    "bow",
    "crossbow"
  ],
  "weapon-seeking-shot": [
    "bow",
    "crossbow"
  ],
  "weapon-piercing-winds": [
    "bow",
    "crossbow"
  ],
  "weapon-hunters-sight": [
    "bow",
    "crossbow"
  ],
  "weapon-sniper-rune": [
    "bow",
    "crossbow"
  ],
  "weapon-hawkflight": [
    "bow"
  ],
  "weapon-lightweave-string": [
    "bow"
  ],
  "weapon-spellstrike": [
    "staff",
    "sword",
    "dagger"
  ],
  "weapon-magepiercer": [
    "staff",
    "sword",
    "dagger"
  ],
  "weapon-sunlance": [
    "spear",
    "polearm"
  ],
  "weapon-giants-grip": [
    "axe",
    "hammer",
    "sword"
  ],
  "armor-magewoven-interior": [
    "robe",
    "light"
  ],
  "armor-arcane-mesh": [
    "robe",
    "light"
  ],
  "armor-mindshell": [
    "robe",
    "light"
  ],
  "armor-sigil-of-clarity": [
    "robe",
    "light"
  ],
  "armor-shadow-binding": [
    "light",
    "robe",
    "cloak"
  ],
  "armor-shadowweave": [
    "light",
    "robe",
    "cloak"
  ],
  "armor-silent-stitch": [
    "light",
    "robe",
    "cloak"
  ],
  "armor-nightmantle": [
    "light",
    "robe",
    "cloak"
  ],
  "armor-moonshadow": [
    "light",
    "robe",
    "cloak"
  ],
  "armor-stone-binding": [
    "medium",
    "heavy",
    "shield"
  ],
  "armor-stonehide": [
    "medium",
    "heavy",
    "shield"
  ],
  "armor-wind-binding": [
    "boots"
  ],
  "armor-quickstep-weave": [
    "boots"
  ],
  "armor-frost-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-flame-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-storm-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-venom-guard": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-acid-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-necrotic-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-radiant-ward": [
    "light",
    "medium",
    "heavy",
    "robe",
    "shield"
  ],
  "armor-fey-blessing": [
    "robe",
    "cloak",
    "light",
    "medium"
  ],
  "armor-phoenix-binding": [
    "heavy",
    "medium"
  ],
  "armor-thornmail": [
    "heavy",
    "medium"
  ],
  "armor-bastion-weave": [
    "heavy",
    "medium"
  ],
  "armor-glacial-reprisal": [
    "heavy",
    "medium"
  ],
  "armor-celestial-blessing": [
    "robe",
    "light",
    "medium"
  ],
  "armor-arcane-reservoir": [
    "robe",
    "light",
    "medium"
  ],
  "armor-guardian-aura": [
    "shield",
    "heavy",
    "medium"
  ],
  "armor-soul-binding": [
    "light",
    "medium",
    "heavy",
    "shield",
    "robe",
    "cloak"
  ],
  "armor-guardians-crest": [
    "shield"
  ],
  "armor-spellbreaker-shield": [
    "shield"
  ],
  "armor-radiant-bulwark": [
    "shield"
  ],
  "armor-reflecting-sigil": [
    "shield"
  ],
  "armor-iron-sentinel": [
    "heavy"
  ],
  "armor-unyielding-plate": [
    "heavy"
  ],
  "armor-adamant-ward": [
    "heavy"
  ],
  "armor-thunder-plate": [
    "heavy"
  ],
  "armor-titan-ward": [
    "heavy"
  ],
  "armor-featherweight": [
    "light",
    "medium",
    "heavy"
  ],
  "armor-enduring-rune": [
    "light",
    "medium",
    "heavy"
  ],
  "armor-ironwill": [
    "medium",
    "heavy"
  ],
  "armor-sunward": [
    "robe",
    "light",
    "medium",
    "heavy",
    "shield",
    "cloak",
    "helm"
  ],
  "armor-aegis-of-life": [
    "robe",
    "light",
    "medium",
    "heavy"
  ],
  "armor-warden-rune": [
    "robe",
    "light",
    "medium",
    "heavy",
    "shield",
    "helm"
  ],
  "armor-mystic-stitching": [
    "robe"
  ],
  "armor-spellweave-lining": [
    "robe"
  ],
  "armor-astral-embroidery": [
    "robe"
  ],
  "armor-mana-mantle": [
    "robe",
    "cloak"
  ],
  "armor-fleetfoot-rune": [
    "boots"
  ],
  "armor-silent-tread": [
    "boots"
  ],
  "armor-veil-of-shadows": [
    "cloak"
  ],
  "armor-windward-cloak": [
    "cloak"
  ],
  "armor-runic-grip": [
    "gloves"
  ],
  "armor-spellthread-gloves": [
    "gloves"
  ],
  "armor-mindguard-crest": [
    "helm"
  ],
  "armor-echo-ring": [
    "ring"
  ],
  "armor-guardian-pendant": [
    "amulet"
  ],
  "armor-titans-cord": [
    "belt"
  ]
});
const BASE_ENCHANTMENTS=Object.freeze(SOURCE_ENCHANTMENTS.map(entry=>{
 const allowed=ENCHANT_TARGETS[entry.id];
 if(!allowed?.length)throw new Error('Missing compatible equipment mapping: '+entry.id);
 return Object.freeze({...entry,allowed:Object.freeze(allowed)});
}));
const LEGACY_ELEMENTAL=Object.freeze(BASE_ENCHANTMENTS.filter(e=>
 e.id==='weapon-elemental-binding'||e.id==='weapon-greater-elemental-binding'
));
const FIXED_ELEMENTAL=Object.freeze(LEGACY_ELEMENTAL.flatMap(original=>
 ELEMENTS.map(element=>Object.freeze({
  ...original,
  id:original.id+'-'+element.toLowerCase(),
  name:original.name+' — '+element,
  description:'Adds '+original.elementDice+' '+element+' damage on weapon hits.',
  fixedElement:element
 }))
));
export const ENCHANTMENTS=Object.freeze([
 ...BASE_ENCHANTMENTS.filter(e=>!LEGACY_ELEMENTAL.includes(e)),
 ...FIXED_ELEMENTAL
]);
export const enchantById=id=>ENCHANTMENTS.find(e=>e.id===id)||LEGACY_ELEMENTAL.find(e=>e.id===id)||null;
export const sortEnchantments=items=>[...items].sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name,'en'));
export const knowsEnchant=(known,enchant)=>Array.isArray(known)&&(
 known.includes(enchant.id)||
 // Characters who learned the old multi-element formula keep that knowledge.
 (enchant.fixedElement&&known.includes(enchant.id.replace(/-(fire|cold|lightning|acid|thunder)$/,'')))
);
const normal=s=>String(s||'').toLowerCase();
/** Visible names are intentionally the same tags used by the server-side checks. */
export const EQUIPMENT_LABELS=Object.freeze({
 melee:'Melee Weapons',ranged:'Ranged Weapons',
 sword:'Swords',dagger:'Daggers',axe:'Axes',hammer:'Hammers',mace:'Maces',
 spear:'Spears',polearm:'Polearms',bow:'Bows',crossbow:'Crossbows',
 staff:'Staves',blade:'Bladed Weapons',piercing:'Piercing Weapons',
 bludgeoning:'Bludgeoning Weapons','heavy-weapon':'Heavy Weapons',
 light:'Light Armor',medium:'Medium Armor',heavy:'Heavy Armor',
 robe:'Robes',shield:'Shields',boots:'Boots',cloak:'Cloaks',
 gloves:'Gloves',helm:'Helmets / Headwear',ring:'Rings',
 amulet:'Amulets / Necklaces',belt:'Belts'
});
export const enchantTargetLabels=enchant=>(enchant?.allowed||[]).map(tag=>EQUIPMENT_LABELS[tag]||tag);
export function itemTags(item){
 if(!item)return [];
 const system=item.system||{},type=normal(system.type?.value||system.type),
  subtype=normal(system.type?.subtype||''),
  base=normal([system.type?.baseItem,system.identifier,item.name].filter(Boolean).join(' ')),
  damageTypes=system.damage?.base?.types;
 const damage=normal(Array.isArray(damageTypes)?damageTypes.join(' '):damageTypes||'');
 const tags=[];
 if(item.type==='weapon'){
  tags.push('weapon');
  const ranged=/^(martialr|simpler|ranged|firearm)$/.test(type)||
    /\b(longbow|shortbow|crossbow|sling|blowgun|dart|firearm|musket|pistol)\b/.test(base);
  tags.push(ranged?'ranged':'melee');
  if(/\b(longbow|shortbow|bows?)\b/.test(base)&&!/\bcrossbow\b/.test(base))tags.push('bow');
  if(/\bcrossbows?\b/.test(base))tags.push('crossbow');
  if(/\b(quarterstaff|staff|staves|rod|wand)\b/.test(base))tags.push('staff');
  if(/\b(longsword|shortsword|greatsword|sword|scimitar|rapier|saber|sabre|falchion|katana)\b/.test(base))tags.push('sword','blade');
  if(/\b(dagger|knife|stiletto|kukri)\b/.test(base))tags.push('dagger','blade');
  if(/\b(battleaxe|handaxe|greataxe|hatchet|axe)\b/.test(base))tags.push('axe','blade');
  if(/\b(warhammer|light hammer|hammer|maul)\b/.test(base))tags.push('hammer','bludgeoning');
  if(/\b(mace|morningstar|club|flail)\b/.test(base))tags.push('mace','bludgeoning');
  if(/\b(spear|javelin|trident|pike|lance)\b/.test(base))tags.push('spear','polearm');
  if(/\b(halberd|glaive|polearm)\b/.test(base))tags.push('polearm');
  if(damage.includes('bludgeoning'))tags.push('bludgeoning');
  if(damage.includes('piercing')||tags.includes('dagger')||tags.includes('spear')||tags.includes('bow')||tags.includes('crossbow'))tags.push('piercing');
  const prop=system.properties;
  const props=prop instanceof Set?[...prop]:Array.isArray(prop)?prop:Object.entries(prop||{}).filter(([,v])=>v).map(([k])=>k);
  if(props.includes('hvy'))tags.push('heavy-weapon');
 }else if(item.type==='equipment'){
  // dnd5e 5.3 stores the armor category in system.type.value;
  // clothing/wondrous Items often have no meaningful subcategory.
  if(type==='shield'||normal(system.armor?.type)==='shield')tags.push('shield');
  else if(['light','medium','heavy'].includes(type))tags.push('armor',type);
  else if(['light','medium','heavy'].includes(normal(system.armor?.type)))tags.push('armor',normal(system.armor.type));
  else {
   // Do not treat a non-equipment loot/consumable called "Robe" as enchantable.
   // A genuine equipment Item may advertise its slot through subtype or name.
   const descriptor=base+' '+subtype;
   if(/\b(robes?|vestments?|tunic)\b/.test(descriptor))tags.push('robe');
   else if(/\b(boots?|shoes?|slippers?|greaves)\b/.test(descriptor))tags.push('boots');
   else if(/\b(cloak|cape|mantle)\b/.test(descriptor))tags.push('cloak');
   else if(/\b(gloves?|gauntlets?|handwraps?)\b/.test(descriptor))tags.push('gloves');
   else if(/\b(helmet|helm|headband|circlet|hood|hat)\b/.test(descriptor))tags.push('helm');
   else if(/\b(rings?|bands?)\b/.test(descriptor))tags.push('ring');
   else if(/\b(amulet|necklace|pendant|medallion|talisman)\b/.test(descriptor))tags.push('amulet');
   else if(/\b(belt|girdle|sash)\b/.test(descriptor))tags.push('belt');
  }
 }
 return [...new Set(tags)];
}
export function targetKind(item){
 const tags=itemTags(item);
 return tags.includes('weapon')?'weapon':tags.length?'armor':null;
}
export const itemClassification=item=>itemTags(item)
 .filter(t=>t!=='weapon'&&t!=='armor'&&t!=='melee'&&t!=='ranged')
 .map(t=>EQUIPMENT_LABELS[t]||t)
 .join(' / ')||'Unknown Equipment';
export function capacity(item){
 const explicit=item?.getFlag?.('gathering-crafting','enchantSlots');
 if(Number.isInteger(explicit)&&explicit>=0&&explicit<=6)return explicit;
 const rarity=normal(item?.system?.rarity||'common');
 return ({common:1,uncommon:2,rare:3,'very rare':4,veryrare:4,legendary:5,artifact:5})[rarity]??1;
}
export function usedSlots(entries){return(entries||[]).reduce((n,e)=>n+(enchantById(e.id)?.slots||1),0);}
export function maxRarityRank(item){
 return ({common:2,uncommon:3,rare:4,'very rare':5,veryrare:5,legendary:5,artifact:5})[normal(item?.system?.rarity||'common')]||2;
}
export function explainCompatibility(item,enchant,completed=[]){
 if(!enchant||targetKind(item)!==enchant.kind)return 'Wrong item type';
 const tags=itemTags(item);
 if(!enchant.allowed.some(t=>tags.includes(t)))return 'Only for: '+enchantTargetLabels(enchant).join(' / ');
 if(item?.getFlag?.('gathering-crafting','enchantmentPending'))return 'Already enchanting';
 const existing=(completed||[]).map(v=>enchantById(v.id)).filter(Boolean);
 if(existing.some(e=>e.id===enchant.id))return 'Already applied';
 if(existing.some(e=>enchant.exclusive&&e.exclusive===enchant.exclusive))return 'Conflicting enchantment';
 if(usedSlots(completed)+enchant.slots>capacity(item))return 'Insufficient enchantment slots';
 if(enchant.rank>maxRarityRank(item))return 'Requires a rarer item';
 return '';
}
export function canApplyEnchant(item,enchant,completed=[]){return !explainCompatibility(item,enchant,completed);}
export function professionOf(actor){
 const data=actor?.getFlag?.('gathering-crafting','enchanter')||{};
 return {rank:Math.min(5,Math.max(0,Number(data.rank)||0)),known:Array.isArray(data.known)?data.known:[],training:data.training||null};
}
export function learningGate(actor,enchant){const prof=professionOf(actor);return prof.rank<enchant.rank?'Requires '+RANKS[enchant.rank].name:!knowsEnchant(prof.known,enchant)?'Learn this enchantment first':'';}
export function hasTrainingTools(actor){
 return !!(actor?.items||[]).find(i=>Number(i.system?.quantity??1)>0&&/^(jeweler'?s tools|jeweller'?s tools|enchanter'?s tools|enchanting kit)$/i.test(String(i.name||'').replace(/[’‘]/g,"'")));
}
export function arcanaBonus(actor){
 const s=actor?.system||{};
 const skill=s.skills?.arc||{};
 if(Number.isFinite(Number(skill.total)))return Number(skill.total);
 const int=Number(s.abilities?.int?.mod||0);
 const trained=Number(skill.value||0),pb=Number(s.attributes?.prof||2);
 return int+trained*pb;
}
export function costInCopper(currency){
 const rate={pp:1000,gp:100,ep:50,sp:10,cp:1};
 return Object.entries(rate).reduce((sum,[name,scale])=>{
  const value=Number(currency?.[name]??0);
  if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid character currency.');
  return sum+value*scale;
 },0);
}
export function afterGoldPayment(currency,gp){
 if(!Number.isSafeInteger(gp)||gp<0)throw new Error('Invalid enchantment cost.');
 let remaining=costInCopper(currency)-gp*100;if(remaining<0)return null;
 const result={};for(const [key,rate] of [['pp',1000],['gp',100],['ep',50],['sp',10],['cp',1]]){
  result[key]=Math.floor(remaining/rate);remaining%=rate;
 }
 return result;
}
export function completionAt(start,days){
 if(!Number.isFinite(start)||!Number.isSafeInteger(days)||days<1)throw new Error('Invalid enchantment time.');
 return start+days*DAY_SECONDS;
}
export function displayEnchantEffect(enchant,element){
 if(!enchant)return '';
 if(!enchant.elementDice)return enchant.description;
 const damageType=enchant.fixedElement||element;
 if(!ELEMENTS.includes(damageType))throw new Error('Choose a valid elemental damage type.');
 return 'Adds '+enchant.elementDice+' '+damageType+' damage on weapon hits.';
}
export const lessonCost=e=>Math.max(20,Math.round(e.cost*0.15/5)*5);
export const lessonDays=e=>Math.max(1,Math.min(4,Math.ceil((e.rank+1)*0.65)));
