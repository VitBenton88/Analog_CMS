const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const UsersSchema = new Schema({
	username: {
		type: String,
		required: true,
		unique: true
	},
	email: {
		type: String,
		required: true,
		unique: true
	},
	image: {
		type: Schema.ObjectId,
		ref: 'Media',
		autopopulate: true
	},
	nickname: {
		type: String
	},
	password: {
		type: String,
		required: true,
		trim: true
	},
	mfa: {
		enabled: {
			type: Boolean,
			default: false
		},
		secret: {
			type: String
		},
		recovery: {
			type: String
		}
	},
	role: {
		type: String,
		required: true,
		default: 'Visitor'
	},
	created: {
		type: Date,
		default: Date.now
	}
})

// Index all fields for searches by user
UsersSchema.index( {'$**': 'text'} )

// Insert autopopulate plugin
UsersSchema.plugin(require('mongoose-autopopulate'))

// Create model using mongoose's model method
const Users = mongoose.model("Users", UsersSchema)

// Export model
module.exports = Users