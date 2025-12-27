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
