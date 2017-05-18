module.exports = function(config){
    var redis = require('redis');
    var _ = require("underscore");
    var log = require("node-logger").getLogger();
    var redisConfig = config;

    var clientURLS;
    var that = {};
    function bindEvent(){
        clientURLS.on("error", function (err){
            log.error(err.stack || err);
            log.debug("redis error of urls");
            process.nextTick(function (){
                reConnectToRedis();
            });
        });

        clientURLS.on("end", function (){
            log.debug("redis client of urls was closed");
            process.nextTick(function (){
                reConnectToRedis();
            });
        });
    }

    var rc;
    var retryTimes = 0;
    function reConnectToRedis(){

        if (rc) {
            clearTimeout(rc);
        }
        if (retryTimes < 10) {
            rc = setTimeout(function (){
                retryTimes ++;
                connectToRedis();
            }, 3000);
        }
    }

    /**
     *
     * @param key
     * @param val
     * @param expires 多少秒之后过期 ,默认2天
     * @param callback
     */
    that.setExpire = function (key, val, expires, callback){
        if (_.isFunction(expires)) {
            callback = expires;
            expires = 0;
        }
        //expires = + expires;
        expires = expires || 3600;//默认1h
        //var ex = expires;
        clientURLS.setex([key, expires, val], function (err, reply){
            log.debug(arguments);
            if (callback) {
                process.nextTick(function (){
                    callback(err, reply);
                })
            }
        });
    };

    //hset
    that.hsetValue = function(key, id, value, callback){
        clientURLS.hset([key, id, value], function(err, reply){
            callback(err, reply);
        })   
    }

    //hmset
    that.hmsetValues = function(key, id, values, callback){
        clientURLS.hmset([key, id, values], function(err, reply){
            callback(err, reply);
        })
    }

    //city id
    that.hgetValue = function(key, id, callback){
        clientURLS.hget([key, id],function(err, reply){
            callback(err, reply);
        });
    }

    that.getCityId = function(key, id, callback){
        clientURLS.hget([key, id], function(err, reply){
            reply = JSON.parse(reply);
            var result = '';
            if(reply){
                result = reply.id.split(reply.countryCode)[1];
            }
            callback(err, result);
        })
    }

    that.getWeather = function(key, callback){
        clientURLS.get(key, function(err, reply){
            callback(err, JSON.parse(reply));
        })
    }

    function connectToRedis(){
        clientURLS = redis.createClient(redisConfig);
        clientURLS.on("ready", function (error){
            if (error) {
                log.error(error.stack || error);
                return;
            }
            retryTimes = 0;
            var number = redisConfig.db;
            clientURLS.select(number, function (){
                log.debug("redis client of urls db selected number is %s", number);
            });

            log.debug("redis client of urls is ready");
            bindEvent();
        });

    }

    connectToRedis();

    return that;
}