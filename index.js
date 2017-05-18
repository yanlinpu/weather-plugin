'use strict';

var that = {};
that.weather = require("./lib/weather");
that.init = function(options){
    that.weather.init(options);
}
that.getCurrentWeather=that.weather.getCurrentWeather;
module.exports = that;