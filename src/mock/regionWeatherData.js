export const mockRegionWeatherData = [
  {
    "regionId": 3,
    "regionName": "凤凰岛地铁站停机坪",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.2, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：能见度低于2km且湿度超90%，请勿飞行"]
      },
      // 5时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 98, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 0.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.9, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：能见度低于1km且高湿大雾，请勿飞行"]
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 15, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1011, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 25, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 12.5, "unit": "m/s", "isSuitable": false },
          { "type": "visibility", "value": 5.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": ["警告：风速超过10m/s（阵风），请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 14.8, "unit": "m/s", "isSuitable": false },
          { "type": "CFD", "value": "扰动", "unit": "", "isSuitable": false }
        ],
        "warnings": ["警告：风速超过12m/s且气流扰动，请勿飞行"]
      }
    ]
  },
  {
    "regionId": 6,
    "regionName": "青岛即墨通用机场",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 92, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.0, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：能见度低于1.5km且轻雾，请勿飞行"]
      },
      // 4时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 0.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.8, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：能见度低于1km且大雾，请勿飞行"]
      },
      // 5时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 93, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.9, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：能见度低于1km且雾天未散，请勿飞行"]
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 15, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 17, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.6, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 24, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": ["警告：军方低空训练管制，民用飞行器禁止起降"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": ["警告：军方低空管制持续，民用飞行器禁止起降"]
      }
    ]
  },
  {
    "regionId": 7,
    "regionName": "青岛慈航通用机场",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.4, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1015, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.7, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 4.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 5时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 16, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 56, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 10.2, "unit": "m/s", "isSuitable": false },
          { "type": "precipitation", "value": 30, "unit": "mm/h", "isSuitable": false }
        ],
        "warnings": ["警告：短时强降雨+雷暴，风速超10m/s，请勿飞行"]
      },
      // 15时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 90, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 12.5, "unit": "m/s", "isSuitable": false },
          { "type": "precipitation", "value": 15, "unit": "mm/h", "isSuitable": false }
        ],
        "warnings": ["警告：雷暴持续+降雨，风速超12m/s，请勿飞行"]
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 25, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 28, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 23时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      }
    ]
  },
  {
    "regionId": 8,
    "regionName": "青岛奥帆中心直升机起降点",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 94, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.1, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：海雾侵袭，能见度低于1.5km，请勿飞行"]
      },
      // 4时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 97, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 0.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.8, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：海雾加重，能见度低于1km，请勿飞行"]
      },
      // 5时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.9, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：海雾未散，能见度低于1km，请勿飞行"]
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 17, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.6, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 25, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 92, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.3, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：夜间海雾复现，能见度低于1.5km，请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.0, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：夜间海雾加重，能见度低于1km，请勿飞行"]
      }
    ]
  },
  {
    "regionId": 9,
    "regionName": "青岛金沙滩临时起降点",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 73, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.1, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 76, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 79, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 4.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 94, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.2, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：海雾生成，能见度低于2km，临时起降场无灯光辅助，请勿飞行"]
      },
      // 5时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 97, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 0.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 0.9, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：海雾加重，能见度低于1km，临时起降场无应急保障，请勿飞行"]
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.1, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 17, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.7, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 25, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 93, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.4, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：夜间海雾复现，能见度低于1.5km，临时起降场无灯光标识，请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 96, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.1, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：夜间海雾加重，能见度低于1.5km，临时起降场无救援设施，请勿飞行"]
      }
    ]
  },
  {
    "regionId": 10,
    "regionName": "青岛北站临时起降点",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 74, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.3, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 77, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 83, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 4.7, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 5时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 16, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 56, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1011, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 92, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.3, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：轻雾生成，能见度低于1.5km，且靠近铁路枢纽灯光干扰，请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 0.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.0, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：轻雾加重，能见度低于1km，铁路枢纽灯光易混淆起降场，请勿飞行"]
      }
    ]
  },
  {
    "regionId": 11,
    "regionName": "青岛西海岸通用机场",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 73, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.4, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 76, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 79, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 4.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 5时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 82, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.3, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.6, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 16, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.1, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 56, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1011, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 12.5, "unit": "m/s", "isSuitable": false },
          { "type": "CFD", "value": "扰动", "unit": "", "isSuitable": false }
        ],
        "warnings": ["警告：西南阵风超12m/s，低空气流扰动，请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 83, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 14.8, "unit": "m/s", "isSuitable": false },
          { "type": "visibility", "value": 5.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": ["警告：西南阵风超14m/s，飞行器姿态易失控，请勿飞行"]
      }
    ]
  },
  {
    "regionId": 4,
    "regionName": "青岛胶东国际机场（通用起降区）",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.3, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 20, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 81, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.6, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 84, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 5时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 81, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 77, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 74, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 70, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 16, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.4, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 27, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 56, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1011, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 23, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.6, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 21, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 19, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.5, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.6, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 92, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.4, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：轻雾+民航夜航航班密集，通用空域临时关闭，请勿飞行"]
      },
      // 23时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 95, "unit": "%", "isSuitable": false },
          { "type": "windSpeed", "value": 1.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 1.1, "unit": "km", "isSuitable": false }
        ],
        "warnings": ["警告：轻雾加重+民航管制未解除，通用飞行器禁止起降"]
      }
    ]
  },
  {
    "regionId": 5,
    "regionName": "莱西店埠通用机场",
    "timeSeries": [
      // 0时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 1时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.4, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1015, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 2时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 81, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.7, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 3时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 84, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.0, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 4.9, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 4时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 11, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 87, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 5时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 12, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.2, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1014, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 6时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.0, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 7时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 76, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.1, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 8时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.4, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 9时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.6, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 10时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.9, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1013, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 11时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 16, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 12时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.8, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 8.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 13时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 26, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 58, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.5, "unit": "m/s", "isSuitable": true },
          { "type": "Minute-rainfall", "value": 0, "unit": "mm/10min", "isSuitable": true }
        ],
        "warnings": []
      },
      // 14时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 25, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 60, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.7, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 15时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 24, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 62, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.0, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 18, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 16时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 22, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 65, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.3, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 7.5, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 17时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 20, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 68, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 2.1, "unit": "m/s", "isSuitable": true },
          { "type": "precipitation", "value": 0, "unit": "mm/h", "isSuitable": true }
        ],
        "warnings": []
      },
      // 18时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 18, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 72, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.9, "unit": "m/s", "isSuitable": true },
          { "type": "pressure", "value": 1012, "unit": "hPa", "isSuitable": true }
        ],
        "warnings": []
      },
      // 19时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 17, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 75, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.6, "unit": "m/s", "isSuitable": true },
          { "type": "CFD", "value": "平稳", "unit": "", "isSuitable": true }
        ],
        "warnings": []
      },
      // 20时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 16, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 78, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.3, "unit": "m/s", "isSuitable": true },
          { "type": "cloud", "value": 22, "unit": "%", "isSuitable": true }
        ],
        "warnings": []
      },
      // 21时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 15, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 80, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 1.1, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 6.2, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      },
      // 22时：数据A flightScore=false
      {
        "weatherItems": [
          { "type": "temperature", "value": 14, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 83, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 10.5, "unit": "m/s", "isSuitable": false },
          { "type": "CFD", "value": "扰动", "unit": "", "isSuitable": false }
        ],
        "warnings": ["警告：北风阵风超10m/s，侧风风险高，请勿飞行"]
      },
      // 23时：数据A flightScore=true
      {
        "weatherItems": [
          { "type": "temperature", "value": 13, "unit": "℃", "isSuitable": true },
          { "type": "humidity", "value": 85, "unit": "%", "isSuitable": true },
          { "type": "windSpeed", "value": 3.2, "unit": "m/s", "isSuitable": true },
          { "type": "visibility", "value": 5.8, "unit": "km", "isSuitable": true }
        ],
        "warnings": []
      }
    ]
  }
]

export const WEATHER_TYPE_LABELS = {
  temperature: "温度",
  humidity: "湿度",
  windSpeed: "风速",
  precipitation: "小时降水量",
  pressure: "气压",
  snowfall: "小时降雪量",
  cloud: "云量",
  visibility: "能见度",
  "Minute-rainfall": "10分钟降雨量",
  "CFD": "街区风场模拟"
};

export const FLIGHT_CONDITIONS_THRESHOLD = 30; // 综合评分≤30为优秀（适合飞行）

export default mockRegionWeatherData;