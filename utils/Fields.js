// Dependencies
// =============================================================
const db = require("../models")
const Storage = require("./Storage")

const Fields = {
    /**
     * Helper function for querying the necessary custom fields
     *
     * @param {String} `recipient` page type that gets these fields, i.e. "Posts" or "Pages".
     * @param {String} `template` name of template that gets these fields.
     * @param {Number} `id` integer that represents database ID of owner.
     * @return {Array} List of fields with their configurations.
     */

	get: (recipient, template, owner = null) => new Promise(async (resolve, reject) => {
        try {
            // guard clause
            if (!recipient) throw new Error("Field's all function expects recipient value.")

            const $or = template ? [ {recipient, active: true}, {recipient: "Template", condition: template, active: true} ] : [ {recipient, active: true} ]
            const repeaters_populate = {
                path: 'repeaters',
                model: 'RepeaterFields',
                options: { sort: {"position": 1} },
                populate: {
                    path: 'values',
                    model: 'FieldValues',
                    populate: {
                        path: 'type',
                        model: 'Fields'
                    }
                }
            }
            const fieldGroups_query = await db.FieldGroups.find({ $or }).populate('fields').populate(repeaters_populate)
            const fieldGroups = fieldGroups_query.map(fieldGroup => fieldGroup.toObject( { getters: true } ))

            if (!fieldGroups) {
                return reject(false)
            }

             // insert values (non-repeater values)
            if (owner) {
                const fieldValues = await db.FieldValues.find({owner, in_repeater: false}).populate('file').lean()

                if (fieldValues) {
                    for (let i = 0; i < fieldGroups.length; i++) {
                        const { fields } = fieldGroups[i];

                        if (fields) {
                            for (let f = 0; f < fields.length; f++) {
                                const _field = fields[f]._id;

                                for (let j = 0; j < fieldValues.length; j++) {
                                    const { _id, file, value, type } = fieldValues[j];

                                    if ( type.toString() == _field.toString() ) {
                                        fields[f].field_value_id = _id
                                        fields[f].field_value = file || value

                                        if (file) {
                                            fieldValues[j].is_file = true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            resolve(fieldGroups)

        } catch (error) {
            console.error(error)
            reject(new Error(error))
        }
    }),

	update: (req, owner, in_repeater = false, update_repeater = false) => new Promise(async (resolve, reject) => {
        try {
            // guard clause
            if (!req || !owner) throw new Error("Field updating requires the request object and the id of the page or post.")

            const { body, site_data, files } = req
            const { storage } = site_data.settings
            const query_options = []
            const multi_query_options = []
            const field_indexes = body.field_index
            let field_index, fields, group

            if (field_indexes) {
                field_index = Array.isArray(field_indexes) ? field_indexes : field_indexes.split(',')
            }

            if (field_index) {
                for (let i = 0; i < field_index.length; i++) {
                    const index = field_index[i];
                    const name = `${index}_field`;
                    const type = body[`${index}_type`];
                    const fieldtype = body[`${index}_fieldtype`];
                    const _id = body[`${index}_field_value_id`];
                    const media_selected = body[`${index}_media_select`];
                    let value = body[name] == 'undefined' ? '' : body[name];
                    let file = null;
                    group = body[`${index}_group`];

                    if ( fieldtype == 'upload' ) {
                        if (media_selected) {
                            var media = await db.Media.findById(media_selected, 'path');
                            file = media_selected;
                            value = media.path;
                        } else if (files) {
                            const file_data = files ? files[name] : value;
                            const upload = await Storage.write(file_data, storage);
                            file = upload.media._id;
                            value = upload.media.path;
                        }
                    }

                    const update_params = { type, group, value, owner, file, in_repeater }

                    // delete value fields if no file is provided (to avoid unintended overwrites)
                    if (!value && fieldtype == 'upload') {
                        delete update_params.value;
                    }

                    if (!file && fieldtype == 'upload') {
                        delete update_params.file;
                    }

                    // instances when repeater field IS being updated
                    if (update_repeater) {
                        delete update_params.type;
                        delete update_params.group;
                        delete update_params.owner;

                        const updateMany = {filter: { _id: index }, update: { $set: update_params }};
                        multi_query_options.push({updateMany});
                    }

                    // instances when repeater field IS NOT being updated
                    if ( type && group && owner && !update_repeater ) {
                        const query_option = $set = update_params;

                        if (_id) {
                             // for updating field values
                            const updateMany = {filter: { _id }, update: { $set }};
                            multi_query_options.push({updateMany});
                        } else {
                            // for creating field values
                            query_options.push(query_option);
                        }
                    }
                }
            }

            // for creating field values
            if (query_options.length) {
                fields = await db.FieldValues.insertMany(query_options)

                if (in_repeater) {
                    const values = fields.map((field) => field._id)
                    const new_repeaterField = await db.RepeaterFields.create({group, owner, values})
                    await db.FieldGroups.updateOne({_id: group}, {$push: {repeaters: new_repeaterField._id} })
                }
            }
            
            // for updating field values
            if (multi_query_options.length) {
                await db.FieldValues.bulkWrite(multi_query_options)
                // return values used in update query
                fields = multi_query_options.map( (data) => { return {_id: data.updateMany.filter._id, value: data.updateMany.update.$set.value} } )
            }
            
            resolve(fields)

        } catch (error) {
            console.error(error)
            reject(new Error(error))
        }
    }),

	render: (owner) => new Promise(async (resolve, reject) => {
        try {
            // guard clause
            if (!owner) resolve()

            const group_populate = {
                path: 'group',
                model: 'FieldGroups',
                populate: {
                    path: 'repeaters',
                    model: 'RepeaterFields',
                    options: { sort: {"position": 1} },
                    populate: {
                        path: 'values',
                        model: 'FieldValues',
                        populate: {
                            path: 'type',
                            model: 'Fields'
                        }
                    }
                }
            }
            const field_values = await db.FieldValues.find({ owner }).populate(group_populate).populate('type').populate('file').lean()
            const fields = {}

            if (field_values) {
                for (let i = 0; i < field_values.length; i++) {
                    const { file, group, in_repeater, type, value } = field_values[i];
                    const { active, repeaters, slug } = group
                    const type_slug = type.slug;
                    const value_to_provide = file || value;
                    let group_set = true;

                    if (!active) continue;

                    // set group property in payload object
                    if (!fields[slug]) {
                        fields[slug] = {[type_slug]: null};
                        group_set = false;
                    }
                    
                    if (in_repeater && !group_set) {
                        fields[slug] = repeaters.map((repeater) => { 
                            const { values } = repeater
                            const values_obj = {};

                            for (let j = 0; j < values.length; j++) {
                                const value = values[j];
                                values_obj[value.type.slug] = value.value
                            }
                            
                            return values_obj;
                         });

                    }

                    if (!in_repeater) {
                        fields[slug][type_slug] = value_to_provide;
                    }
                }
            }
            
            resolve(fields)

        } catch (error) {
            console.error(error)
            reject(new Error(error))
        }
	})
}

module.exports = Fields