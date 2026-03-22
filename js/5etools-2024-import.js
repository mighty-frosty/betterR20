/**
 * 2024 Character Sheet Import Support
 * Included in both the 5etools (2024) and 5et2014 builds
 */
function d20plus2024Import() {
	// ========================================
	// 2024 Sheet Configuration and Detection
	// ========================================

	// Add import sheet format config option — __values/__texts populated at setSheet time
	addConfigOptions("import", {
		"importSheetFormat": {
			"name": "Import Sheet Format",
			"default": "auto",
			"_type": "_enum",
			"__values": [],
			"__texts": [],
		},
	});

	// Reorder so importSheetFormat appears first among user-configurable options
	// (addConfigOptions uses Object.assign which appends; JS objects preserve insertion order)
	{
		const grp = CONFIG_OPTIONS["import"];
		const reordered = {};
		for (const k of Object.keys(grp)) { if (k.startsWith("_")) reordered[k] = grp[k]; }
		reordered["importSheetFormat"] = grp["importSheetFormat"];
		for (const k of Object.keys(grp)) { if (!k.startsWith("_") && k !== "importSheetFormat") reordered[k] = grp[k]; }
		CONFIG_OPTIONS["import"] = reordered;
	}

	// Map sheet keys to friendly display names
	function getSheetDisplayName(sheetKey, sheetObj) {
		if (sheetKey === "ogl5e" || sheetKey === "ogl") return "2014 (OGL)";
		if (sheetKey === "dnd_2024" || sheetKey === "DnD2024_Character_Sheet" || sheetKey === "dnd2024" || sheetKey === "dnd2024byroll20") return "2024";
		if (sheetKey === "shaped_d20") return "Shaped";
		if (sheetKey === "DnD5e_Character_Sheet") return "Community";
		const name = sheetObj?.attributes?.name || sheetKey;
		return `Other (${name})`;
	}

	// Wrap setSheet to detect available sheets and populate the dropdown
	const originalSetSheet = d20plus.setSheet;
	d20plus.setSheet = function() {
		originalSetSheet.call(this);

		try {
			const sheetsObj = d20.journal.characterSheetsManager?.sheets || {};
			const sheetKeys = Object.keys(sheetsObj);

			// Also check for customSheets
			const customSheet = d20.journal.customSheets;
			if (customSheet && customSheet.attributes?.id && !sheetsObj[customSheet.attributes.id]) {
				sheetKeys.push(customSheet.attributes.id);
				sheetsObj[customSheet.attributes.id] = customSheet;
			}

			const values = [];
			const texts = [];

			for (const key of sheetKeys) {
				values.push(key);
				texts.push(getSheetDisplayName(key, sheetsObj[key]));
			}

			// Fallback: if nothing detected, use current d20plus.sheet
			if (values.length === 0) {
				values.push(d20plus.sheet);
				texts.push(getSheetDisplayName(d20plus.sheet, null));
			}

			CONFIG_OPTIONS["import"]["importSheetFormat"].__values = values;
			CONFIG_OPTIONS["import"]["importSheetFormat"].__texts = texts;

			// Smart default: single option → use it; multiple → prefer 2024 sheet, else first
			if (values.length === 1) {
				CONFIG_OPTIONS["import"]["importSheetFormat"].default = values[0];
			} else {
				const prefer2024 = values.find(v => v === "dnd_2024" || v === "DnD2024_Character_Sheet" || v === "dnd2024" || v === "dnd2024byroll20");
				CONFIG_OPTIONS["import"]["importSheetFormat"].default = prefer2024 || values[0];
			}

			d20plus.ut.log(`Import sheet format options detected: ${values.join(", ")}`);
		} catch (e) {
			console.warn("Import sheet format detection failed:", e);
		}
	};

	// ========================================
	// 2024 Sheet Translation Layer for Module Importer
	// ========================================

	/**
	 * Generate a 21-character ID for 2024 sheet integrants
	 */
	function generate2024Id() {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
		let id = '';
		for (let i = 0; i < 21; i++) {
			id += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return id;
	}

	/**
	 * Parse OGL npc_type string into size, creature type, and alignment
	 */
	function parseNpcType(npcType) {
		if (!npcType) return { size: "Medium", creatureType: "Unknown", alignment: "Unaligned" };

		const parts = npcType.split(",").map(s => s.trim());
		const firstPart = parts[0] || "";
		const alignment = parts[1] || "Unaligned";

		const sizes = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
		let size = "Medium";
		let creatureType = firstPart;

		for (const s of sizes) {
			if (firstPart.toLowerCase().startsWith(s.toLowerCase())) {
				size = s;
				creatureType = firstPart.substring(s.length).trim();
				break;
			}
		}

		if (creatureType) {
			creatureType = creatureType.charAt(0).toUpperCase() + creatureType.slice(1).toLowerCase();
		} else {
			creatureType = "Unknown";
		}

		const alignmentCap = alignment.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

		return { size, creatureType, alignment: alignmentCap };
	}

	/**
	 * Parse speed string into array of {type, value} objects
	 */
	function parseSpeeds(speedStr) {
		if (!speedStr) return [{ type: "Walking", value: 30 }];

		const speeds = [];
		const parts = speedStr.split(",").map(s => s.trim());

		for (const part of parts) {
			const match = part.match(/(?:(\w+)\s+)?(\d+)\s*(?:ft\.?)?/i);
			if (match) {
				let type = match[1] ? match[1].toLowerCase() : "walk";
				const value = parseInt(match[2], 10);

				const typeMap = {
					"walk": "Walking",
					"fly": "Flying",
					"swim": "Swimming",
					"climb": "Climbing",
					"burrow": "Burrowing",
					"hover": "Flying",
				};
				type = typeMap[type] || "Walking";

				speeds.push({ type, value });
			}
		}

		return speeds.length > 0 ? speeds : [{ type: "Walking", value: 30 }];
	}

	/**
	 * Parse senses string into array of {type, value} objects
	 */
	function parseSenses(sensesStr) {
		if (!sensesStr) return [];

		const senses = [];
		const parts = sensesStr.split(",").map(s => s.trim());

		for (const part of parts) {
			const match = part.match(/(\w+)\s+(\d+)\s*(?:ft\.?)?/i);
			if (match) {
				let type = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
				const value = parseInt(match[2], 10);

				const validSenses = ["Darkvision", "Blindsight", "Tremorsense", "Truesight"];
				if (validSenses.includes(type)) {
					senses.push({ type, value });
				}
			}
		}

		return senses;
	}

	/**
	 * Parse damage string into dice components
	 */
	function parseDamage(damageStr) {
		if (!damageStr) return null;

		const match = damageStr.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/i);
		if (match) {
			return {
				diceCount: parseInt(match[1], 10),
				diceSize: "d" + match[2],
				bonus: match[3] ? parseInt(match[3], 10) : 0,
			};
		}
		return null;
	}

	/**
	 * Translate OGL attribs array to 2024 store format (for Module Importer)
	 */
	d20plus.importer.translateOGLTo2024Store = function(attribs) {
		const attrMap = {};
		const attrMaxMap = {}; // Store max values separately for HP etc.
		const repeatingActions = {};
		const repeatingLegendary = {};
		const repeatingMythic = {};
		const repeatingReactions = {};
		const repeatingTraits = {};
		const repeatingSpells = {};

		for (const attr of attribs) {
			const name = attr.name;
			attrMap[name] = attr.current;
			if (attr.max !== undefined && attr.max !== "") {
				attrMaxMap[name] = attr.max;
			}

			if (name.startsWith("repeating_npcaction-l_")) {
				const match = name.match(/repeating_npcaction-l_([^_]+)_(.+)/);
				if (match) {
					const id = match[1];
					const field = match[2];
					if (!repeatingLegendary[id]) repeatingLegendary[id] = {};
					repeatingLegendary[id][field] = attr.current;
				}
			} else if (name.startsWith("repeating_npcaction-m_")) {
				const match = name.match(/repeating_npcaction-m_([^_]+)_(.+)/);
				if (match) {
					const id = match[1];
					const field = match[2];
					if (!repeatingMythic[id]) repeatingMythic[id] = {};
					repeatingMythic[id][field] = attr.current;
				}
			} else if (name.startsWith("repeating_npcreaction_")) {
				const match = name.match(/repeating_npcreaction_([^_]+)_(.+)/);
				if (match) {
					const id = match[1];
					const field = match[2];
					if (!repeatingReactions[id]) repeatingReactions[id] = {};
					repeatingReactions[id][field] = attr.current;
				}
			} else if (name.startsWith("repeating_npctrait_")) {
				const match = name.match(/repeating_npctrait_([^_]+)_(.+)/);
				if (match) {
					const id = match[1];
					const field = match[2];
					if (!repeatingTraits[id]) repeatingTraits[id] = {};
					repeatingTraits[id][field] = attr.current;
				}
			} else if (name.startsWith("repeating_npcaction_")) {
				const match = name.match(/repeating_npcaction_([^_]+)_(.+)/);
				if (match) {
					const id = match[1];
					const field = match[2];
					if (!repeatingActions[id]) repeatingActions[id] = {};
					repeatingActions[id][field] = attr.current;
				}
			} else if (name.startsWith("repeating_spell-")) {
				const match = name.match(/repeating_spell-(\w+)_([^_]+)_(.+)/);
				if (match) {
					const level = match[1];
					const id = match[2];
					const field = match[3];
					const key = `${level}_${id}`;
					if (!repeatingSpells[key]) repeatingSpells[key] = { level };
					repeatingSpells[key][field] = attr.current;
				}
			}
		}

		const store = {
			integrants: { integrants: {} },
			actions: {
				actionDisplayOrder: "[]",
				bonusActionDisplayOrder: "[]",
				freeActionDisplayOrder: "[]",
				reactionDisplayOrder: "[]",
				legendaryActionDisplayOrder: "[]",
				mythicActionDisplayOrder: "[]",
			},
			attacks: { attackDisplayOrder: "[]" },
			spells: { displayOrder: ["[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]"], generalSpellSettings: {} },
			npc: { acNotes: "", legendaryActionCompendiumNum: 0 },
			npcEdit: {},
			about: { characteristics: {}, aboutTabApperancesDisplayOrder: "[]", aboutTabCharacteristicsDisplayOrder: "[]", aboutItems: {} },
			background: { aboutTabBackgroundDisplayOrder: "[]" },
			character: { createdWithBuilder: false, creatureType: "", pronouns: "" },
			settings: { layoutState: "Stat Block", addDexTiebreaker: false, encumbranceType: "Normal", ignoreCoinWeight: false },
			hitpoints: { deathSaves: { failures: 0, open: false, successes: 0 } },
			classLevel: { currentExp: 0 },
			currencies: { initialized: true },
			effects: { effectDisplayOrder: "[]" },
			features: { classFeatureDisplayOrder: "[]", featsDisplayOrder: "[]", otherDisplayOrder: "[]", speciesDisplayOrder: "[]" },
			inspiration: { isInspired: false },
			inventory: { equipmentDisplayOrder: "[]", incrementalQuantityEditing: true, otherPossessionsDisplayOrder: "[]" },
			notes: { emptyCategories: "[]", order: {}, notes: {} },
			proficiencies: {},
			rest: { longRestModalData: {}, shortRestModalData: {}, usedHitDiceData: {} },
			shop: { isLocked: false, lockDC: 10, shopDiscountMarkup: 0 },
			spellSlots: { currentByLevel: {}, currentPactByLevel: {}, useSpellSlotOnCast: true },
			weaponMasteries: { masteryDisplayOrder: "[]" },
			bastion: { bastionDefenders: "", bastionDescription: "", bastionLevel: 1 },
		};

		let arrayPosition = 100;
		const integrants = store.integrants.integrants;

		const createIntegrantBase = (type) => {
			const id = generate2024Id();
			return {
				id,
				base: {
					_enabled: true,
					_label: "",
					type,
					childIDs: "[]",
					parentID: "",
					parentDisabled: false,
					overwriteDisabled: false,
					builderDisplayName: "",
					createdTime: Date.now(),
					arrayPosition: arrayPosition++,
					shortID: id.substring(0, 9),
					source: "Custom",
				},
			};
		};

		// Ability Scores
		const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
		const abilityNames = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

		// Debug logging
		for (let i = 0; i < abilities.length; i++) {
			const value = parseInt(attrMap[abilities[i]] || attrMap[abilities[i] + "_base"] || "10", 10);
			const { id, base } = createIntegrantBase("Ability Score");
			integrants[id] = {
				...base,
				ability: abilityNames[i],
				calculation: "Set Value",
				name: "",
				valueFormula: { flatValue: value },
			};
		}

		// Hit Points - OGL stores max HP in the "max" field of "hp" attribute
		const hpMax = parseInt(attrMaxMap["hp"] || attrMap["hp"] || attrMap["hp_max"] || "10", 10);
		const { id: hpId, base: hpBase } = createIntegrantBase("Hit Points");
		integrants[hpId] = {
			...hpBase,
			hitpointType: "Maximum",
			isFixed: false,
			isTemp: false,
			calculation: "Set Value",
			name: "",
			valueFormula: { flatValue: hpMax },
		};
		store.hitpoints.currentHP = hpMax;

		// Armor Class
		const ac = parseInt(attrMap["npc_ac"] || attrMap["ac"] || "10", 10);
		const { id: acId, base: acBase } = createIntegrantBase("Armor Class");
		integrants[acId] = {
			...acBase,
			defaultAbility: false,
			calculation: "Set Value",
			name: "",
			valueFormula: { flatValue: ac },
		};

		// NPC Type, Size, Alignment
		const npcTypeStr = attrMap["npc_type"] || "";
		const { size, creatureType, alignment } = parseNpcType(npcTypeStr);
		store.about.characteristics = { size, creatureType, alignment };
		store.character.creatureType = creatureType;

		// Challenge Rating
		const cr = attrMap["npc_challenge"] || "0";
		store.npc.challengeRating = cr;

		// Speeds
		const speedStr = attrMap["npc_speed"] || "30 ft.";
		const speeds = parseSpeeds(speedStr);
		for (const speed of speeds) {
			const { id, base } = createIntegrantBase("Speed");
			integrants[id] = {
				...base,
				name: speed.type,
				speed: speed.type,
				calculation: "Set Base",
				valueFormula: { flatValue: speed.value },
			};
		}

		// Senses
		const sensesStr = attrMap["npc_senses"] || "";
		const senses = parseSenses(sensesStr);
		for (const sense of senses) {
			const { id, base } = createIntegrantBase("Sense");
			integrants[id] = {
				...base,
				name: sense.type,
				calculation: "Set Base",
				valueFormula: { flatValue: sense.value },
			};
		}

		// Languages
		const languagesStr = attrMap["npc_languages"] || "";
		if (languagesStr) {
			const languages = languagesStr.split(",").map(s => s.trim()).filter(s => s);
			for (const lang of languages) {
				const { id, base } = createIntegrantBase("Language");
				integrants[id] = {
					...base,
					name: lang,
				};
			}
		}

		// Defenses - Resistances
		const resistancesStr = attrMap["npc_resistances"] || "";
		if (resistancesStr) {
			const resistances = resistancesStr.split(",").map(s => s.trim()).filter(s => s);
			for (const res of resistances) {
				const { id, base } = createIntegrantBase("Defense");
				integrants[id] = {
					...base,
					name: res,
					defense: "Resistance",
					damageType: res.charAt(0).toUpperCase() + res.slice(1).toLowerCase(),
				};
			}
		}

		// Defenses - Immunities
		const immunitiesStr = attrMap["npc_immunities"] || "";
		if (immunitiesStr) {
			const immunities = immunitiesStr.split(",").map(s => s.trim()).filter(s => s);
			for (const imm of immunities) {
				const { id, base } = createIntegrantBase("Defense");
				integrants[id] = {
					...base,
					name: imm,
					defense: "Immunity",
					damageType: imm.charAt(0).toUpperCase() + imm.slice(1).toLowerCase(),
				};
			}
		}

		// Defenses - Vulnerabilities
		const vulnerabilitiesStr = attrMap["npc_vulnerabilities"] || "";
		if (vulnerabilitiesStr) {
			const vulnerabilities = vulnerabilitiesStr.split(",").map(s => s.trim()).filter(s => s);
			for (const vuln of vulnerabilities) {
				const { id, base } = createIntegrantBase("Defense");
				integrants[id] = {
					...base,
					name: vuln,
					defense: "Vulnerability",
					damageType: vuln.charAt(0).toUpperCase() + vuln.slice(1).toLowerCase(),
				};
			}
		}

		// Condition Immunities
		const conditionImmunitiesStr = attrMap["npc_condition_immunities"] || "";
		if (conditionImmunitiesStr) {
			const conditions = conditionImmunitiesStr.split(",").map(s => s.trim()).filter(s => s);
			for (const cond of conditions) {
				const { id, base } = createIntegrantBase("Defense");
				integrants[id] = {
					...base,
					name: cond,
					defense: "Condition Immunity",
					conditionType: cond.charAt(0).toUpperCase() + cond.slice(1).toLowerCase(),
				};
			}
		}

		// Traits (as Features)
		for (const [traitId, trait] of Object.entries(repeatingTraits)) {
			if (!trait.name) continue;
			const { id, base } = createIntegrantBase("Feature");
			integrants[id] = {
				...base,
				name: trait.name,
				description: trait.description || trait.desc || "",
			};
		}

		// Actions/Attacks
		const actionDisplayOrder = [];
		const attackDisplayOrder = [];

		for (const [actionId, action] of Object.entries(repeatingActions)) {
			if (!action.name) continue;

			const isAttack = action.attack_flag === "on" || action.attack_tohit;

			if (isAttack) {
				const { id: attackIntId, base: attackBase } = createIntegrantBase("Attack");

				const attackTypeStr = (action.attack_type || "").toLowerCase();
				const isMelee = attackTypeStr.includes("melee") || !attackTypeStr.includes("ranged");

				let abilityBonus = isMelee ? "Strength" : "Dexterity";

				const damageIds = [];

				const primaryDamage = parseDamage(action.attack_damage || "");
				if (primaryDamage) {
					const { id: dmgId, base: dmgBase } = createIntegrantBase("Damage");
					integrants[dmgId] = {
						...dmgBase,
						name: `${action.name} Damage`,
						damageType: (action.attack_damagetype || "Slashing").charAt(0).toUpperCase() + (action.attack_damagetype || "slashing").slice(1).toLowerCase(),
						diceSize: primaryDamage.diceSize,
						diceCount: primaryDamage.diceCount,
						_bonus: primaryDamage.bonus,
						ability: "",
						parentID: attackIntId,
					};
					damageIds.push(dmgId);
				}

				const secondaryDamage = parseDamage(action.attack_damage2 || "");
				if (secondaryDamage) {
					const { id: dmgId2, base: dmgBase2 } = createIntegrantBase("Damage");
					integrants[dmgId2] = {
						...dmgBase2,
						name: `${action.name} Damage 2`,
						damageType: (action.attack_damagetype2 || "").charAt(0).toUpperCase() + (action.attack_damagetype2 || "fire").slice(1).toLowerCase(),
						diceSize: secondaryDamage.diceSize,
						diceCount: secondaryDamage.diceCount,
						_bonus: secondaryDamage.bonus,
						ability: "",
						parentID: attackIntId,
					};
					damageIds.push(dmgId2);
				}

				integrants[attackIntId] = {
					...attackBase,
					name: action.name,
					actionType: "Action",
					description: action.description || "",
					attack: {
						abilityBonus,
						proficiencyLevel: "Proficient",
						type: isMelee ? "Melee" : "Ranged",
					},
					childIDs: JSON.stringify(damageIds),
				};

				attackDisplayOrder.push(attackIntId);
			} else {
				const { id: actionIntId, base: actionBase } = createIntegrantBase("Action");
				integrants[actionIntId] = {
					...actionBase,
					name: action.name,
					actionType: "Action",
					description: action.description || "",
				};
				actionDisplayOrder.push(actionIntId);
			}
		}

		// Legendary Actions
		const legendaryActionDisplayOrder = [];
		const legendaryCount = attrMap["npc_legendary_actions"] || "3";
		store.npc.legendaryActionCount = parseInt(legendaryCount, 10);

		for (const [legId, legendary] of Object.entries(repeatingLegendary)) {
			if (!legendary.name) continue;
			const { id, base } = createIntegrantBase("Action");
			integrants[id] = {
				...base,
				name: legendary.name,
				actionType: "Legendary",
				description: legendary.description || legendary.desc || "",
			};
			legendaryActionDisplayOrder.push(id);
		}

		// Mythic Actions
		const mythicActionDisplayOrder = [];
		for (const [mythId, mythic] of Object.entries(repeatingMythic)) {
			if (!mythic.name) continue;
			const { id, base } = createIntegrantBase("Action");
			integrants[id] = {
				...base,
				name: mythic.name,
				actionType: "Mythic",
				description: mythic.description || mythic.desc || "",
			};
			mythicActionDisplayOrder.push(id);
		}

		// Reactions
		const reactionDisplayOrder = [];
		for (const [reactId, reaction] of Object.entries(repeatingReactions)) {
			if (!reaction.name) continue;
			const { id, base } = createIntegrantBase("Action");
			integrants[id] = {
				...base,
				name: reaction.name,
				actionType: "Reaction",
				description: reaction.description || reaction.desc || "",
			};
			reactionDisplayOrder.push(id);
		}

		// Spells
		const spellDisplayOrder = [[], [], [], [], [], [], [], [], [], []];

		for (const [spellKey, spell] of Object.entries(repeatingSpells)) {
			if (!spell.spellname) continue;

			let levelIdx = 0;
			if (spell.level === "cantrip") {
				levelIdx = 0;
			} else {
				levelIdx = parseInt(spell.level, 10) || 0;
			}
			if (levelIdx > 9) levelIdx = 9;

			const { id, base } = createIntegrantBase("Spell");
			integrants[id] = {
				...base,
				_prepared: true,
				name: spell.spellname,
				level: levelIdx,
				school: spell.spellschool || "Evocation",
				castingTime: spell.spellcastingtime || "Action",
				range: spell.spellrange || "Self",
				components: spell.spellcomp || "V, S",
				duration: spell.spellduration || "Instantaneous",
				description: spell.spelldescription || "",
			};
			spellDisplayOrder[levelIdx].push(id);
		}

		// Update display orders
		store.actions.actionDisplayOrder = JSON.stringify(actionDisplayOrder);
		store.actions.reactionDisplayOrder = JSON.stringify(reactionDisplayOrder);
		store.actions.legendaryActionDisplayOrder = JSON.stringify(legendaryActionDisplayOrder);
		store.actions.mythicActionDisplayOrder = JSON.stringify(mythicActionDisplayOrder);
		store.attacks.attackDisplayOrder = JSON.stringify(attackDisplayOrder);
		store.spells.displayOrder = spellDisplayOrder.map(arr => JSON.stringify(arr));

		// Debug: log final store
		return store;
	};

	const IS_2024_SHEET = new Set(["dnd_2024", "DnD2024_Character_Sheet", "dnd2024", "dnd2024byroll20"]);

	/**
	 * Check if we should use 2024 sheet format
	 */
	d20plus.importer.shouldUse2024 = function() {
		return IS_2024_SHEET.has(d20plus.cfg.getOrDefault("import", "importSheetFormat"));
	};

	d20plus.importer.is2024Sheet = function(sheetName) {
		return IS_2024_SHEET.has(sheetName);
	};

	// ========================================
	// 2024 Sheet Monster Import Support
	// ========================================

	/**
	 * Parse speed object into array of {type, value} objects
	 */
	function parse2024MonsterSpeeds(speedObj) {
		if (!speedObj) return [{ type: "Walking", value: 30 }];

		const speeds = [];
		const typeMap = {
			"walk": "Walking",
			"fly": "Flying",
			"swim": "Swimming",
			"climb": "Climbing",
			"burrow": "Burrowing",
		};

		for (const [key, val] of Object.entries(speedObj)) {
			if (key === "canHover") continue;
			const type = typeMap[key] || "Walking";
			const value = typeof val === "number" ? val : (val.number || 30);
			speeds.push({ type, value });
		}

		return speeds.length > 0 ? speeds : [{ type: "Walking", value: 30 }];
	}

	/**
	 * Parse senses array into array of {type, value} objects
	 */
	function parse2024MonsterSenses(sensesArr) {
		if (!sensesArr || !Array.isArray(sensesArr)) return [];

		const senses = [];
		const validSenses = ["darkvision", "blindsight", "tremorsense", "truesight"];

		for (const sense of sensesArr) {
			if (typeof sense !== "string") continue;
			const match = sense.match(/(\w+)\s+(\d+)/i);
			if (match) {
				const senseType = match[1].toLowerCase();
				if (validSenses.includes(senseType)) {
					senses.push({
						type: senseType.charAt(0).toUpperCase() + senseType.slice(1),
						value: parseInt(match[2], 10),
					});
				}
			}
		}

		return senses;
	}

	/**
	 * Parse damage/dice string into components
	 */
	function parse2024MonsterDamage(damageStr) {
		if (!damageStr) return null;
		const match = damageStr.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
		if (match) {
			const bonus = match[4] ? parseInt(match[4], 10) : 0;
			return {
				diceCount: parseInt(match[1], 10),
				diceSize: "d" + match[2],
				bonus: match[3] === "-" ? -bonus : bonus,
			};
		}
		return null;
	}

	/**
	 * Extract attack info from action entries
	 */
	function extractMonsterAttackInfo(entries, renderer) {
		const text = renderer.render({ entries }, 1);
		const result = {
			isAttack: false,
			attackType: "Melee",
			toHit: 0,
			damages: [],
		};

		const attackMatch = text.match(/(Melee|Ranged)\s+(?:Weapon|Spell)\s+Attack:\s*\+(\d+)\s+to hit/i);
		if (attackMatch) {
			result.isAttack = true;
			result.attackType = attackMatch[1];
			result.toHit = parseInt(attackMatch[2], 10);
		}

		const hitMatch = text.match(/Hit:\s*(\d+)\s*\(([^)]+)\)\s*(\w+)\s*damage/i);
		if (hitMatch) {
			const diceStr = hitMatch[2];
			const damageType = hitMatch[3];
			const parsed = parse2024MonsterDamage(diceStr);
			if (parsed) {
				result.damages.push({
					...parsed,
					damageType: damageType.charAt(0).toUpperCase() + damageType.slice(1).toLowerCase(),
				});
			}
		}

		const plusMatch = text.match(/plus\s*(\d+)\s*\(([^)]+)\)\s*(\w+)\s*damage/i);
		if (plusMatch) {
			const diceStr = plusMatch[2];
			const damageType = plusMatch[3];
			const parsed = parse2024MonsterDamage(diceStr);
			if (parsed) {
				result.damages.push({
					...parsed,
					damageType: damageType.charAt(0).toUpperCase() + damageType.slice(1).toLowerCase(),
				});
			}
		}

		return result;
	}

	/**
	 * Build 2024 store from 5etools monster data
	 */
	d20plus.monsters.build2024Store = function(data, renderer) {
		const store = {
			integrants: { integrants: {} },
			actions: {
				actionDisplayOrder: "[]",
				bonusActionDisplayOrder: "[]",
				freeActionDisplayOrder: "[]",
				reactionDisplayOrder: "[]",
				legendaryActionDisplayOrder: "[]",
				mythicActionDisplayOrder: "[]",
			},
			attacks: { attackDisplayOrder: "[]" },
			spells: { displayOrder: ["[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]"] },
			npc: {},
			about: { characteristics: {} },
			character: {},
			settings: { layoutState: "Stat Block" },
			hitpoints: { deathSaves: { failures: 0, open: false, successes: 0 } },
		};

		let arrayPosition = 100;
		const integrants = store.integrants.integrants;

		const createIntegrantBase = (type) => {
			const id = generate2024Id();
			return {
				id,
				base: {
					_enabled: true,
					_label: "",
					type,
					childIDs: "[]",
					parentID: "",
					parentDisabled: false,
					overwriteDisabled: false,
					builderDisplayName: "",
					createdTime: Date.now(),
					arrayPosition: arrayPosition++,
					shortID: id.substring(0, 9),
					source: "Custom",
				},
			};
		};

		// Ability Scores
		const abilities = [
			{ key: "str", name: "Strength" },
			{ key: "dex", name: "Dexterity" },
			{ key: "con", name: "Constitution" },
			{ key: "int", name: "Intelligence" },
			{ key: "wis", name: "Wisdom" },
			{ key: "cha", name: "Charisma" },
		];

		for (const ability of abilities) {
			const value = data[ability.key] || 10;
			const { id, base } = createIntegrantBase("Ability Score");
			integrants[id] = {
				...base,
				ability: ability.name,
				calculation: "Set Value",
				name: "",
				valueFormula: { flatValue: value },
			};
		}

		// Hit Points
		const hp = data.hp?.average ?? data.hp?.special ?? 10;
		const { id: hpId, base: hpBase } = createIntegrantBase("Hit Points");
		integrants[hpId] = {
			...hpBase,
			hitpointType: "Maximum",
			isFixed: false,
			isTemp: false,
			calculation: "Set Value",
			name: "",
			valueFormula: { flatValue: typeof hp === "number" ? hp : parseInt(hp, 10) || 10 },
		};
		store.hitpoints.currentHP = typeof hp === "number" ? hp : parseInt(hp, 10) || 10;

		// Armor Class
		const parsedAc = typeof data.ac === "string" ? data.ac : Parser.acToFull(data.ac);
		const acMatch = String(parsedAc).match(/^\d+/);
		const ac = acMatch ? parseInt(acMatch[0], 10) : 10;
		const { id: acId, base: acBase } = createIntegrantBase("Armor Class");
		integrants[acId] = {
			...acBase,
			defaultAbility: false,
			calculation: "Set Value",
			name: "",
			valueFormula: { flatValue: ac },
		};

		// Size, Type, Alignment
		const size = d20plus.monsters.getSizeString(data.size || "");
		const pType = Parser.monTypeToFullObj(data.type);
		const creatureType = pType.asText || "Unknown";
		const alignment = data.alignment ? Parser.alignmentListToFull(data.alignment) : "Unaligned";

		store.about.characteristics = {
			size: size,
			creatureType: creatureType.charAt(0).toUpperCase() + creatureType.slice(1).toLowerCase(),
			alignment: alignment.charAt(0).toUpperCase() + alignment.slice(1).toLowerCase(),
		};
		store.character.creatureType = creatureType;

		// Challenge Rating
		const cr = data.cr ? (data.cr.cr || data.cr) : "0";
		store.npc.challengeRating = String(cr);

		// Speeds
		const speeds = parse2024MonsterSpeeds(data.speed);
		for (const speed of speeds) {
			const { id, base } = createIntegrantBase("Speed");
			integrants[id] = {
				...base,
				name: speed.type,
				speed: speed.type,
				calculation: "Set Base",
				valueFormula: { flatValue: speed.value },
			};
		}

		// Senses
		const sensesArr = data.senses instanceof Array ? data.senses : (data.senses ? [data.senses] : []);
		const senses = parse2024MonsterSenses(sensesArr);
		for (const sense of senses) {
			const { id, base } = createIntegrantBase("Sense");
			integrants[id] = {
				...base,
				name: sense.type,
				calculation: "Set Base",
				valueFormula: { flatValue: sense.value },
			};
		}

		// Languages
		const languages = data.languages instanceof Array ? data.languages :
			(data.languages ? data.languages.split(",").map(s => s.trim()) : []);
		for (const lang of languages) {
			if (!lang) continue;
			const { id, base } = createIntegrantBase("Language");
			integrants[id] = {
				...base,
				name: lang,
			};
		}

		// Defenses - Resistances
		if (data.resist) {
			const resistances = d20plus.importer.getCleanText(Parser.getFullImmRes(data.resist));
			if (resistances) {
				for (const res of resistances.split(",").map(s => s.trim()).filter(s => s)) {
					const { id, base } = createIntegrantBase("Defense");
					integrants[id] = {
						...base,
						name: res,
						defense: "Resistance",
						damageType: res.charAt(0).toUpperCase() + res.slice(1).toLowerCase(),
					};
				}
			}
		}

		// Defenses - Immunities
		if (data.immune) {
			const immunities = d20plus.importer.getCleanText(Parser.getFullImmRes(data.immune));
			if (immunities) {
				for (const imm of immunities.split(",").map(s => s.trim()).filter(s => s)) {
					const { id, base } = createIntegrantBase("Defense");
					integrants[id] = {
						...base,
						name: imm,
						defense: "Immunity",
						damageType: imm.charAt(0).toUpperCase() + imm.slice(1).toLowerCase(),
					};
				}
			}
		}

		// Defenses - Vulnerabilities
		if (data.vulnerable) {
			const vulnerabilities = d20plus.importer.getCleanText(Parser.getFullImmRes(data.vulnerable));
			if (vulnerabilities) {
				for (const vuln of vulnerabilities.split(",").map(s => s.trim()).filter(s => s)) {
					const { id, base } = createIntegrantBase("Defense");
					integrants[id] = {
						...base,
						name: vuln,
						defense: "Vulnerability",
						damageType: vuln.charAt(0).toUpperCase() + vuln.slice(1).toLowerCase(),
					};
				}
			}
		}

		// Condition Immunities
		if (data.conditionImmune) {
			const conditions = d20plus.importer.getCleanText(Parser.getFullCondImm(data.conditionImmune));
			if (conditions) {
				for (const cond of conditions.split(",").map(s => s.trim()).filter(s => s)) {
					const { id, base } = createIntegrantBase("Defense");
					integrants[id] = {
						...base,
						name: cond,
						defense: "Condition Immunity",
						conditionType: cond.charAt(0).toUpperCase() + cond.slice(1).toLowerCase(),
					};
				}
			}
		}

		// Traits
		if (data.trait) {
			for (const trait of data.trait) {
				const name = d20plus.importer.getCleanText(renderer.render(trait.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: trait.entries }, 1));
				const { id, base } = createIntegrantBase("Feature");
				integrants[id] = {
					...base,
					name: name,
					description: text,
				};
			}
		}

		// Actions
		const actionDisplayOrder = [];
		const attackDisplayOrder = [];

		if (data.action) {
			for (const action of data.action) {
				const name = d20plus.importer.getCleanText(renderer.render(action.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: action.entries }, 1));
				const attackInfo = extractMonsterAttackInfo(action.entries, renderer);

				if (attackInfo.isAttack && attackInfo.damages.length > 0) {
					const { id: attackIntId, base: attackBase } = createIntegrantBase("Attack");
					const damageIds = [];

					for (let i = 0; i < attackInfo.damages.length; i++) {
						const dmg = attackInfo.damages[i];
						const { id: dmgId, base: dmgBase } = createIntegrantBase("Damage");
						integrants[dmgId] = {
							...dmgBase,
							name: `${name} ${dmg.damageType}`,
							damageType: dmg.damageType,
							diceSize: dmg.diceSize,
							diceCount: dmg.diceCount,
							_bonus: dmg.bonus,
							ability: "",
							parentID: attackIntId,
						};
						damageIds.push(dmgId);
					}

					integrants[attackIntId] = {
						...attackBase,
						name: name,
						actionType: "Action",
						description: text,
						attack: {
							abilityBonus: attackInfo.attackType === "Melee" ? "Strength" : "Dexterity",
							proficiencyLevel: "Proficient",
							type: attackInfo.attackType,
						},
						childIDs: JSON.stringify(damageIds),
					};
					attackDisplayOrder.push(attackIntId);
				} else {
					const { id: actionIntId, base: actionBase } = createIntegrantBase("Action");
					integrants[actionIntId] = {
						...actionBase,
						name: name,
						actionType: "Action",
						description: text,
					};
					actionDisplayOrder.push(actionIntId);
				}
			}
		}

		// Bonus Actions
		const bonusActionDisplayOrder = [];
		if (data.bonus) {
			for (const bonus of data.bonus) {
				const name = d20plus.importer.getCleanText(renderer.render(bonus.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: bonus.entries }, 1));
				const { id, base } = createIntegrantBase("Action");
				integrants[id] = {
					...base,
					name: name,
					actionType: "Bonus",
					description: text,
				};
				bonusActionDisplayOrder.push(id);
			}
		}

		// Reactions
		const reactionDisplayOrder = [];
		if (data.reaction) {
			for (const reaction of data.reaction) {
				const name = d20plus.importer.getCleanText(renderer.render(reaction.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: reaction.entries }, 1));
				const { id, base } = createIntegrantBase("Action");
				integrants[id] = {
					...base,
					name: name,
					actionType: "Reaction",
					description: text,
				};
				reactionDisplayOrder.push(id);
			}
		}

		// Legendary Actions
		const legendaryActionDisplayOrder = [];
		if (data.legendary) {
			const legendaryCount = data.legendaryActions || 3;
			store.npc.legendaryActionCount = legendaryCount;

			for (const legendary of data.legendary) {
				const name = d20plus.importer.getCleanText(renderer.render(legendary.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: legendary.entries }, 1));
				const { id, base } = createIntegrantBase("Action");
				integrants[id] = {
					...base,
					name: name,
					actionType: "Legendary",
					description: text,
				};
				legendaryActionDisplayOrder.push(id);
			}
		}

		// Mythic Actions
		const mythicActionDisplayOrder = [];
		if (data.mythic) {
			for (const mythic of data.mythic) {
				const name = d20plus.importer.getCleanText(renderer.render(mythic.name));
				const text = d20plus.importer.getCleanText(renderer.render({ entries: mythic.entries }, 1));
				const { id, base } = createIntegrantBase("Action");
				integrants[id] = {
					...base,
					name: mythic.name,
					actionType: "Mythic",
					description: text,
				};
				mythicActionDisplayOrder.push(id);
			}
		}

		// Update display orders
		store.actions.actionDisplayOrder = JSON.stringify(actionDisplayOrder);
		store.actions.bonusActionDisplayOrder = JSON.stringify(bonusActionDisplayOrder);
		store.actions.reactionDisplayOrder = JSON.stringify(reactionDisplayOrder);
		store.actions.legendaryActionDisplayOrder = JSON.stringify(legendaryActionDisplayOrder);
		store.actions.mythicActionDisplayOrder = JSON.stringify(mythicActionDisplayOrder);
		store.attacks.attackDisplayOrder = JSON.stringify(attackDisplayOrder);

		return store;
	};

	/**
	 * Check if we should use 2024 sheet format for monster import
	 */
	d20plus.monsters.shouldUse2024 = function() {
		return IS_2024_SHEET.has(d20plus.cfg.getOrDefault("import", "importSheetFormat"));
	};

	// ========================================
	// 2024 Drag-Drop Import Support
	// ========================================

	function make2024Id () {
		// Keep IDs short (8 chars) so shortID === full ID — the 2024 sheet indexes by shortID
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let id = "";
		for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
		return id;
	}

	function make2024IntegrantBase (type, arrayPosition) {
		const id = make2024Id();
		return {
			id,
			base: {
				_enabled: true,
				_label: "",
				type,
				childIDs: "[]",
				parentID: "",
				parentDisabled: false,
				overwriteDisabled: false,
				builderDisplayName: "",
				createdTime: Date.now(),
				arrayPosition: arrayPosition !== undefined ? arrayPosition : 0,
				shortID: id, // must equal the full ID — sheet indexes by shortID
				source: "",
			},
		};
	}

	// Returns next safe arrayPosition — one above the current max in the store.
	// All new integrants in the same save MUST use distinct positions to avoid
	// Roll20 deduplicating them when multiple are written at once.
	function getNextArrayPos (store) {
		const ints = (store.integrants && store.integrants.integrants) || {};
		let max = 0;
		Object.values(ints).forEach(function (i) {
			if ((i.arrayPosition || 0) > max) max = i.arrayPosition;
		});
		return max + 1;
	}

	function get2024Store (charModel) {
		const storeAttr = charModel.attribs.find(a => a.get("name") === "store");
		if (!storeAttr) return {attr: null, store: null};
		let store = storeAttr.get("current");
		if (typeof store === "string") store = JSON.parse(store);
		return {attr: storeAttr, store};
	}

	function save2024Store (charModel, storeAttr, store) {
		const storeClone = JSON.parse(JSON.stringify(store));
		try {
			if (storeAttr) storeAttr.destroy();
			charModel.attribs.push({name: "store", current: storeClone}).syncedSave();
			if (charModel.view && typeof charModel.view.showNewVueFrame === "function") {
				charModel.view.showNewVueFrame();
			}
		} catch (e) {
			console.error("betterR20 save2024Store error:", e);
		}
	}

	/**
	 * Import a single spell into a 2024 character sheet's store attribute.
	 */
	d20plus.importer.import2024Spell = function (charModel, spellData) {
		const d = spellData.data;
		const {attr: storeAttr, store: rawStore} = get2024Store(charModel);

		const levelStr = d["Level"] || "0";
		let levelIdx = levelStr === "cantrip" ? 0 : (parseInt(levelStr, 10) || 0);
		if (levelIdx > 9) levelIdx = 9;

		// Parse "V, S, M" string into the object the 2024 sheet expects
		const compStr = (d["Components"] || "").toUpperCase();
		const components = {
			verbal: compStr.includes("V"),
			somatic: compStr.includes("S"),
			material: compStr.includes("M"),
		};

		// Strip units from numeric fields — 2024 sheet stores range/duration as bare numbers
		const parseNum = str => String(parseInt(str, 10) || 0);

		const {id, base} = make2024IntegrantBase("Spell");
		const spellEntry = {
			...base,
			_prepared: true,
			alwaysPrepared: false,
			aoe: {shape: "Cube", size: "0"},
			concentration: (d["Duration"] || "").toLowerCase().includes("concentration"),
			name: spellData.name,
			level: levelIdx,
			school: d["School"] || "Evocation",
			castingTime: d["Casting Time"] || "Action",
			range: parseNum(d["Range"]),
			components,
			duration: parseNum(d["Duration"]),
			description: d["data-description"] || "",
			relations: {},
			ritual: false,
			target: "0",
			upcastText: "",
		};

		// Deep clone to avoid mutating the live reference
		const store = rawStore ? JSON.parse(JSON.stringify(rawStore)) : {
			integrants: {integrants: {}},
			spells: {displayOrder: ["[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]"]},
		};

		if (!store.integrants) store.integrants = {integrants: {}};
		if (!store.integrants.integrants) store.integrants.integrants = {};
		if (!store.spells) store.spells = {displayOrder: ["[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]"]};
		if (!store.spells.displayOrder) store.spells.displayOrder = ["[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]"];

		spellEntry.arrayPosition = getNextArrayPos(store);
		store.integrants.integrants[id] = spellEntry;

		const order = JSON.parse(store.spells.displayOrder[levelIdx] || "[]");
		order.push(id);
		store.spells.displayOrder[levelIdx] = JSON.stringify(order);

		save2024Store(charModel, storeAttr, store);
	};

	/**
	 * Import a single item into a 2024 character sheet's store attribute.
	 * Weapons also create Attack + Damage integrants.
	 */
	d20plus.importer.import2024Item = function (charModel, itemData) {
		const d = itemData.data || {};
		const {attr: storeAttr, store: rawStore} = get2024Store(charModel);

		const store = rawStore ? JSON.parse(JSON.stringify(rawStore)) : {
			integrants: {integrants: {}},
			inventory: {equipmentDisplayOrder: "[]", incrementalQuantityEditing: true, otherPossessionsDisplayOrder: "[]"},
			attacks: {attackDisplayOrder: "[]"},
		};
		if (!store.integrants) store.integrants = {integrants: {}};
		if (!store.integrants.integrants) store.integrants.integrants = {};
		if (!store.inventory) store.inventory = {equipmentDisplayOrder: "[]", incrementalQuantityEditing: true, otherPossessionsDisplayOrder: "[]"};
		if (!store.attacks) store.attacks = {attackDisplayOrder: "[]"};

		// Parse magic item bonus from name e.g. "+1 Longsword" → 1
		const bonusMatch = itemData.name.match(/^\+(\d+)/);
		const magicBonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;

		// All new integrants in this save need distinct arrayPositions to prevent
		// Roll20 from deduplicating them during the Firebase write.
		let pos = getNextArrayPos(store);

		// Item integrant — always added to inventory
		const {id: itemId, base: itemBase} = make2024IntegrantBase("Item", pos++);
		store.integrants.integrants[itemId] = {
			...itemBase,
			name: itemData.name,
			quantity: 1,
			weight: parseFloat(d["Weight"] || "0") || 0,
			cost: "",
			equipData: {equippable: true, equipped: false},
			description: itemData.content || "",
		};
		const invOrder = JSON.parse(store.inventory.equipmentDisplayOrder || "[]");
		invOrder.push(itemId);
		store.inventory.equipmentDisplayOrder = JSON.stringify(invOrder);

		// Weapon — also create Attack + Damage integrants
		if (d["Damage"]) {
			const itemType = (d["Item Type"] || "").toLowerCase();
			const isRanged = itemType.includes("ranged");
			const atkAbility = isRanged ? "Dexterity" : "Strength";
			const atkType = isRanged ? "Ranged" : "Melee";

			const parseDice = (str) => {
				const m = (str || "").match(/(\d+)d(\d+)/i);
				return m ? {diceCount: parseInt(m[1], 10), diceSize: `d${m[2]}`} : {diceCount: 1, diceSize: "d4"};
			};

			const {id: attackId, base: attackBase} = make2024IntegrantBase("Attack", pos++);
			const damageIds = [];

			// Primary damage
			const {id: dmg1Id, base: dmg1Base} = make2024IntegrantBase("Damage", pos++);
			const {diceCount: dc1, diceSize: ds1} = parseDice(d["Damage"]);
			store.integrants.integrants[dmg1Id] = {
				...dmg1Base,
				name: `${itemData.name} Damage`,
				damageType: d["Damage Type"] || "Slashing",
				diceCount: dc1,
				diceSize: ds1,
				_bonus: magicBonus,
				ability: atkAbility,
				critDiceSize: "",
				overrideCrit: false,
				parentID: attackId,
			};
			damageIds.push(dmg1Id);

			// Alternate/versatile damage
			if (d["Alternate Damage"]) {
				const {id: dmg2Id, base: dmg2Base} = make2024IntegrantBase("Damage", pos++);
				const {diceCount: dc2, diceSize: ds2} = parseDice(d["Alternate Damage"]);
				store.integrants.integrants[dmg2Id] = {
					...dmg2Base,
					name: `${itemData.name} Damage (Versatile)`,
					damageType: d["Alternate Damage Type"] || d["Damage Type"] || "Slashing",
					diceCount: dc2,
					diceSize: ds2,
					_bonus: magicBonus,
					ability: atkAbility,
					critDiceSize: "",
					overrideCrit: false,
					parentID: attackId,
				};
				damageIds.push(dmg2Id);
			}

			store.integrants.integrants[attackId] = {
				...attackBase,
				name: itemData.name,
				actionType: "Action",
				description: itemData.content || "",
				_reach: false,
				_reachText: "",
				attack: {
					bonus: magicBonus,
					proficiencyLevel: "Proficient",
					type: atkType,
				},
				childIDs: JSON.stringify(damageIds),
			};
			const atkOrder = JSON.parse(store.attacks.attackDisplayOrder || "[]");
			atkOrder.push(attackId);
			store.attacks.attackDisplayOrder = JSON.stringify(atkOrder);
		}

		save2024Store(charModel, storeAttr, store);
	};

	/**
	 * Route a drag-drop import to the appropriate 2024 handler.
	 * Falls back to the standard importData path for unhandled categories.
	 */
	d20plus.importer.import2024Data = function (charView, data, event, importDataFallback) {
		const charModel = charView.model;
		const category = data.data && data.data.Category;

		if (category === "Spells") {
			d20plus.importer.import2024Spell(charModel, data);
		} else if (category === "Items") {
			d20plus.importer.import2024Item(charModel, data);
		} else {
			// For other categories fall back to the standard path
			importDataFallback(charView, data, event);
		}
	};
}

SCRIPT_EXTENSIONS.push(d20plus2024Import);
