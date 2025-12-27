function baseMenu () {
	d20plus.menu = {};

	d20plus.menu.addSelectedTokenCommands = () => {
		d20plus.ut.log("Add token rightclick commands (Jumpgate)");

		// Initialize Jumpgate Mass Roll
		d20plus.menu.initJumpgateMassRoll();

		// Only bind keyboard shortcuts if Mousetrap library is available
		if (typeof Mousetrap !== "undefined") {
			Mousetrap.bind("b b", function () { // back on layer
				const n = d20plus.engine.getSelectedToMove();
				d20plus.engine.backwardOneLayer(n);
				return false;
			});

			Mousetrap.bind("b f", function () { // forward one layer
				const n = d20plus.engine.getSelectedToMove();
				d20plus.engine.forwardOneLayer(n);
				return false;
			});
		}
	};

	// Jumpgate Mass Roll implementation
	d20plus.menu.initJumpgateMassRoll = () => {
		const getTokenWhisperPart = () => d20plus.cfg.getOrDefault("token", "massRollWhisperName") ? "/w gm Rolling for @{selected|token_name}...\n" : "";

		// Create Jumpgate polyfills for d20.engine selection functions
		if (!d20.engine.selected) {
			d20.engine.selected = function() {
				const activePage = d20.Campaign.activePage();
				if (!activePage || !activePage.thegraphics) return [];

				const graphics = activePage.thegraphics.models;
				return graphics
					.filter(g => g.view && g.view.graphic && g.view.graphic.isSelected)
					.map(g => ({
						_model: g,
						graphic: g.view.graphic
					}));
			};
		}

		if (!d20.engine.unselect) {
			d20.engine.unselect = function() {
				const activePage = d20.Campaign.activePage();
				if (!activePage || !activePage.thegraphics) return;

				const graphics = activePage.thegraphics.models;
				graphics.forEach(g => {
					if (g.view && g.view.graphic && g.view.graphic.deselect) {
						g.view.graphic.deselect();
					}
				});
			};
		}

		if (!d20.engine.select) {
			d20.engine.select = function(token) {
				if (!token) return;

				// token could be the wrapper object with _model and graphic
				const graphic = token.graphic || token;

				if (graphic && graphic.select) {
					graphic.select();
				}
			};
		}

		// Function to add Mass Roll to Jumpgate's context menu
		function addMassRollToMenu() {
			const contextMenu = document.querySelector('.context-menu');
			if (!contextMenu) return;

			// Check if already added - if so, exit early to avoid infinite loop
			if (contextMenu.querySelector('.mass-roll-button')) return;

			// Check if GM
			if (!window.is_gm) return;

			// Only show Mass Roll when right-clicking on a token (not empty canvas)
			// Check for token-specific menu options as primary indicator
			// (currentRadialTarget is false when multiple tokens are selected)
			const hasTokenOptions = Array.from(contextMenu.querySelectorAll('span')).some(
				span => span.textContent.includes('Character Sheet') || span.textContent.includes('Add Turn')
			);
			if (!hasTokenOptions) {
				return;
			}

			// Create Mass Roll button matching native Roll20 structure
			const massRollBtn = document.createElement('button');
			massRollBtn.className = 'mass-roll-button';
			massRollBtn.type = 'button';
			massRollBtn.setAttribute('data-v-2aed8a8e', '');
			massRollBtn.setAttribute('data-v-060adf8b', '');

			massRollBtn.innerHTML = `
				<div data-v-2aed8a8e="" class="submenu-button-outer">
					<div data-v-2aed8a8e="" class="submenu-button-inner">
						<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
								<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">Mass Roll</span>
							</div>
						</div>
					</div>
					<span data-v-2aed8a8e="" class="submenu-button-icon">
						<span data-v-2f0bc668="" data-v-2aed8a8e="" class="grimoire__roll20-icon" style="--7353a950: 0.875rem;">chevronRight</span>
					</span>
				</div>
				<div data-v-2aed8a8e="" class="submenu" style="position: absolute; will-change: transform; top: 0px; left: 0px; transform: translate3d(0px, 0px, 0px); display: none;" x-placement="right-start"></div>
			`;

			const submenu = massRollBtn.querySelector('.submenu');

			// Helper to create submenu item matching native structure
			function createSubmenuItem(label, iconName, onClick) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.setAttribute('data-v-2aed8a8e', '');
				btn.setAttribute('data-v-060adf8b', '');
				btn.innerHTML = `
					<div data-v-2aed8a8e="" class="submenu-button-outer">
						<div data-v-2aed8a8e="" class="submenu-button-inner">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
								${iconName ? `<span data-v-2f0bc668="" data-v-060adf8b="" class="grimoire__roll20-icon" style="--7353a950: inherit;">${iconName}</span>` : ''}
								<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
									<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">${label}</span>
								</div>
							</div>
						</div>
					</div>
				`;
				btn.addEventListener('click', onClick);
				return btn;
			}

			// Create submenu items using only confirmed working icons
			const initBtn = createSubmenuItem('Initiative', 'turnOrderAdd', () => {
				d20plus.menu.massRollInitiative();
				closeContextMenu();
			});

			const savesBtn = createSubmenuItem('Save', 'check', () => {
				d20plus.menu.massRollSaves();
				closeContextMenu();
			});

			const skillsBtn = createSubmenuItem('Skill', 'star', () => {
				d20plus.menu.massRollSkills();
				closeContextMenu();
			});

			submenu.appendChild(initBtn);
			submenu.appendChild(savesBtn);
			submenu.appendChild(skillsBtn);

			// Click handler to toggle submenu
			massRollBtn.addEventListener('click', (e) => {
				e.stopPropagation();

				// Calculate position to place submenu to the right
				const rect = massRollBtn.getBoundingClientRect();
				const contextRect = contextMenu.getBoundingClientRect();

				// Position submenu to the right of the button
				const x = rect.width;
				const y = rect.top - contextRect.top;

				submenu.style.transform = `translate3d(${x}px, ${y}px, 0px)`;

				// Toggle display
				const isVisible = submenu.style.display === 'block';
				submenu.style.display = isVisible ? 'none' : 'block';
			});

			// Insert at the beginning
			contextMenu.insertBefore(massRollBtn, contextMenu.firstChild);
		}

		function closeContextMenu() {
			const menu = document.querySelector('.context-menu');
			if (menu) menu.style.display = 'none';
		}

		// Function to add Set Light button
		function addSetLightToMenu() {
			const contextMenu = document.querySelector('.context-menu');
			if (!contextMenu) return;

			// Check if already added
			if (contextMenu.querySelector('.set-light-button')) return;

			if (!window.is_gm) return;

			// Create Set Light button
			const lightBtn = document.createElement('button');
			lightBtn.className = 'set-light-button';
			lightBtn.type = 'button';
			lightBtn.setAttribute('data-v-2aed8a8e', '');
			lightBtn.setAttribute('data-v-060adf8b', '');

			lightBtn.innerHTML = `
				<div data-v-2aed8a8e="" class="submenu-button-outer">
					<div data-v-2aed8a8e="" class="submenu-button-inner">
						<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
								<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">Set Light</span>
							</div>
						</div>
					</div>
				</div>
			`;

			lightBtn.addEventListener('click', () => {
				d20plus.menu.setTokenLight();
				closeContextMenu();
			});

			// Insert after Mass Roll button
			const massRollBtn = contextMenu.querySelector('.mass-roll-button');
			if (massRollBtn) {
				massRollBtn.parentNode.insertBefore(lightBtn, massRollBtn.nextSibling);
			} else {
				contextMenu.insertBefore(lightBtn, contextMenu.firstChild);
			}
		}

		// Function to add Flight Height button
		function addFlightHeightToMenu() {
			const contextMenu = document.querySelector('.context-menu');
			if (!contextMenu) return;

			// Check if already added
			if (contextMenu.querySelector('.flight-height-button')) return;

			if (!window.is_gm) return;

			// Create Flight Height button
			const flightBtn = document.createElement('button');
			flightBtn.className = 'flight-height-button';
			flightBtn.type = 'button';
			flightBtn.setAttribute('data-v-2aed8a8e', '');
			flightBtn.setAttribute('data-v-060adf8b', '');

			flightBtn.innerHTML = `
				<div data-v-2aed8a8e="" class="submenu-button-outer">
					<div data-v-2aed8a8e="" class="submenu-button-inner">
						<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
								<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">Flight Height</span>
							</div>
						</div>
					</div>
				</div>
			`;

			flightBtn.addEventListener('click', () => {
				d20plus.menu.setFlightHeight();
				closeContextMenu();
			});

			// Insert after Set Light button
			const lightBtn = contextMenu.querySelector('.set-light-button');
			if (lightBtn) {
				lightBtn.parentNode.insertBefore(flightBtn, lightBtn.nextSibling);
			} else {
				contextMenu.insertBefore(flightBtn, contextMenu.firstChild);
			}
		}

		// Function to add Copy Token ID button
		function addCopyTokenIdToMenu() {
			const contextMenu = document.querySelector('.context-menu');
			if (!contextMenu) return;

			// Check if already added
			if (contextMenu.querySelector('.copy-tokenid-button')) return;

			if (!window.is_gm) return;

			// Create Copy Token ID button
			const copyBtn = document.createElement('button');
			copyBtn.className = 'copy-tokenid-button';
			copyBtn.type = 'button';
			copyBtn.setAttribute('data-v-2aed8a8e', '');
			copyBtn.setAttribute('data-v-060adf8b', '');

			copyBtn.innerHTML = `
				<div data-v-2aed8a8e="" class="submenu-button-outer">
					<div data-v-2aed8a8e="" class="submenu-button-inner">
						<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
								<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">Copy Token ID</span>
							</div>
						</div>
					</div>
				</div>
			`;

			copyBtn.addEventListener('click', () => {
				d20plus.menu.copyTokenId();
				closeContextMenu();
			});

			// Insert after Flight Height button
			const flightBtn = contextMenu.querySelector('.flight-height-button');
			if (flightBtn) {
				flightBtn.parentNode.insertBefore(copyBtn, flightBtn.nextSibling);
			} else {
				contextMenu.insertBefore(copyBtn, contextMenu.firstChild);
			}
		}

		// Function to add Edit Token Images button
		function addEditTokenImagesToMenu() {
			const contextMenu = document.querySelector('.context-menu');
			if (!contextMenu) return;

			// Check if already added
			if (contextMenu.querySelector('.edit-token-images-button')) return;

			if (!window.is_gm) return;

			// Create Edit Token Images button
			const editBtn = document.createElement('button');
			editBtn.className = 'edit-token-images-button';
			editBtn.type = 'button';
			editBtn.setAttribute('data-v-2aed8a8e', '');
			editBtn.setAttribute('data-v-060adf8b', '');

			editBtn.innerHTML = `
				<div data-v-2aed8a8e="" class="submenu-button-outer">
					<div data-v-2aed8a8e="" class="submenu-button-inner">
						<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 4px;">
							<div data-v-2aed8a8e="" style="display: flex; align-items: center; gap: 8px;">
								<span data-v-2aed8a8e="" style="flex: 1 1 0%; text-align: start;">Edit Token Images</span>
							</div>
						</div>
					</div>
				</div>
			`;

			editBtn.addEventListener('click', () => {
				d20plus.menu.editToken();
				closeContextMenu();
			});

			// Insert after Copy Token ID button
			const copyBtn = contextMenu.querySelector('.copy-tokenid-button');
			if (copyBtn) {
				copyBtn.parentNode.insertBefore(editBtn, copyBtn.nextSibling);
			} else {
				contextMenu.insertBefore(editBtn, contextMenu.firstChild);
			}
		}

		// Watch for context menu appearing
		const observer = new MutationObserver(() => {
			const menu = document.querySelector('.context-menu');
			if (menu && menu.style.display !== 'none') {
				// Check if this is a token context menu
				// Check if this is a token menu by looking for token-specific options
				const hasTokenOptions = Array.from(menu.querySelectorAll('span')).some(
					span => span.textContent.includes('Character Sheet') || span.textContent.includes('Add Turn')
				);

				if (hasTokenOptions) {
					// Add custom menu items for token menus
					addMassRollToMenu();
					addSetLightToMenu();
					addFlightHeightToMenu();
					addCopyTokenIdToMenu();
					addEditTokenImagesToMenu();
				} else {
					// Remove custom menu items from non-token menus
					const existingMassRoll = menu.querySelector('.mass-roll-button');
					if (existingMassRoll) {
						existingMassRoll.remove();
					}
					const existingLight = menu.querySelector('.set-light-button');
					if (existingLight) {
						existingLight.remove();
					}
					const existingFlight = menu.querySelector('.flight-height-button');
					if (existingFlight) {
						existingFlight.remove();
					}
					const existingCopy = menu.querySelector('.copy-tokenid-button');
					if (existingCopy) {
						existingCopy.remove();
					}
					const existingEdit = menu.querySelector('.edit-token-images-button');
					if (existingEdit) {
						existingEdit.remove();
					}
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['style']
		});
	};

	// Mass Roll functions (work for both Legacy and Jumpgate)
	d20plus.menu.massRollInitiative = function() {
		const sel = d20.engine.selected();
		d20.engine.unselect();
		sel.forEach((it, index) => {
			setTimeout(() => {
				d20.engine.select(it);
				let toRoll = ``;
				if (d20plus.sheet === "ogl") {
					toRoll = `%{selected|Initiative}`;
				} else if (d20plus.sheet === "shaped") {
					toRoll = `@{selected|output_option} &{template:5e-shaped} {{ability=1}} {{title=INITIATIVE}} {{roll1=[[@{selected|initiative_formula}]]}}`;
				}
				d20.textchat.doChatInput(toRoll);
				d20.engine.unselect();
			}, index * 100); // 100ms delay between each roll
		});
	};

	d20plus.menu.massRollSaves = function() {
		const options = ["str", "dex", "con", "int", "wis", "cha"].map(it => Parser.attAbvToFull(it));
		const getTokenWhisperPart = () => d20plus.cfg.getOrDefault("token", "massRollWhisperName") ? "/w gm Rolling for @{selected|token_name}...\n" : "";

		// Show dialog to select save type
		const dialog = $(`<div><p style='font-size: 1.15em;'><strong>Select Save:</strong> <select style='width: 150px; margin-left: 5px;'>${options.map(o => `<option>${o}</option>`).join('')}</select></p></div>`);

		dialog.dialog({
			title: "Mass Roll Saves",
			buttons: {
				Submit: function() {
					const val = dialog.find("select").val();
					const sel = d20.engine.selected();
					d20.engine.unselect();
					sel.forEach((it, index) => {
						setTimeout(() => {
							d20.engine.select(it);
							if (d20plus.sheet === "ogl") {
								const short = val.substring(0, 3);
								const toRoll = `${getTokenWhisperPart()}@{selected|wtype}&{template:npc} @{selected|npc_name_flag} {{type=Save}} @{selected|rtype} + [[@{selected|npc_${short.toLowerCase()}_save}]][${short.toUpperCase()}]]]}} {{rname=${val} Save}} {{r1=[[1d20 + [[@{selected|npc_${short.toLowerCase()}_save}]][${short.toUpperCase()}]]]}}`;
								d20.textchat.doChatInput(toRoll);
							} else if (d20plus.sheet === "shaped") {
								const toRoll = `@{selected|output_option}} &{template:5e-shaped} {{ability=1}} {{character_name=@{selected|token_name}}} {{title=${val} Save}} {{mod=@{selected|${val.toLowerCase()}_mod}}} {{roll1=[[1d20+@{selected|${val.toLowerCase()}_mod}]]}} {{roll2=[[1d20+@{selected|${val.toLowerCase()}_mod}]]}}`;
								d20.textchat.doChatInput(toRoll);
							}
							d20.engine.unselect();
						}, index * 100); // 100ms delay between each roll
					});
					dialog.dialog("destroy").remove();
				},
				Cancel: function() {
					dialog.dialog("destroy").remove();
				}
			}
		});
	};

	d20plus.menu.massRollSkills = function() {
		const options = [
			"Athletics", "Acrobatics", "Sleight of Hand", "Stealth",
			"Arcana", "History", "Investigation", "Nature", "Religion",
			"Animal Handling", "Insight", "Medicine", "Perception", "Survival",
			"Deception", "Intimidation", "Performance", "Persuasion"
		].sort();
		const getTokenWhisperPart = () => d20plus.cfg.getOrDefault("token", "massRollWhisperName") ? "/w gm Rolling for @{selected|token_name}...\n" : "";

		// Show dialog to select skill
		const dialog = $(`<div><p style='font-size: 1.15em;'><strong>Select Skill:</strong> <select style='width: 150px; margin-left: 5px;'>${options.map(o => `<option>${o}</option>`).join('')}</select></p></div>`);

		dialog.dialog({
			title: "Mass Roll Skills",
			buttons: {
				Submit: function() {
					const val = dialog.find("select").val();
					const sel = d20.engine.selected();
					d20.engine.unselect();
					sel.forEach((it, index) => {
						setTimeout(() => {
							d20.engine.select(it);
							if (d20plus.sheet === "ogl") {
								const slugged = val.replace(/\s/g, "_").toLowerCase();
								const toRoll = `${getTokenWhisperPart()}@{selected|wtype}&{template:npc} @{selected|npc_name_flag} {{type=Skill}} @{selected|rtype} + [[@{selected|npc_${slugged}}]]]]}}; {{rname=${val}}}; {{r1=[[1d20 + [[@{selected|npc_${slugged}}]]]]}}`;
								d20.textchat.doChatInput(toRoll);
							} else if (d20plus.sheet === "shaped") {
								const abil = `${Parser.attAbvToFull(Parser.skillToAbilityAbv(val.toLowerCase())).toLowerCase()}_mod`;
								const toRoll = `@{selected|output_option} &{template:5e-shaped} {{ability=1}} {{character_name=@{selected|token_name}}} {{title=${val}}} {{mod=@{selected|${abil}}}} {{roll1=[[1d20+@{selected|${abil}}]]}} {{roll2=[[1d20+@{selected|${abil}}]]}}`;
								d20.textchat.doChatInput(toRoll);
							}
							d20.engine.unselect();
						}, index * 100); // 100ms delay between each roll
					});
					dialog.dialog("destroy").remove();
				},
				Cancel: function() {
					dialog.dialog("destroy").remove();
				}
			}
		});
	};

	// Set Token Light (Jumpgate)
	d20plus.menu.setTokenLight = function() {
		const LIGHT_SOURCES = {
			"None (Blind)": {
				emits_bright_light: false,
				bright_light_distance: 0,
				emits_low_light: false,
				low_light_distance: 0,
				has_night_vision: false,
				night_vision_distance: 0
			},
			"Torch/Light (Spell)": {
				emits_bright_light: true,
				bright_light_distance: 20,
				emits_low_light: true,
				low_light_distance: 40,
				has_night_vision: false
			},
			"Lamp": {
				emits_bright_light: true,
				bright_light_distance: 15,
				emits_low_light: true,
				low_light_distance: 45,
				has_night_vision: false
			},
			"Lantern, Bullseye": {
				emits_bright_light: true,
				bright_light_distance: 60,
				emits_low_light: true,
				low_light_distance: 120,
				has_directional_bright_light: true,
				directional_bright_light_total: 60,
				directional_bright_light_center: 0,
				has_night_vision: false
			},
			"Lantern, Hooded": {
				emits_bright_light: true,
				bright_light_distance: 30,
				emits_low_light: true,
				low_light_distance: 60,
				has_night_vision: false
			},
			"Lantern, Hooded (Dimmed)": {
				emits_bright_light: false,
				bright_light_distance: 0,
				emits_low_light: true,
				low_light_distance: 5,
				has_night_vision: false
			},
			"Candle": {
				emits_bright_light: true,
				bright_light_distance: 5,
				emits_low_light: true,
				low_light_distance: 10,
				has_night_vision: false
			},
			"Darkvision (60ft)": {
				emits_bright_light: false,
				bright_light_distance: 0,
				emits_low_light: false,
				low_light_distance: 0,
				has_night_vision: true,
				night_vision_distance: 60
			},
			"Darkvision (120ft)": {
				emits_bright_light: false,
				bright_light_distance: 0,
				emits_low_light: false,
				low_light_distance: 0,
				has_night_vision: true,
				night_vision_distance: 120
			},
			"Torch + Darkvision": {
				emits_bright_light: true,
				bright_light_distance: 20,
				emits_low_light: true,
				low_light_distance: 40,
				has_night_vision: true,
				night_vision_distance: 60
			}
		};

		const sel = d20.engine.selected();
		if (sel.length === 0) {
			alert("Please select at least one token.");
			return;
		}

		// Show dialog to select light type
		const dialog = $(`<div><p style='font-size: 1.15em;'><strong>Select Light Source:</strong> <select style='width: 250px; margin-left: 5px;'>${Object.keys(LIGHT_SOURCES).map(o => `<option>${o}</option>`).join('')}</select></p></div>`);

		dialog.dialog({
			title: "Set Token Light",
			buttons: {
				Apply: function() {
					const val = dialog.find("select").val();
					const lightConfig = LIGHT_SOURCES[val];

					sel.forEach(token => {
						// Apply light emission settings
						token._model.set("emits_bright_light", lightConfig.emits_bright_light || false);
						token._model.set("bright_light_distance", lightConfig.bright_light_distance || 0);
						token._model.set("emits_low_light", lightConfig.emits_low_light || false);
						token._model.set("low_light_distance", lightConfig.low_light_distance || 0);

						// Apply directional light if specified
						if (lightConfig.has_directional_bright_light) {
							token._model.set("has_directional_bright_light", true);
							token._model.set("directional_bright_light_total", lightConfig.directional_bright_light_total);
							token._model.set("directional_bright_light_center", lightConfig.directional_bright_light_center);
						} else {
							token._model.set("has_directional_bright_light", false);
						}

						// Apply vision settings
						token._model.set("has_night_vision", lightConfig.has_night_vision || false);
						if (lightConfig.night_vision_distance) {
							token._model.set("night_vision_distance", lightConfig.night_vision_distance);
						}

						// Enable sight if any light or vision is set
						const hasSight = lightConfig.emits_bright_light || lightConfig.emits_low_light || lightConfig.has_night_vision;
						token._model.set("light_hassight", hasSight);

						token._model.save();
					});

					dialog.dialog("destroy").remove();
				},
				Cancel: function() {
					dialog.dialog("destroy").remove();
				}
			}
		});
	};

	// Copy Token ID
	d20plus.menu.copyTokenId = function() {
		const sel = d20.engine.selected();
		if (sel.length === 0) {
			alert("Please select a token.");
			return;
		}

		const token = sel[0];
		const tokenId = token._model.id;

		// Show prompt with token ID for copying
		window.prompt("Copy to clipboard: Ctrl+C, Enter", tokenId);
	};

	// Edit Token Images - Constants and helpers
	const tagSize = "#roll20_token_size=";
	const tagSkip = "#roll20_skip_token=";

	function tokenEditorTexts (selection) {
		const name = selection.length > 1 ? "You are editing multiple tokens" : selection[0]._model?.attributes?.name || "Unnamed token";
		const description = selection.length > 1 ? `
			If you press "Save", the changes will be applied to each of the selected tokens, making them multi-sided if you have multiple images on the list below
		` : selection[0]._model.attributes.sides ? `
			You are currently editing images for multi-sided token. Add or remove as many sides as you want. If only one image remains, the token will become a single-sided one
		` : `
			Currently this token is represented by a single image. Add more images to convert it to multi-sided token
		`;
		const tokenList = selection.length <= 1 ? "" : selection.reduce((r, t) => `${r}
			<div class="tokenbox selected" data-tokenid="${t._model.id}" data-tokenimg="${t._model.attributes.imgsrc}">
				<div class="inner">
					<img src="${t._model.attributes.imgsrc}">
					<div class="name">${t._model.attributes.name}</div>
				</div>
			</div>
		`, "");
		return {name, description, tokenList};
	}

	// Edit Token Images function (adapted for Jumpgate)
	d20plus.menu.editToken = (tokenId) => {
		const selection = tokenId
			? [{_model: d20plus.ut.getTokenById(tokenId)}].filter(t => !!t._model?.attributes)
			: d20.engine.selected();
		if (!selection.length) return;

		const images = [];
		const added = [];
		const $dialog = $(d20plus.html.tokenImageEditor);
		const $list = $dialog.find(".tokenimagelist tbody");
		const $tokenList = $dialog.find(".tokenlist");
		const sizes = [["tiny - half square", "0.5"], ["small - 1x1", "1.0"], ["medium - 1x1", "1"], ["large - 2x2", "2"], ["huge - 3x3", "3"], ["gargantuan - 4x4", "4"], ["colossal - 5x5", "5"], ["custom", "0"]];

		const findStandardSize = (w, h) => {
			return (w === h && sizes.find(s => s[1] === `${w / 70}`)?.last()) || "0";
		};

		const addImageOnInit = (img, add) => {
			const sizeChanged = img.w !== images.last()?.w || img.h !== images.last()?.h;
			if (images.length && sizeChanged) $list.variedSizes = true;
			images.push(img);
			added.push(add || img.url);
		};

		selection.forEach(t => {
			const sides = t._model.attributes.sides?.split("|");
			const token = t._model.attributes.imgsrc;
			const {width: tw, height: th} = t._model.attributes;

			if (sides && sides.length > 1) {
				const curSide = sides[t._model.attributes.currentSide] || token;
				sides.forEach((s, k) => {
					const checked = unescape(s);
					const listed = added.indexOf(checked);
					const [url, size] = checked.split(tagSize);
					const [sw, sh] = (size || "").split("x");
					const image = {
						url: url.replaceAll(tagSkip, ""),
						skip: url.includes(tagSkip),
						face: unescape(curSide).includes(url),
						w: tw,
						h: th,
					};
					if (listed !== -1) {
						if (k === t._model.attributes.currentSide) images[listed].face = true;
						return;
					} else if (!isNaN(size)) {
						Object.merge(image, {size, w: size * 70, h: size * 70});
					} else if (!isNaN(sw) && !isNaN(sh)) {
						Object.merge(image, {size: "0", w: sw, h: sh});
					}
					addImageOnInit(image, checked);
				});
			} else {
				const listed = added.indexOf(t._model.attributes.imgsrc);
				if (listed !== -1) images[listed].face = true;
				else addImageOnInit({url: t._model.attributes.imgsrc, face: true, w: tw, h: th});
			}
		});

		if ($list.variedSizes) {
			images.forEach(i => { if (i.size === undefined) i.size = findStandardSize(i.w, i.h); });
		}

		const htmls = tokenEditorTexts(selection);

		const resetTokens = () => {
			$tokenList.find(".selected").each((k, t) => {
				const $token = $(t);
				const $tokenimage = $token.find("img");
				$tokenimage.attr("src", $token.data("tokenimg"));
			});
		};

		const buildList = () => {
			if (images.length === 1) {
				$list.someImageSelected = true;
				images[0].selected = true;
			}
			$list.html(images.reduce((r, i, k) => `${r}
				<tr class="tokenimage${images.length === 1 ? " lastone" : ""}${i.skip ? " skipped" : ""}" data-index="${(i.id = k, k)}">
					<td style="padding:0px;" title="Current image">
						<input class="face" type="checkbox"${i.selected ? " checked" : ""}>
					</td>
					<td>
						<div class="dropbox filled">
						<div class="inner"><img src="${i.url}"><div class="remove"><span>Drop a file</span></div></div>
						</div>
					</td>
					<td>
						<label>Select size:</label><select>${sizes.reduce((o, s) => `${o}
							<option value="${s[1]}"${s[1] === i.size ? " selected" : ""}>${s[0]}</option>
						`, `<option>default (keep as is)</option>`)}</select>
						<span class="custom${i.size === "0" ? " set" : ""}"><input class="w" value="${i.w}"> X <input class="h" value="${i.h}">px</span>
						<label class="skippable"><input class="toskip" type="checkbox"${i.skip ? " checked" : ""}> Skip side on randomize</label>
					</td>
					<td style="padding:0px;">
						<span class="btn url" title="Edit URL...">j</span>
						<span class="btn delete" title="Delete">#</span>
					</td>
				</tr>
			`, ""));
			if (!$list.someImageSelected) {
				images.forEach((i, k) => {
					if (i.face) $list.find("input.face").eq(k).prop({indeterminate: true});
				});
			}
		};

		$dialog.dialog({
			autoopen: true,
			title: "Edit token image(s)",
			width: 450,
			open: () => {
				buildList();
				$tokenList.html(htmls.tokenList);
				$dialog.parent().css("maxHeight", "80vh").css("top", "10vh");
				$dialog.find(".edittitle").text(htmls.name);
				$dialog.find(".editlabel").text(htmls.description);

				// Event handlers
				$dialog.on("change", "select", evt => {
					const $changed = $(evt.target);
					const $token = $changed.parent();
					const $custom = $token.find(".custom").removeClass("set");
					const newSize = $changed.val();
					const id = $changed.closest(".tokenimage").data("index");
					if (newSize > 0) {
						$token.find(".w, .h").val(newSize * 70);
						images[id].size = newSize;
						$list.variedSizes = true;
					} else {
						delete images[id].size;
						if (newSize === "0") {
							$list.variedSizes = true;
							images[id].size = newSize;
							images[id].w = $token.find(".w").val();
							images[id].h = $token.find(".h").val();
							$custom.addClass("set");
						}
					}
				}).on("change", "input.face", evt => {
					const id = $(evt.target).closest(".tokenimage").data("index");
					const isChecked = $(evt.target).prop("checked");
					const $allBoxes = $list.find("input.face");
					if (isChecked) {
						$list.someImageSelected = true;
						$allBoxes.prop({checked: false}).prop({indeterminate: false});
						$(evt.target).prop({checked: true});
						$tokenList.find(".selected img").attr("src", images[id].url);
						images.forEach((i, k) => {
							if (k === id) i.selected = true;
							else i.selected = false;
						});
					} else {
						$list.someImageSelected = false;
						images[id].selected = false;
						resetTokens();
						images.forEach((i, k) => {
							if (i.face) $allBoxes.eq(k).prop({indeterminate: true});
						});
					}
				}).on("change", "input.toskip", evt => {
					const $token = $(evt.target).closest(".tokenimage");
					const id = $token.data("index");
					const isChecked = $(evt.target).prop("checked");
					if (isChecked) {
						$token.addClass("skipped");
						images[id].skip = true;
					} else {
						$token.removeClass("skipped");
						images[id].skip = false;
					}
				}).on(window.mousedowntype, ".url", evt => {
					const $token = $(evt.target).closest(".tokenimage");
					const $image = $token.find("img");
					const id = $token.data("index");
					const url = window.prompt("Edit URL", $image.attr("src"));
					if (!url) return;
					d20plus.art.setLastImageUrl(url);
					images[id].url = url;
					$image.attr("src", url);
				}).on(window.mousedowntype, ".delete", evt => {
					const $deleted = $(evt.target).closest(".tokenimage");
					const id = $deleted.data("index");
					if (images.length <= 1) return;
					if (images[id].selected) {
						$list.someImageSelected = false;
						resetTokens();
					}
					images.splice(id, 1);
					buildList();
					if (images.length === 1) {
						$list.someImageSelected = true;
						$list.find("input.face").prop({checked: true});
						$tokenList.find(".selected img").attr("src", images[0].url);
					}
				}).on(window.mousedowntype, ".addimageurl", () => {
					const url = window.prompt("Enter a URL", d20plus.art.getLastImageUrl());
					if (!url) return;
					d20plus.art.setLastImageUrl(url);
					images.push({url, w: 70, h: 70});
					buildList();
				});
			},
			close: () => {
				$dialog.off();
				$dialog.dialog("destroy").remove();
			},
			buttons: {
				save: {
					text: "Save changes",
					click: () => {
						const save = {};
						if (images.length > 1) {
							save.sides = images.map(i => {
								const skipped = i.skip ? tagSkip : "";
								const size = i.size ? tagSize + (i.size === "0" ? `${i.w}x${i.h}` : i.size) : "";
								return escape(i.url + skipped + size);
							}).join("|");
						} else {
							save.sides = "";
						}
						if ($list.someImageSelected) {
							const selected = images.find(i => i.selected);
							if (selected) {
								save.imgsrc = selected.url;
								save.currentSide = selected.id;
								if (selected.size === "0") {
									save.width = Number(selected.w);
									save.height = Number(selected.h);
								} else if (selected.size) {
									save.width = selected.size * 70;
									save.height = selected.size * 70;
								}
							}
						}
						if (selection.length > 1) {
							d20.engine.unselect();
						}
						selection.forEach(t => {
							if (selection.length === 1
								|| $tokenList.find(`[data-tokenid=${t._model.id}]`).hasClass("selected")) {
								t._model.save(save);
							}
						});
						$dialog.off();
						$dialog.dialog("destroy").remove();
						d20.textchat.$textarea.focus();
					},
				},
				cancel: {
					text: "Cancel",
					click: () => {
						$dialog.off();
						$dialog.dialog("destroy").remove();
					},
				},
			},
		});

		return $dialog;
	};

	// Set Flight Height
	d20plus.menu.setFlightHeight = function() {
		const sel = d20.engine.selected();
		if (sel.length === 0) {
			alert("Please select at least one token.");
			return;
		}

		// Create dialog
		const $dialog = $(`
			<div title="Flight Height">
				<p>Enter flight height (0 to clear):</p>
				<input type="number" placeholder="Flight height" name="flight" style="width: 100%; padding: 5px; font-size: 14px;">
			</div>
		`).appendTo($("body"));

		const $iptHeight = $dialog.find(`input[name="flight"]`);

		const doHandleOk = () => {
			const height = Number($iptHeight.val());
			$dialog.dialog("close");
			$dialog.remove();

			if (isNaN(height)) {
				alert(`Value "${$iptHeight.val()}" is not a valid number!`);
				return;
			}

			const STATUS_PREFIX = `fluffy-wing@`;

			sel.forEach(token => {
				const existing = token._model.get("statusmarkers");

				if (height === 0) {
					// Clear flight height markers
					if (existing && existing.trim()) {
						const filtered = existing.split(",").filter(it => it && !it.startsWith(STATUS_PREFIX)).join(",");
						token._model.set("statusmarkers", filtered);
					}
				} else {
					// Set flight height markers (one marker per digit)
					const statusString = `${height}`.split("").map(digit => `${STATUS_PREFIX}${digit}`).join(",");

					if (existing && existing.trim()) {
						// Remove old flight markers and add new ones
						const otherMarkers = existing.split(",").filter(it => it && !it.startsWith(STATUS_PREFIX));
						const newMarkers = [statusString, ...otherMarkers].join(",");
						token._model.set("statusmarkers", newMarkers);
					} else {
						token._model.set("statusmarkers", statusString);
					}
				}

				token._model.save();
			});
		};

		// Handle Enter key
		$iptHeight.on("keypress", evt => {
			if (evt.which === 13) { // Enter key
				doHandleOk();
			}
		});

		$dialog.dialog({
			dialogClass: "no-close",
			width: 300,
			buttons: [
				{
					text: "Cancel",
					click: function () {
						$(this).dialog("close");
						$dialog.remove();
					}
				},
				{
					text: "OK",
					click: function () {
						doHandleOk();
					}
				}
			]
		});

		// Focus input
		setTimeout(() => $iptHeight.focus(), 100);
	};
}

SCRIPT_EXTENSIONS.push(baseMenu);
