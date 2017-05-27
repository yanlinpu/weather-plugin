"use strict";

const WEATHERCITYID = "weather:city_id:hash";
var WEATHERCITIES = 'weather:cities:hash';
var request = require("request");
var async = require("async");
var that = {};
var cyUtils;
var currentWeatherTime = 0, dayWeatherTime = 0;
that.init = function (options){
    cyUtils = require('./util')(options);
    setCityIdToRedis();
};

function setCityIdToRedis() {
    cyUtils.hgetValue(WEATHERCITYID, 'all',function(err, reply){
        if(reply){
            console.log('city_id已经存储完毕。');
            return
        }
        console.log('begin存储CITYID')
        var city_id_url = 'https://cdn.heweather.com/china-city-list.json';
        request({
            url: city_id_url,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                body.forEach(function(city) {
                    cyUtils.hmsetValues(WEATHERCITYID, city.cityZh, JSON.stringify(city), function(err, reply){});
                    cyUtils.hsetValue(WEATHERCITYID, 'all', true, function(err, reply){})
                });
            }
        });
    })
}

/**
 * Get Weather 
 * @param city
 * @param callback
 */
that.getCurrentWeather = function(city,callback) {
    cyUtils.getCityId(WEATHERCITYID, city,function(err, city_id){
        if(err || city_id==''){
            callback('城市不存在');
            return
        }

        cyUtils.hgetValue(WEATHERCITIES, city_id, function(err, reply){
            var weather = JSON.parse(reply);
            if(weather && Date.now()-weather.updated_at < 3600000){
                callback(null, weather);
                return
            }
            async.parallel([
                function(cb){
                    currentWeather(city_id, cb);
                },
                function(cb){
                    dayWeather(city_id, cb);
                }
            ], function(err, result){
                if(err){
                    callback(null, weather);
                    return
                }
                var res = {};
                var currentWen = result[0].weatherinfo;
                var dayWen = result[1].weatherinfo;
                var temp1 = dayWen.temp1.split("℃");
                var low = parseInt(temp1[0]);
                var high = parseInt(temp1[1].substring(1, temp1[1].length));
                if(low>high) {
                    high = low;
                }
                res.weather = dayWen.weather1
                res.low_temp = low;
                res.high_temp = high;
                res.temp = currentWen.temp;
                res.updated_at = Date.now();
                cyUtils.hmsetValues(WEATHERCITIES, city_id, JSON.stringify(res), function(err, reply){});
                //cyUtils.setExpire(weather_city+city_id, JSON.stringify(res), 3600);
                callback(null, res);
            });
        });
    });
};

function currentWeather(city_id, callback){
    //实时温度
    var url = 'http://weather.51wnl.com/weatherinfo/GetMoreWeather?cityCode='+city_id+'&weatherType=1';
    request({
        url: url,
        json: true,
        timeout: 1000
    },function(error, response, body){
        if(!error && response.statusCode === 200 && body && body.weatherinfo && body.weatherinfo.temp){
            callback(null, body);
        }else{
            currentWeatherTime++;
            if(currentWeatherTime >= 3){
                callback("请求超时");
            }else{
                currentWeather(city_id, callback);
            }
        }
    });
}

function dayWeather(city_id, callback){
    //全天温度
    var url = 'http://weather.51wnl.com/weatherinfo/GetMoreWeather?cityCode='+city_id+'&weatherType=0';       
    request({
        url: url,
        json: true,
        timeout: 1000
    },function(error, response, body){
        if(!error && response.statusCode === 200 && body && body.weatherinfo && body.weatherinfo.weather1){
            callback(null, body);
        }else{
            dayWeatherTime++;
            if(dayWeatherTime >= 3){
                callback("请求超时");
            }else{
                dayWeather(city_id, callback);
            }
        }
    });     
}

module.exports = that;