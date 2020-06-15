const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const FieldGroupSchema = new Schema({
	name: {
        type: String,
        required: true,
        unique: true
	},
	slug: {
        type: String,
        required: true,
        unique: true
    },
	active: {
		type: Boolean,
        default: true,
        required: true
    },
	repeater: {
		type: Boolean,
        default: false,
        required: true
    },
	sortable: {
		type: Boolean,
        default: false,
        required: true
    },
    recipient: {
        type: String,
        required: true
    },
    condition: {
        type: String
    },
	repeaters: [{
		type: Schema.ObjectId,
		ref: 'RepeaterFields'
	}],
	fields: [{
		type: Schema.ObjectId,
		ref: 'Fields'
	}]
})

// Index all fields for searches by user
FieldGroupSchema.index({ '$**': 'text' })

// Create model using mongoose's model method
const FieldGroups = mongoose.model("FieldGroups", FieldGroupSchema)

// Export model
module.exports = FieldGroups
