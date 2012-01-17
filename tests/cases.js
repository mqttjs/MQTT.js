{
	"connect": [
	{
		"description": "Minimum connect packet",
		"fixture": [16, 18, 0, 6, 77, 81, 73, 115, 100, 112, 3, 0, 0, 30, 0, 4, 116, 101, 115, 116],
		"expected": {
			"cmd": "connect",
			"length": "18",
			"version": "MQIsdp",
			"versionNum": 3,
			"client": "test",
			"keepalive": 30
		}
	},{
		"description": "Christmas tree connect packet",
		"fixture": [16, 54, 0, 6, 77, 81, 73, 115, 100, 112, 3, 246, 0, 30, 0, 4, 116, 101, 115, 116, 0, 5, 116, 111, 112, 105, 99, 0, 7, 112, 97, 121, 108, 111, 97, 100, 0, 8, 117, 115, 101, 114, 110, 97, 109, 101, 0, 8, 112, 97, 115, 115, 119, 111, 114, 100],
		"expected": {
			"cmd": "connect",
			"length": 54,
			"version": "MQIsdp",
			"versionNum": 3,
			"client": "test",
			"keepalive": 30,
			"will": {
				"topic": "topic",
				"payload": "payload",
				"qos": 2,
				"retain": true
			},
			"clean": true,
			"username": "username",
			"password": "password"
		}
	}
	],
	"connack": [
	{
		"description": "Connack packet return code 0",
		"fixture": [32, 2, 0, 0],
		"expected": {
			"cmd": "connack",
			"length": 2,
			"returnCode": 0,
			"qos":0,
			"retain":false,
			"dup":false
		}
	},{
		"description": "Connack packet return code 5",
		"fixture": [32, 2, 0, 5],
		"expected": {
			"cmd": "connack",
			"length": 2,
			"returnCode": 5,
			"qos":0,
			"retain":false,
			"dup":false
		}
	}
	],
	"publish": [
	{
		"description": "Minimum publish packet",
		"fixture": [48, 10, 0, 4, 116, 101, 115, 116, 116, 101, 115, 116],
		"expected": {
			"topic":"test",
			"payload":"test",
			"cmd":"publish",
			"length":10,
			"qos":0,
			"retain":false,
			"dup":false
		}
	},{
		"description": "Christmas tree publish packet",
		"fixture": [61, 12, 0, 4, 116, 101, 115, 116, 0, 10, 116, 101, 115, 116],
		"input": {
			"cmd":"publish",
			"topic": "test",
			"payload": "test",
			"qos": 2,
			"messageId": 10,
			"dup": true,
			"retain": true
		}
	},{
		"description":"Empty payload",
		"fixture": [48, 6, 0, 4, 116, 101, 115, 116],
		"expected": {
			"cmd":"publish",
			"topic":"test",
			"payload":"",
			"qos":0,
			"dup":false,
			"retain":false
		}
	}
	]
}
