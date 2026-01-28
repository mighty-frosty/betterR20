function baseToolAutoBackup() {
	d20plus.autoBackup = {};

	const BACKUP_HANDOUT_PREFIX = "BetteR20 Backup - ";
	const MAX_BACKUPS = 5;

	// ===========================
	// CORE BACKUP FUNCTIONS
	// ===========================

	/**
	 * Extract full campaign data for backup
	 * @returns {Promise<Object>} Campaign data object
	 */
	d20plus.autoBackup.getBackupData = async () => {
		try {
			d20plus.ut.log("Gathering campaign data for backup...");

			const journal = d20plus.journal.getExportableJournal();

			// Export maps with graphics/paths/text/doors/windows
			d20plus.ut.log("Exporting maps...");
			const maps = await Promise.all(d20.Campaign.pages.models.map(async map => {
				if (!map.thegraphics) {
					await map.fullyLoadPage();
				}

				const getOut = () => {
					return {
						attributes: map.attributes,
						graphics: (map.thegraphics || []).map(g => g.attributes),
						text: (map.thetexts || []).map(t => t.attributes),
						paths: (map.thepaths || []).map(p => p.attributes),
						doors: (map.doors || []).map(d => d.attributes),
						windows: (map.windows || []).map(w => w.attributes),
					};
				};

				if (map.get("archived")) {
					map.set({archived: false});
					await d20plus.ut.promiseDelay(d20plus.cfg.getOrDefault("import", "importIntervalHandout") * 2);
					const out = getOut();
					map.set({archived: true});
					return out;
				} else {
					return getOut();
				}
			}));

			// Export roll tables
			d20plus.ut.log("Exporting rolltables...");
			const rolltables = d20.Campaign.rollabletables.models.map(rolltable => ({
				attributes: rolltable.attributes,
				tableitems: (rolltable.tableitems.models || []).map(tableitem => tableitem.attributes),
			}));

			// Export decks (filter out "Playing Cards")
			d20plus.ut.log("Exporting decks...");
			const decks = d20.Campaign.decks.models.map(deck => {
				if (deck.name && deck.name.toLowerCase() === "playing cards") return;
				return {
					attributes: deck.attributes,
					cards: (deck.cards.models || []).map(card => card.attributes),
				};
			}).filter(it => it);

			// Export jukebox playlists and tracks
			d20plus.ut.log("Exporting jukebox...");
			const playlists = d20plus.jukebox.getExportablePlaylists();
			const tracks = d20plus.jukebox.getExportableTracks();

			// Export characters and handouts with blob data
			let blobCount = 0;
			let onBlobsReady = null;

			const handleBlob = (addTo, asKey, data) => {
				addTo[asKey] = data;
				blobCount--;
				if (onBlobsReady && blobCount === 0) onBlobsReady();
			};

			// Export characters
			d20plus.ut.log("Exporting characters...");
			const characters = d20.Campaign.characters.models.map(character => {
				character.attribs.fetch(character.attribs);
				const out = {
					attributes: character.attributes,
					attribs: character.attribs,
				};
				const abilities = (character.abilities || {models: []}).models.map(ability => ability.attributes);
				if (abilities && abilities.length) out.abilities = abilities;
				blobCount += 3;
				character._getLatestBlob("bio", (data) => handleBlob(out, "blobBio", data));
				character._getLatestBlob("gmnotes", (data) => handleBlob(out, "blobGmNotes", data));
				character._getLatestBlob("defaulttoken", (data) => handleBlob(out, "blobDefaultToken", data));
				return out;
			});

			// Export handouts (filter out system handouts)
			d20plus.ut.log("Exporting handouts...");
			const handouts = d20.Campaign.handouts.models.map(handout => {
				// Filter out system handouts and backup handouts
				if (handout.attributes.name === ART_HANDOUT ||
					handout.attributes.name === CONFIG_HANDOUT ||
					handout.attributes.name.startsWith(BACKUP_HANDOUT_PREFIX)) {
					return;
				}

				const out = {
					attributes: handout.attributes,
				};
				blobCount += 2;
				handout._getLatestBlob("notes", (data) => handleBlob(out, "blobNotes", data));
				handout._getLatestBlob("gmnotes", (data) => handleBlob(out, "blobGmNotes", data));
				return out;
			}).filter(it => it);

			// Wait for all blobs to load
			d20plus.ut.log("Waiting for blobs...");
			await new Promise(resolve => {
				onBlobsReady = () => {
					d20plus.ut.log("Blobs are ready!");
					resolve();
				};
				if (blobCount === 0) onBlobsReady();
			});

			// Build final payload
			const payload = {
				schema_version: 1,
				maps,
				rolltables,
				decks,
				journal,
				handouts,
				characters,
				playlists,
				tracks,
			};

			d20plus.ut.log("Backup data gathered successfully");
			return payload;

		} catch (e) {
			d20plus.ut.error("Failed to gather backup data:", e);
			throw e;
		}
	};

	/**
	 * Create a backup handout with campaign data
	 * @param {boolean} isManual - Whether this is a manual backup
	 * @returns {Promise<void>}
	 */
	d20plus.autoBackup.createBackup = async (isManual = false) => {
		try {
			d20plus.ut.log(`Creating ${isManual ? "manual" : "automatic"} backup...`);

			// Get campaign data
			const data = await d20plus.autoBackup.getBackupData();

			// Create timestamp and handout name
			const timestamp = new Date();
			const dateStr = timestamp.toISOString().slice(0, 19).replace('T', ' ');
			const name = `${BACKUP_HANDOUT_PREFIX}${dateStr}`;

			// Create backup handout
			await new Promise((resolve, reject) => {
				d20.Campaign.handouts.create({
					name: name,
					archived: true
				}, {
					success: function(handout) {
						try {
							// Add backup metadata
							const backupData = {
								...data,
								timestamp: timestamp.getTime(),
								backupType: isManual ? "manual" : "auto"
							};

							const json = JSON.stringify(backupData);
							handout.updateBlobs({gmnotes: json});
							handout.save({notes: timestamp.getTime(), inplayerjournals: ""});

							d20plus.ut.log(`Backup created: ${name}`);
							resolve(handout);
						} catch (e) {
							reject(e);
						}
					},
					error: function(handout, error) {
						reject(new Error(`Failed to create backup handout: ${error}`));
					}
				});
			});

			// Update config with last backup timestamp
			if (d20plus.cfg && d20plus.cfg.setCfgVal) {
				d20plus.cfg.setCfgVal("autoBackup", "lastBackupTimestamp", timestamp.getTime());

				// Save config
				const configHandout = d20plus.cfg.getConfigHandout();
				if (configHandout) {
					const gmnotes = JSON.stringify(d20plus.cfg.current).replace(/%/g, "%25");
					configHandout.updateBlobs({gmnotes: gmnotes});
					configHandout.save({notes: timestamp.getTime()});
				}
			}

			// Cleanup old backups
			await d20plus.autoBackup.cleanupOldBackups();

			// Show success message
			d20plus.ut.chatLog(`Backup created successfully: ${name}`);

		} catch (e) {
			d20plus.ut.error("Backup failed:", e);
			d20plus.ut.chatLog("Backup failed! Check console for details.");
			throw e;
		}
	};

	/**
	 * List all backup handouts
	 * @returns {Array} Array of backup handout models
	 */
	d20plus.autoBackup.listBackups = () => {
		return d20.Campaign.handouts.models.filter(h =>
			h.attributes.name.startsWith(BACKUP_HANDOUT_PREFIX)
		);
	};

	/**
	 * Delete backups beyond the 5 most recent
	 * @returns {Promise<void>}
	 */
	d20plus.autoBackup.cleanupOldBackups = async () => {
		try {
			const backups = d20plus.autoBackup.listBackups();

			// Sort by name (which includes timestamp) - newest first
			backups.sort((a, b) => b.attributes.name.localeCompare(a.attributes.name));

			// Delete backups beyond MAX_BACKUPS
			if (backups.length > MAX_BACKUPS) {
				const toDelete = backups.slice(MAX_BACKUPS);
				d20plus.ut.log(`Cleaning up ${toDelete.length} old backups...`);

				toDelete.forEach(backup => {
					d20plus.ut.log(`Deleting old backup: ${backup.attributes.name}`);
					backup.destroy();
				});
			}
		} catch (e) {
			d20plus.ut.error("Failed to cleanup old backups:", e);
		}
	};

	/**
	 * Check if backup is due and run if needed
	 * @returns {Promise<void>}
	 */
	d20plus.autoBackup.checkAndRunScheduledBackup = async () => {
		try {
			const schedule = d20plus.cfg.getOrDefault("autoBackup", "schedule", "off");
			if (schedule === "off") {
				d20plus.ut.log("Auto-backup is disabled");
				return;
			}

			const enabled = d20plus.cfg.getOrDefault("autoBackup", "enabled", true);
			if (!enabled) {
				d20plus.ut.log("Auto-backup is disabled via config");
				return;
			}

			const lastBackup = d20plus.cfg.getOrDefault("autoBackup", "lastBackupTimestamp", 0);
			const now = Date.now();

			// Calculate interval in milliseconds
			const intervals = {
				weekly: 7 * 24 * 60 * 60 * 1000,
				biweekly: 14 * 24 * 60 * 60 * 1000,
				monthly: 30 * 24 * 60 * 60 * 1000
			};

			const interval = intervals[schedule];
			if (!interval) {
				d20plus.ut.log(`Unknown backup schedule: ${schedule}`);
				return;
			}

			if (now - lastBackup >= interval) {
				d20plus.ut.log("Auto-backup is due, creating backup...");
				await d20plus.autoBackup.createBackup(false);
			} else {
				const nextBackup = new Date(lastBackup + interval);
				d20plus.ut.log(`Next auto-backup scheduled for: ${nextBackup.toISOString()}`);
			}
		} catch (e) {
			d20plus.ut.error("Failed to check scheduled backup:", e);
		}
	};

	/**
	 * Initialize auto-backup system
	 */
	d20plus.autoBackup.init = () => {
		if (!window.is_gm) {
			d20plus.ut.log("Auto-backup is GM-only, skipping initialization");
			return;
		}

		d20plus.ut.log("Initializing Auto-Backup system");

		// Wait 5 seconds after page load to check for scheduled backup
		setTimeout(() => {
			d20plus.autoBackup.checkAndRunScheduledBackup();
		}, 5000);
	};

	// ===========================
	// TOOL UI
	// ===========================

	d20plus.tool.tools.push({
		toolId: "AUTO_BACKUP",
		name: "Auto Backup",
		desc: "Configure automatic campaign backups and manage backup history",
		html: `
			<div id="d20plus-autobackup" title="BetteR20 - Auto Backup" style="position: relative">
				<h3>Auto Backup Configuration</h3>
				<p>Backups are stored as archived handouts named "BetteR20 Backup - [date]"</p>
				<p>Only the 5 most recent backups are kept. Older backups are automatically deleted.</p>

				<hr>

				<h4>Manual Backup</h4>
				<button class="btn" name="backup-now">Backup Now</button>
				<span name="backup-status" style="margin-left: 10px; font-style: italic;"></span>

				<hr>

				<h4>Backup List</h4>
				<div id="backup-list-container">
					<ul class="list backuplist" style="max-height: 400px; overflow-y: auto; display: block; margin: 0;">
						<!-- populated by JS -->
					</ul>
				</div>

				<hr>

				<p><i>Schedule and retention settings are in the Config Editor (Settings > Edit Config > Auto Backup tab)</i></p>
			</div>
		`,
		dialogFn: () => {
			$("#d20plus-autobackup").dialog({
				autoOpen: false,
				width: 600,
				height: 500,
			});
		},
		openFn: () => {
			const $win = $("#d20plus-autobackup");
			$win.dialog("open");

			const $btnBackupNow = $win.find(`[name="backup-now"]`);
			const $backupStatus = $win.find(`[name="backup-status"]`);
			const $backupList = $win.find(".backuplist");

			// Populate backup list
			const populateBackupList = () => {
				const backups = d20plus.autoBackup.listBackups();
				backups.sort((a, b) => b.attributes.name.localeCompare(a.attributes.name));

				$backupList.empty();

				if (backups.length === 0) {
					$backupList.append(`<li style="padding: 5px;"><i>No backups found</i></li>`);
				} else {
					backups.forEach(backup => {
						const name = backup.attributes.name;
						const dateStr = name.replace(BACKUP_HANDOUT_PREFIX, "");

						const $li = $(`<li style="padding: 5px; cursor: pointer;" title="Click to download backup JSON"></li>`);
						$li.text(dateStr);

						$li.on("click", () => {
							// Download the backup JSON
							$backupStatus.text("Downloading backup...");

							backup._getLatestBlob("gmnotes", (gmnotes) => {
								try {
									// Create filename from backup name
									const filename = name.replace(/[^-\w\s]/g, "_") + ".json";

									// Create blob and download
									const blob = new Blob([gmnotes], {type: "application/json"});
									d20plus.ut.saveAs(blob, filename);

									$backupStatus.text("Download started!");
									setTimeout(() => {
										$backupStatus.text("");
									}, 2000);
								} catch (e) {
									d20plus.ut.error("Failed to download backup:", e);
									$backupStatus.text("Download failed!");
									setTimeout(() => {
										$backupStatus.text("");
									}, 3000);
								}
							});
						});

						$backupList.append($li);
					});
				}
			};

			populateBackupList();

			// Backup Now button
			$btnBackupNow.off("click").on("click", async () => {
				try {
					$btnBackupNow.prop("disabled", true);
					$backupStatus.text("Creating backup...");

					await d20plus.autoBackup.createBackup(true);

					$backupStatus.text("Backup created successfully!");
					populateBackupList();

					setTimeout(() => {
						$backupStatus.text("");
					}, 3000);
				} catch (e) {
					$backupStatus.text("Backup failed! Check console for details.");
				} finally {
					$btnBackupNow.prop("disabled", false);
				}
			});
		}
	});
}

SCRIPT_EXTENSIONS.push(baseToolAutoBackup);
