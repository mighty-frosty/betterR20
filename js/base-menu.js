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
					// Add Mass Roll for token menus
					addMassRollToMenu();
				} else {
					// Remove Mass Roll from non-token menus
					const existingBtn = menu.querySelector('.mass-roll-button');
					if (existingBtn) {
						existingBtn.remove();
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
}

SCRIPT_EXTENSIONS.push(baseMenu);
