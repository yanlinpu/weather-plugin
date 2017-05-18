weather 管理插件
---

## 返回实时温度／最高最低气温／天气情况

## usage

```
//1.引用package.json
...
"dependencies": {
  "weather-plugin": "git+git@github.com:yanlinpu/weather-plugin.git#with-config",
...
//2.调用方法
var weather = require('weather-plugin');
var city_name='北京';
weather.getCurrentWeather(city_name, function(err,result){});
```
