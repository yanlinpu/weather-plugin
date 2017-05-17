'use strict';

var that = {};
that.weather = require("./lib/weather");
that.weather.init();

that.getCurrentWeather=that.weather.getCurrentWeather;
module.exports = that;