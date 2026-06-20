function baseWeather () {
	d20plus.weather = {};

	d20plus.weather.props = {
		"weatherType1": "None",
		"weatherTypeCustom1": "",
		"weatherSpeed1": "0.4",
		"weatherDir1": "Northerly",
		"weatherDirCustom1": "180",
		"weatherOpacity1": "0.5",
		"weatherOscillate1": false,
		"weatherOscillateThreshold1": "0.5",
		"weatherIntensity1": "Normal",
		"weatherTint1": false,
		"weatherTintColor1": "#4c566d",
		"weatherTintOpacity1": "0.5",
		"weatherEffect1": "None",
	};


}

SCRIPT_EXTENSIONS.push(baseWeather);
