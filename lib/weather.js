"use strict";

const WEATHERCITYID = "weather:city_id:hash";
var weather_city = 'weather:city:';
var request = require("request");
var that = {};
var cyUtils;
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
        cyUtils.getWeather(weather_city+city_id, function(err, weather){
            if(weather==null){
                //实时温度
                var url = 'http://weather.51wnl.com/weatherinfo/GetMoreWeather?cityCode='+city_id+'&weatherType=1';       
                request({
                    url: url,
                    json: true,
                    timeout: 2000
                },function(error, response, body){
                    if(error){
                        callback('请求数据超时');
                        return
                    }
                    if (!error && response.statusCode === 200) {
                        var result = {}
                        dayWeather(city_id, function(err, obj){
                            if(err){
                                callback(err);
                                return
                            }
                            result.weather = obj.weatherinfo.weather1
                            var temp1 = obj.weatherinfo.temp1.split("℃");
                            var low = parseInt(temp1[0]);
                            var high = parseInt(temp1[1].substring(1, temp1[1].length));
                            if(low>high) {
                               high = low
                            }
                            result.low_temp = low;
                            result.high_temp = high;
                            result.temp = body.weatherinfo.temp;
                            cyUtils.setExpire(weather_city+city_id, JSON.stringify(result), 3600);
                            callback(null, result);
                            return
                        });
                    }  
                });
            }else{
                callback(null, weather);
            }
        });
    });
};

function dayWeather(city_id, callback){
    //全天温度
    var url = 'http://weather.51wnl.com/weatherinfo/GetMoreWeather?cityCode='+city_id+'&weatherType=0';       
    request({
        url: url,
        json: true,
        timeout: 2000
    },function(error, response, body){
        if(!error && body.hasOwnProperty('weatherinfo') && response.statusCode === 200){
            callback(null, body);
            return
        }
        callback("请求超时");
    })      
}
module.exports = that;