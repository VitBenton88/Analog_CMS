const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Settings Schema
const SettingsSchema = new Schema({
	meta_body: {
		type: String
	},
	meta_head: {
		type: String,
		default: `<meta name="apple-mobile-web-app-capable"content="yes">
		<meta name="apple-mobile-web-app-status-bar-style"content="black-translucent">`
	},
	name: {
		type: String,
		default: 'Your Website!'
	},
	description: {
		type: String,
		default: "Your Website's Description!"
	},
	address: {
		type: String,
		trim: true
	},
	maintenance: {
		type: Boolean,
		default: false,
		required: true
	},
	storage: {
		type: {
			type: String,
			default: 'local'
		},
		fileSizeLimit: {
			type: Number,
			default: 8
		},
		configurations: {
			aws: {
				accessKeyId: String,
				secretAccessKey: String,
				bucketName: String
			},
			googleCloud: {
				bucketName: String,
				projectId: String
			}
		}
	},
	newsletter: {
		redirect: {
			type: String
		},
		success_msg: {
			type: String
		},
		recaptcha: {
			type: Boolean,
			default: false,
			required: true
		}
	}
})

// Analog Schema
const AnalogSchema = new Schema({
	settings: SettingsSchema,
	created: {
		type: Date,
		default: Date.now
	}
})

// Create model using mongoose's model method
const Analog = mongoose.model("Analog", AnalogSchema)

// Export model
module.exports = Analog