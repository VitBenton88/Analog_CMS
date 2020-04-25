module.exports = (app, db, slugify, Utils) => {

    // FORMS PAGE GET
    // =============================================================
    app.get("/admin/contact/forms", async (req, res) => {
        const { body, query, site_data, user } = req
        let { limit, orderBy, paged, search, sort } = query
        const { _id, role, username } = user
        const sessionUser = { username, _id, role }

        try {
            // if the orderBy queries don't exist in the url params, this is to ensure orderBy works with a search form
            orderBy = orderBy || body.orderBy
            sort = sort || body.sort

            // set query limit to 10 as default, or use defined limit (converted to int)
            limit = limit ? parseInt(limit) : 10

            // set paged to 1 as default, or use defined query (converted to int)
            paged = paged ? parseInt(paged) : 1

            // determine offset in query by current page in pagination
            const skip = paged > 0 ? ((paged - 1) * limit) : 0

            // get query count for pagination
            const count = await db.Forms.find().countDocuments().lean()
            const pageCount = Math.ceil(count / limit)
            // setup query params
            const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : { 'created': 1 }
            const searchParams = search ? { $text: {$search: search} } : {}

            // query db
            const forms = await db.Forms.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
            // swap sort after the query if there is an order requested, e.g. desc to asc
            sort = orderBy ? Utils.Sort.swapOrder(sort) : null

            res.render("admin/forms", {
                forms,
                limit,
                orderBy,
                pageCount,
                paged,
                search,
                sessionUser,
                site_data,
                sort,
                layout: "admin"
            })

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/admin')
        }
    })

    // UPDATE FORM PAGE - GET
    // =============================================================
    app.get("/admin/contact/forms/edit/:id", async (req, res) => {
        const { originalUrl, params, site_data, user } = req
        const sessionUser = { username: user.username, _id: user._id }

        try {            
            // query form
            const _id = params.id
            const form = await db.Forms.findById({_id}).lean()

            res.render("admin/edit/form", {
                form,
                originalUrl,
                sessionUser,
                site_data,
                layout: "admin"
            })

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/admin/contact/forms')
        }
    })

    // CREATE FORM PAGE - GET
    // =============================================================
    app.get("/admin/contact/forms/add", (req, res) => {
        const { originalUrl, site_data, user } = req
        const { _id, username } = user
        const sessionUser = { username, _id }

        res.render("admin/add/form", {
            originalUrl,
            sessionUser,
            site_data,
            layout: "admin"
        })
    })

    // CREATE FORM - POST
    // =============================================================
    app.post("/addform", async (req, res) => {
        const { name, fields, mail, settings } = req.body
        const slug = slugify(name)

        try {
            // some basic validation
            if (!name || !slug || !fields.length) {
                throw new Error('Form creation attempt failed due to missing required fields.')
            }

            // create form in db
            const newFrom = await db.Forms.create({ name, slug, fields, mail, settings })

            req.flash( 'admin_success', 'Form successfully added.' )
            res.status(200).json(newFrom)

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.status(500).json(errorMessage)
        }
    })

    // UPDATE FORM - POST
    // =============================================================
    app.post("/updateform", async (req, res) => {
        const { _id, name, fields, mail, settings } = req.body
        const slug = slugify(name)

        try {
            // some basic validation
            if (!name || !slug) {
                throw new Error('Form creation attempt failed due to missing required fields.')
            }

            // update query to db
            const updatedForm = await db.Forms.findOneAndUpdate({_id }, { name, fields, mail, settings })

            // respond
            res.status(200).json(updatedForm)

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect(`/admin/contact/forms/edit/${_id}`)
        }
    })

    // UPDATE SEVERAL FORMS - POST
    // =============================================================
    app.post("/updateformmulti", async (req, res) => {
        const { list_id_arr, update_criteria, update_value } = req.body

        try {
            // check if this is a delete query
            const deleteQuery = update_criteria === 'delete';
            // setup db query params
            const _id = forms = { $in: list_id_arr }

            //define db query based on update criteria
            const Query = deleteQuery ? db.Forms.deleteMany({ _id }) : db.Forms.updateMany({ _id }, { $set })

            // update pages in db ...
            await Query
            // pull form from any pages and posts that use it
            await db.Pages.updateMany({ forms }, { $pull: { forms } })
            await db.Posts.updateMany({ forms }, { $pull: { forms } })

            const flashMsg = deleteQuery ? 'Forms successfully deleted.' : 'Bulk edit successful.'

            req.flash('admin_success', flashMsg)
            res.send(true);

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect(`/admin/contact/forms`)
        }
    })

    // DELETE FORM - POST
    // =============================================================
    app.post("/deleteform", async (req, res) => {
        const { _id } = req.body

        try {
            // setup db query params
            const forms = { $in: _id }
            // delete query to db
            await db.Forms.deleteOne({ _id })
            // pull form from any pages and posts that use it
            await db.Pages.updateMany({ forms }, { $pull: { forms } })
            await db.Posts.updateMany({ forms }, { $pull: { forms } })

            req.flash( 'admin_success', 'Form successfully deleted.' )
            res.status(200).end()

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect(`/admin/contact/forms/edit/${_id}`)
        }
    })

    // HANDLE FORM SUBMISSIONS - POST
    // =============================================================
    app.post("/analog/form/:_id", async (req, res) => {
        const { body, files, ip, params, recaptchaScore, site_data } = req
        // capture form id
        const { _id } = params
        const { formLocation } = body

        try {
            // query form
            const form = await db.Forms.findById({ _id })
            const { name, fields, mail } = form
            let { recipients, replyTo, subject, success, redirect } = mail
            const destination = redirect ? redirect : formLocation
            const mediaNames = []
            const submittedFields = []
            const storage_type = site_data.settings.storage
            const storage_type_is_local = storage_type == 'local'
            let fileName_for_email = ''
            const successContainsVars = success.includes('{{') && success.includes('}}')
            const subjectContainsVars = subject.includes('{{') && subject.includes('}}')
            const replyToContainsVars = replyTo.includes('{{') && replyTo.includes('}}')

            // loop through fields to do some stuff
            fields.forEach((field, i) => {
                const { name, label, required, type } = field
                let value = body[name]
                // check if this submission has files
                if (type === 'file' && files) {
                    const file = files[name]
                    fileName_for_email = file.name
                    const multipleFiles = Array.isArray(file)
                    const routes = Utils.Storage.getRoute(file, multipleFiles, false)
                    value = multipleFiles ? routes.map((route) => route.absolutePath) : routes.absolutePath
                    mediaNames.push(name)
                }
                // skip submit buttons, copy, and empty values
                if (type === 'submit' || type === 'copy' || !value) {
                    return
                }
                // make sure all required fields are satisfied
                if (required && !value) {
                    throw new Error(`Missing value for the required "${label || name}" field.`)
                }
                // collect all field data for entry recording
                const fieldEntry = {name, value, label, type, fileName_for_email}
                submittedFields.push(fieldEntry)
            })

            // upload media
            if (files && mediaNames.length) {
                for (const name of mediaNames) {
                    const uploadedMedia = await Utils.Storage.write(files[name], storage_type)
                    const {media, renames} = uploadedMedia
                    const {fileName, path} = media
                    // if there were renames, the file names have to updated for the entry and email
                    if (!storage_type_is_local || renames.length) {
                        for (let i = 0; i < submittedFields.length; i++) {
                            const submittedField = submittedFields[i]
                            const {value} = submittedField

                            // for instances when the file in on cloud storage, the value needs to be updated to the external url
                            if ( !storage_type_is_local && value.includes(fileName) ) {
                                submittedFields[i].value = path
                            }

                            // loop through renames to re-assign values
                            if (renames && renames.length) {
                                for (let r = 0; r < renames.length; r++) {
                                    const rename = renames[r]
                                    const {newName, originalName} = rename
                                    // handle instances when multiple files were uploaded for one field
                                    if (Array.isArray(value)) {
                                        for (let p = 0; p < value.length; p++) {
                                            if (path.includes(originalName)) {
                                                submittedField.value[p] = submittedField.value[p].replace(originalName, newName)
                                            } 
                                        }
                                    } else {
                                        if (value.includes(originalName)) {
                                            submittedField.value = value.replace(originalName, newName)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // setup meta object for entry
            const meta = {}
            if (ip) {
                meta.ip = ip
            }
            if (recaptchaScore) {
                meta.recaptchaScore = recaptchaScore
            }
            
            // record entry
            const entry = await db.Entries.create({form: _id, fields: submittedFields, meta})
            // record entry to the form
            await db.Forms.updateOne({_id}, { $push: {entries: entry._id} })

            // if recipients exist, fire smtp, otherwise end with response
            if (recipients.length) {
                // function for creatng table rows in email body
                const getFieldRows = (field) => {
                    let {label, name, type, value, fileName_for_email} = field
                    
                    if (type == 'file') {
                        value = `<a href="${value}">${fileName_for_email}</a>`
                    }

                    return `<tr><td>${label || name}</td><td>${value}</td></tr>`
                }

                const text = `Form submission from form '${name}.'`
                const html = `<p>${text}</p><table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${submittedFields.map(getFieldRows).join('')}</tbody></table>`
                // replace any embedded vars in subject, success, and replyl-to message config strings with actual values
                if (successContainsVars || subjectContainsVars || replyToContainsVars) {
                    submittedFields.forEach(submittedField => {
                        let {name, value} = submittedField
                        if (successContainsVars) {
                            success = success.replace(new RegExp(`\{\{(?:\\s+)?(${name})(?:\\s+)?\}\}`), value)
                        }
                        if (subjectContainsVars) {
                            subject = subject.replace(new RegExp(`\{\{(?:\\s+)?(${name})(?:\\s+)?\}\}`), value)
                        }
                        if (replyToContainsVars) {
                            replyTo = replyTo.replace(new RegExp(`\{\{(?:\\s+)?(${name})(?:\\s+)?\}\}`), value)
                        }
                    })
                }

                // setup mail options
                let mailData = {
                    to: recipients,
                    subject,
                    text,
                    html
                }

                // add replyTo mail header if one is provided
                if (replyTo) {
                    mailData.replyTo = replyTo
                }
                // add attatchements (only if storage is local)
                if (storage_type_is_local && mediaNames.length) {
                    const attachments = []
                    submittedFields.forEach(field => {
                        const { name, value } = field
                        if (name.includes('file')) {
                            if (Array.isArray(value)) {
                                value.forEach(path => {
                                    attachments.push({path})
                                })
                            } else {
                                attachments.push({path: value})
                            }
                        }
                    })
                    
                    // add attachments to mailData object
                    mailData.attachments = attachments
                }
                
                // send mail
                try {
                    await Utils.Smtp.send(mailData)
                } catch (error) {
                    console.error(error)
                    throw new Error(error)
                }
            }

            req.flash('success', success)
            res.status(200).redirect(destination)

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString() || error
            req.flash('error', errorMessage)
            res.status(400).redirect(formLocation)
        }
    })

}