const mongoose = require("mongoose")
const AutoIncrement = require('mongoose-sequence')(mongoose)
const Schema = mongoose.Schema

// Schema
const FieldValueSchema = new Schema({
	value: {
        type: String
	},
	file: { 
		type: Schema.ObjectId, 
		ref: 'Media'
	},
	owner: { 
		type: Schema.ObjectId,
		required: true
    },
	type: { 
		type: Schema.ObjectId, 
		ref: 'Fields', 
		required: true
	},
	group: { 
		type: Schema.ObjectId, 
		ref: 'FieldGroups', 
		required: true
	},
    in_repeater: {
        type: Boolean,
        default: false
	}
})

// Create model using mongoose's model method
const FieldValues = mongoose.model("FieldValues", FieldValueSchema)

// Export model
module.exports = FieldValues
