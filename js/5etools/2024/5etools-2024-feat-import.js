function d20plus2024FeatImport() {
	const u = d20plus.import2024;

	d20plus.importer.import2024Feat = function (charModel, data) {
		const {attr: storeAttr, store} = u.getStore(charModel);
		if (!store) return;

		let pos = u.getNextArrayPos(store);
		const ints = store.integrants.integrants;

		const {id, base} = u.makeIntegrantBase("Features", pos++);
		ints[id] = {
			...base,
			name: data.name,
			recordName: data.name,
			description: data.Vetoolscontent || "",
			source: "Feat",
			parentID: "",
			childIDs: "[]",
			cascades: {},
			relations: {},
		};

		u.pushDisplayOrder(store, "features", "featsDisplayOrder", [id]);

		u.saveStore(charModel, storeAttr, store);
	};
}
SCRIPT_EXTENSIONS.push(d20plus2024FeatImport);
