const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const MenuSchema = new Schema({
    name: {
        type: String,
        default: 'Your Menu'
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
})

// Index all fields for searches by user
MenuSchema.index( {'$**': 'text'} )

// Create model using mongoose's model method
const Menu = mongoose.model("Menu", MenuSchema)

// Export model
module.exports = Menu