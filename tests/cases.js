{
	"connect": {
		"success": [
		{
			"description": "Bare minimum connect packet",
			"fixture": [16, 18, 0, 6, 77, 81, 73, 115, 100, 112, 3, 0, 0, 30, 0, 4, 116, 101, 115, 116],
			"input": {
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
			"input": {
				"cmd": "connect",
				"length": 54,
				"version": "MQIsdp",
				"versionNum": 3,
				"client": "test",
				"keepalive": 30,
				"willTopic": "topic",
				"willPayload": "payload",
				"willQos": 2,
				"willRetain": true,
				"clean": true,
				"username": "username",
				"password": "password"
			}
		},{
			"description": "Default parameters (except for client ID since getting the pid is hard)",
			"fixture": [16, 18, 0, 6, 77, 81, 73, 115, 100, 112, 3, 0, 0, 60, 0, 4, 116, 101, 115, 116],
			"input": {"client": "test"}
		}
	],
	"failure": [
		{
			"description": "Invalid version string - not a string",
			"input": { "version" : 3 }
		},{
			"description": "Invalid version number - not a number",
			"input": { "versionNum" : "MQIsdp" }
		},{
			"description": "Invalid client ID - not a string",
			"input": { "client": [] }
		},{
			"description": "Invalid keepalive - not a number",
			"input": { "keepalive": " " }
		},{
			"description": "Invalid keepalive - < 0",
			"input": { "keepalive": -1 }
		},{
			"description": "Invalid keepalive - > 65535",
			"input": { "keepalive": 70000 }
		}
	]
	},
	"connack": {
		"success": [
		{
			"description": "Default parameters",
			"fixture": [32, 2, 0, 0],
			"input": {  }
		},{
			"description": "Return code 3",
			"fixture": [32, 2, 0, 3],
			"input": { "returnCode": 3 }
		}
		],
		"failure": [
		{
			"description": "Invalid return code - < 0",
			"input": { "returnCode": -1 }
		},{
			"description": "Invalid return code - > 5",
			"input": { "returnCode": 6 }
		}
		]
	},
	"publish": {
		"success": [
		{
			"description": "Bare minimum publish packet",
			"fixture": [48, 10, 0, 4, 116, 101, 115, 116, 116, 101, 115, 116],
			"input": {
				"topic": "test",
				"payload": "test"
			}
		},{
			"description": "Christmas tree publish packet",
			"fixture": [61, 12, 0, 4, 116, 101, 115, 116, 0, 10, 116, 101, 115, 116],
			"input": {
				"topic": "test",
				"payload": "test",
				"qos": 2,
				"messageId": 10,
				"dup": true,
				"retain": true
			}
		},{
			"description": "Empty payload",
			"fixture": [48, 6, 0, 4, 116, 101, 115, 116],
			"input": {
				"topic":"test",
				"payload": ""
			}
		},{
			"description": "Default payload",
			"fixture": [48, 6, 0, 4, 116, 101, 115, 116],
			"input": {
				"topic":"test"
			}
		},{
			"description": "QoS == 1 inserts a message ID",
			"fixture": [50, 12, 0, 4, 116, 101, 115, 116, 0, 42, 116, 101, 115, 116],
			"input": {
				"topic":"test",
				"payload": "test",
				"messageId": 42,
				"qos": 1
			}
		}
		],
		"failure":[
		{
			"description": "Invalid topic - not a string",
			"input": { "topic": [], "payload": "test" }
		},{
			"description": "Invalid topic - empty string",
			"input": { "topic": "", "payload": "test" }
		},{
			"description": "Invalid topic - not present",
			"input": { "payload": "test" }
		},{
			"description": "Invalid payload - not a string",
			"input": { "topic": "test", "payload": [] }
		},{
			"description": "Invalid message ID - < 0",
			"input": { "topic": "test", "payload": "test", "messageId": -1}
		},{
			"description": "Invalid message ID - > 65535",
			"input": { "topic": "test", "payload": "test", "messageId": 70000}
		},{
			"description": "Invalid QoS level - < 0",
			"input": { "topic": "test", "payload": "test", "qos": -1 }
		},{
			"description": "Invalid QoS level - > 2",
			"input": { "topic": "test", "payload": "test", "qos": 3 }
		}
		]
	}
}
