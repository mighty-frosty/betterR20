# 2024 Character Sheet Console Commands Guide

This guide documents how to create and populate a 2024 D&D character sheet as an NPC using browser console commands in Roll20.

## Prerequisites

- Be in a Roll20 game with 2024 character sheet enabled
- Open browser developer console (F12 → Console tab)
- Be logged in as GM

---

## Step 1: Create a New Character

```javascript
// Create a blank character
var char = d20.Campaign.characters.create({name: "Test NPC"});
console.log("Created character:", char.id);
```

---

## Step 2: Explore Existing Store Structure

Before modifying, let's examine an existing 2024 character's store:

```javascript
// Find an existing character by name
var existingChar = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");

// Get the store attribute
var storeAttr = existingChar.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Log the store structure
console.log("Store type:", typeof store);
console.log("Store:", JSON.stringify(store, null, 2));
```

---

## Step 3: Set Character as NPC

```javascript
// Get our character
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");

// Find or create appState attribute
var appState = char.attribs.find(a => a.get("name") === "appState");
if (!appState) {
    char.attribs.create({name: "appState", current: "npc"});
} else {
    appState.set("current", "npc");
    appState.save();
}
console.log("Set appState to npc");
```

---

## Step 4: Access the Store

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");

// Get store attribute
var storeAttr = char.attribs.find(a => a.get("name") === "store");

// Check if store exists and what type it is
if (storeAttr) {
    var store = storeAttr.get("current");
    console.log("Store exists, type:", typeof store);
    console.log("Store keys:", Object.keys(store));
} else {
    console.log("No store attribute found - may need to open character sheet first");
}
```

---

## Step 5: Generate Valid IDs

The 2024 sheet uses 21-character alphanumeric IDs with underscores and dashes:

```javascript
function generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let id = '';
    for (let i = 0; i < 21; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Test it
console.log("Generated ID:", generateId());
```

---

## Step 6: Add Ability Scores

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Add Strength score of 18
var strId = generateId();
store.integrants.integrants[strId] = {
    _enabled: true,
    type: "Ability Score",
    ability: "Strength",
    calculation: "Set Value",
    valueFormula: { flatValue: 18 },
    source: "Custom"
};

// Add all six ability scores
var abilities = {
    "Strength": 18,
    "Dexterity": 14,
    "Constitution": 16,
    "Intelligence": 10,
    "Wisdom": 12,
    "Charisma": 8
};

Object.entries(abilities).forEach(([ability, value]) => {
    var id = generateId();
    store.integrants.integrants[id] = {
        _enabled: true,
        type: "Ability Score",
        ability: ability,
        calculation: "Set Value",
        valueFormula: { flatValue: value },
        source: "Custom"
    };
});

// Save the store
storeAttr.set("current", store);
storeAttr.save();
console.log("Added ability scores");
```

---

## Step 7: Add Armor Class

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var acId = generateId();
store.integrants.integrants[acId] = {
    _enabled: true,
    type: "Armor Class",
    calculation: "Set Value",
    valueFormula: { flatValue: 15 },
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added AC");
```

---

## Step 8: Add Hit Points

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var hpId = generateId();
store.integrants.integrants[hpId] = {
    _enabled: true,
    type: "Hit Points",
    hitpointType: "Maximum",
    valueFormula: { flatValue: 45 },
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added HP");
```

---

## Step 9: Add Speeds

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Walking speed
var walkId = generateId();
store.integrants.integrants[walkId] = {
    _enabled: true,
    type: "Speed",
    name: "Walking",
    valueFormula: { flatValue: 30 },
    source: "Custom"
};

// Flying speed (if applicable)
var flyId = generateId();
store.integrants.integrants[flyId] = {
    _enabled: true,
    type: "Speed",
    name: "Flying",
    valueFormula: { flatValue: 60 },
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added speeds");
```

---

## Step 10: Add Senses

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var darkvisionId = generateId();
store.integrants.integrants[darkvisionId] = {
    _enabled: true,
    type: "Sense",
    name: "Darkvision",
    valueFormula: { flatValue: 60 },
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added senses");
```

---

## Step 11: Add Actions

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var actionId = generateId();
store.integrants.integrants[actionId] = {
    _enabled: true,
    type: "Action",
    name: "Multiattack",
    actionType: "Action",
    description: "The creature makes two attacks.",
    source: "Custom"
};

// Update action display order
var actionOrder = JSON.parse(store.actions?.actionDisplayOrder || "[]");
actionOrder.push(actionId);
if (!store.actions) store.actions = {};
store.actions.actionDisplayOrder = JSON.stringify(actionOrder);

storeAttr.set("current", store);
storeAttr.save();
console.log("Added action");
```

---

## Step 12: Add Attacks with Damage

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Create damage integrant first
var damageId = generateId();
store.integrants.integrants[damageId] = {
    _enabled: true,
    type: "Damage",
    damageType: "Slashing",
    diceCount: 2,
    diceSize: 6,
    ability: "Strength",
    source: "Custom"
};

// Create attack integrant
var attackId = generateId();
store.integrants.integrants[attackId] = {
    _enabled: true,
    type: "Attack",
    name: "Longsword",
    attack: {
        abilityBonus: "Strength",
        type: "Melee",
        range: 5
    },
    childIDs: [damageId],
    source: "Custom"
};

// Link damage back to attack
store.integrants.integrants[damageId].parentID = attackId;

// Update attack display order
var attackOrder = JSON.parse(store.attacks?.attackDisplayOrder || "[]");
attackOrder.push(attackId);
if (!store.attacks) store.attacks = {};
store.attacks.attackDisplayOrder = JSON.stringify(attackOrder);

storeAttr.set("current", store);
storeAttr.save();
console.log("Added attack with damage");
```

---

## Step 13: Add Legendary Actions

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var legendaryId = generateId();
store.integrants.integrants[legendaryId] = {
    _enabled: true,
    type: "Action",
    name: "Detect",
    actionType: "Legendary",
    description: "The creature makes a Wisdom (Perception) check.",
    cost: 1,
    source: "Custom"
};

// Update legendary action display order
var legendaryOrder = JSON.parse(store.actions?.legendaryActionDisplayOrder || "[]");
legendaryOrder.push(legendaryId);
if (!store.actions) store.actions = {};
store.actions.legendaryActionDisplayOrder = JSON.stringify(legendaryOrder);

// Set legendary action count in npc section
if (!store.npc) store.npc = {};
store.npc.legendaryActionSummary = "Can take 3 legendary actions.";

storeAttr.set("current", store);
storeAttr.save();
console.log("Added legendary action");
```

---

## Step 14: Add Spells

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Add a cantrip (level 0)
var cantripId = generateId();
store.integrants.integrants[cantripId] = {
    _enabled: true,
    _prepared: true,
    type: "Spell",
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    source: "Custom"
};

// Add a 1st level spell
var spell1Id = generateId();
store.integrants.integrants[spell1Id] = {
    _enabled: true,
    _prepared: true,
    type: "Spell",
    name: "Magic Missile",
    level: 1,
    school: "Evocation",
    source: "Custom"
};

// Update spell display orders (array of 10 for levels 0-9)
if (!store.spells) store.spells = { displayOrder: ["[]","[]","[]","[]","[]","[]","[]","[]","[]","[]"] };
if (!store.spells.displayOrder) store.spells.displayOrder = ["[]","[]","[]","[]","[]","[]","[]","[]","[]","[]"];

// Add cantrip to level 0
var level0Order = JSON.parse(store.spells.displayOrder[0] || "[]");
level0Order.push(cantripId);
store.spells.displayOrder[0] = JSON.stringify(level0Order);

// Add spell to level 1
var level1Order = JSON.parse(store.spells.displayOrder[1] || "[]");
level1Order.push(spell1Id);
store.spells.displayOrder[1] = JSON.stringify(level1Order);

storeAttr.set("current", store);
storeAttr.save();
console.log("Added spells");
```

---

## Step 15: Add Damage Resistances/Immunities

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// Add fire resistance
var resistId = generateId();
store.integrants.integrants[resistId] = {
    _enabled: true,
    type: "Defense",
    damage: "Fire",
    defense: "Resistance",
    source: "Custom"
};

// Add poison immunity
var immuneId = generateId();
store.integrants.integrants[immuneId] = {
    _enabled: true,
    type: "Defense",
    damage: "Poison",
    defense: "Immunity",
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added defenses");
```

---

## Step 16: Set NPC Metadata

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

// NPC-specific data
if (!store.npc) store.npc = {};
store.npc.challengeRating = "5";

// About/characteristics
if (!store.about) store.about = {};
if (!store.about.characteristics) store.about.characteristics = {};
store.about.characteristics.size = "Medium";
store.about.characteristics.alignment = "Neutral Evil";
store.about.characteristics.creatureType = "Humanoid";

storeAttr.set("current", store);
storeAttr.save();
console.log("Set NPC metadata");
```

---

## Step 17: Add Languages

```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");

var commonId = generateId();
store.integrants.integrants[commonId] = {
    _enabled: true,
    type: "Language",
    name: "Common",
    source: "Custom"
};

var draconicId = generateId();
store.integrants.integrants[draconicId] = {
    _enabled: true,
    type: "Language",
    name: "Draconic",
    source: "Custom"
};

storeAttr.set("current", store);
storeAttr.save();
console.log("Added languages");
```

---

## Complete NPC Creation Script

Here's a complete script to create a full NPC in one go:

```javascript
// Complete NPC creation function
function create2024NPC(name, stats) {
    // Generate ID helper
    function generateId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
        let id = '';
        for (let i = 0; i < 21; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    // Create character
    var char = d20.Campaign.characters.create({name: name});

    // Wait for character to be created, then set up
    setTimeout(function() {
        // Set as NPC
        char.attribs.create({name: "appState", current: "npc"});

        // Get store (may need to wait for it)
        setTimeout(function() {
            var storeAttr = char.attribs.find(a => a.get("name") === "store");
            if (!storeAttr) {
                console.log("Store not found - open character sheet manually first");
                return;
            }

            var store = storeAttr.get("current");

            // Add ability scores
            ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"].forEach(ability => {
                var id = generateId();
                var value = stats[ability.toLowerCase().substring(0,3)] || 10;
                store.integrants.integrants[id] = {
                    _enabled: true,
                    type: "Ability Score",
                    ability: ability,
                    calculation: "Set Value",
                    valueFormula: { flatValue: value },
                    source: "Custom"
                };
            });

            // Add AC
            if (stats.ac) {
                var acId = generateId();
                store.integrants.integrants[acId] = {
                    _enabled: true,
                    type: "Armor Class",
                    calculation: "Set Value",
                    valueFormula: { flatValue: stats.ac },
                    source: "Custom"
                };
            }

            // Add HP
            if (stats.hp) {
                var hpId = generateId();
                store.integrants.integrants[hpId] = {
                    _enabled: true,
                    type: "Hit Points",
                    hitpointType: "Maximum",
                    valueFormula: { flatValue: stats.hp },
                    source: "Custom"
                };
            }

            // Set NPC metadata
            if (!store.npc) store.npc = {};
            if (stats.cr) store.npc.challengeRating = String(stats.cr);

            if (!store.about) store.about = {};
            if (!store.about.characteristics) store.about.characteristics = {};
            if (stats.size) store.about.characteristics.size = stats.size;
            if (stats.alignment) store.about.characteristics.alignment = stats.alignment;
            if (stats.type) store.about.characteristics.creatureType = stats.type;

            // Save
            storeAttr.set("current", store);
            storeAttr.save();

            console.log("Created NPC:", name, "ID:", char.id);
        }, 1000);
    }, 500);

    return char;
}

// Usage example:
create2024NPC("Goblin Boss", {
    str: 10,
    dex: 14,
    con: 10,
    int: 10,
    wis: 8,
    cha: 10,
    ac: 17,
    hp: 21,
    cr: "1",
    size: "Small",
    alignment: "Neutral Evil",
    type: "Humanoid"
});
```

---

## Debugging Tips

### Check Store Contents
```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
console.log(JSON.stringify(storeAttr.get("current"), null, 2));
```

### List All Integrants
```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
var storeAttr = char.attribs.find(a => a.get("name") === "store");
var store = storeAttr.get("current");
Object.entries(store.integrants.integrants).forEach(([id, data]) => {
    console.log(id, data.type, data.name || data.ability || "");
});
```

### Check All Character Attributes
```javascript
var char = d20.Campaign.characters.find(c => c.get("name") === "Test NPC");
char.attribs.forEach(a => console.log(a.get("name"), "=", a.get("current")));
```

---

## Known Issues

1. **Store may not exist initially** - The store attribute is created when the character sheet is first opened. You may need to open the sheet manually before the store is available.

2. **Timing issues** - After creating a character, you may need to wait before accessing its attributes.

3. **Display order arrays** - Some display orders are stored as JSON strings within the store object, while others may be arrays. Check the actual structure.

4. **Jumpgate differences** - On Jumpgate, save callbacks don't work. Use `.save()` without callbacks.

---

## Next Steps

After testing these commands:
1. Document any differences from expected behavior
2. Note which fields are required vs optional
3. Identify any missing integrant types
4. Test opening the character sheet to verify data displays correctly
