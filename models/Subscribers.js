const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const SubscriberSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true
	},
	created: {
		type: Date,
		default: Date.now
	}
})

// Index all fields for searches by user
SubscriberSchema.index( {'$**': 'text'} )

// Create model using mongoose's model method
const Subscribers = mongoose.model("Subscribers", SubscriberSchema)

// Export model
module.exports = Subscribers