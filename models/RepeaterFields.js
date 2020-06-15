const mongoose = require("mongoose")
const Schema = mongoose.Schema
const AutoIncrement = require('mongoose-sequence')(mongoose)

// Schema
const RepeaterFieldsSchema = new Schema({
	group: { 
		type: Schema.ObjectId, 
		ref: 'FieldGroups', 
		required: true
	},
	owner: { 
		type: Schema.ObjectId,
		required: true
    },
	values: [{
		type: Schema.ObjectId,
		ref: 'FieldValues'
	}],
	position: {
		type: Number,
		default: 0
	}
})

// Insert AutoIncrement plugin
RepeaterFieldsSchema.plugin(AutoIncrement, {
	id: 'repeater_field_pos',
	inc_field: 'position'
})

// Create model using mongoose's model method
const RepeaterFields = mongoose.model("RepeaterFields", RepeaterFieldsSchema)

// Export model
module.exports = RepeaterFields