const slugify = require('url-slug')

module.exports = {
    /**
     * Block helper that renders menu with submenu elements
     *
     * @param {String} `slug` string associated to menu.
     * @return {String} HTML elements of menu and submenus.
     */

    renderMenu: (slug, pageData) => {
        const { menus, url } = pageData.data.root

        // guard clause
        if (!slug || !menus) return null

        const menu = menus[slug]

        // guard clause
        if (!menu) return null

        // function for returning active class
        const activeClass = (url, route) => {
            return url.includes(route) ? " active" : ""
        }

        // function for generating menu items
        const itemDom = (accumulator, item) => {
            if (!item) return false
            const {children, route, target, text} = item

            return children.length ?
                accumulator += `<li class="nav-item dropdown${activeClass(url, route)}">
                                    <a class="nav-link dropdown-toggle" href="${route}" target="${target}">
                                        ${item.text}
                                    </a>
                                    <ul class="dropdown-menu nav submenu">
                                        ${children.reduce(itemDom, '')}
                                    </ul>
                                </li>` :
                accumulator += `<li class="nav-item${activeClass(url, route)}"><a class="nav-link" href="${route}" target="${target}">${text}</a></li>`
        }

        // return completed menu
        return `<ul id="menu-${slug}" class="nav">${menu.reduce(itemDom, '')}</ul>`
    },

    generateBodyClasses: (pageData) => {
        let classes = ''

        // check for default homepage
        if (!pageData.data.root.page_data) {
            classes = `template-homepage default page`
            return classes
        }

        let { is_post, title, template } = pageData.data.root.page_data

        const pageType = is_post ? 'post' : 'page';

        // add template class
        classes += `template-${template.trim().replace(/\s+/g, '-').replace(/\//g, '-').toLowerCase()} `
        // add slug class
        classes += `${slugify(title)} `
        // add page type class
        classes += `${pageType}`
        // if this is a post, add taxonomies to classes
        if (is_post) {
            let { taxonomies } = pageData.data.root
            if (taxonomies.length) {
                taxonomies.forEach((taxonomy) => {
                    classes += ` ${slugify(taxonomy.name)}`
                })
            }
        }

        return classes
    },

    form: (formSlug, pageData) => {
        const {captcha, page_data, site_data, url} = pageData.data.root
        const {forms} = page_data
        const {type} = site_data.settings.storage
        let formToBuild = {}

        if (!forms) {
            return
        }

        for (let form of forms) {
            if (form.slug === formSlug) {
                formToBuild = form;
                break;
            }
        }

        const {_id, fields, slug} = formToBuild
        
        if (!forms || !fields) {
            return
        }

        const storageIsLocal = type === 'local'
        const formStart = `<form id="analog-form-${slug}" class="analog-form ${slug}" enctype="multipart/form-data" action="/analog/form/${_id}" method="post">`
        let formBody = ''
        const formLocationField = `<input type="hidden" name="formLocation" value="${url}">`
        const captchaField = captcha ? `<input class="recaptcha-response" type="hidden" name="g-recaptcha-response" value="">` : '';
        const formEnd = `</form>`
        // build form
        for (const [i, field] of fields.entries()) {
            const {column, copy, defaultValue, hidden, label, maxlength, max, min, multiple, name, options, placeholder, required, rows, title, type} = field
            // opening tags
            formBody += `<div class="form-group form-col-${column}">`
            // handle labels
            if (label && type !== 'checkbox' && type !== 'submit' && type !== 'copy') {
                formBody += `<label for="${type}-field-${i}">${label}</label>`
            }
            // handle text inputs
            if (type !== 'textarea' && type !== 'select' && type !== 'checkbox' && type !== 'radio' && type !== 'file' && type !== 'submit' && type !== 'copy') {
                formBody += `<input type="${type}" name="${name}" value="${defaultValue || ''}"${min ? ` min=${min}` : ''}${max ? ` max=${max}` : ''} id="${type}-field-${i}" class="form-control" placeholder="${placeholder || ''}"${required ? ' required' : ''}${hidden ? ' hidden' : ''}>`
            }
            // file inputs
            if (field.type === 'file') {
                formBody += `<input type="${type}" name="${name}" id="${type}-field-${i}" class="form-control"${required ? ' required' : ''}${storageIsLocal && multiple ? " multiple" : ''}>`
            }
            // textarea
            if (type === 'textarea') {
                formBody += `<textarea id="${type}-field-${i}" class="form-control" name="${name}" maxLength="${maxlength || ''}" rows="${rows || ''}" placeholder="${placeholder || ''}"${required ? ' required' : ''}>${defaultValue}</textarea>`
            }
            // select
            if (type === 'select') {
                formBody += `<select id="${type}-field-${i}" class="form-control" name="${name}"${required ? ' required' : ''}>
                                ${options.map((option, i) =>
                                    `<option value="${option.value}"${option.defaultValue ? ' selected' : ''}>${option.label}</option>`
                                ).join('')}
                            </select>`
            }
            // checkbox
            if (type === 'checkbox') {
                formBody += `<div class="form-check">
                                <input class="form-check-input" id="${type}-field-${i}" name="${name}" type="checkbox"${required ? ' required' : ''}>
                                <label class="form-check-label" for="${type}-field-${i}">${label}</label>
                            </div>`
            }
            // radio legend & inputs
            if (type === 'radio') {
                // radio legend
                formBody += `<legend id="${type}-${i}-title">${title}</legend>`
                // radio inputs
                if (options.length) {
                    formBody += options.map((option, i) =>
                        `<div class="form-check">
                            <input class="form-check-input" type="radio" name="${name}" id="${name}-option-${i}" value="${option.value}"${option.defaultValue ? ' checked' : ''}${required ? ' required' : ''}>
                            <label class="form-check-label" for="${name}-option-${i}">${option.label}</label>
                        </div>`
                    ).join('')
                }
            }
            // handle copy
            if (type === 'copy') {
                formBody += `<p class="form-copy form-copy-${name}">${copy ? copy : ''}</p>`
            }
            // submit button
            if (type === 'submit') {
                formBody += `<button id="${name}" type="submit" class="btn btn-success">${label}</button>`
            }
            // closing tags
            formBody += '</div>'
        }

        return `${formStart}${formBody}${formLocationField}${captchaField}${formEnd}`

    },

    times: (n, block) => {
        let accum = ''
        for(let i = 0; i < n; ++i) {
            block.data.index = i + 1;
            block.data.first = i === 0;
            block.data.last = i === (n - 1);
            accum += block.fn(this);
        }
        return accum
    },

    inArray: (array, value, index=0, returnValueIfTrue) => {
        let returnValue
        if (value) {
            const value_formatted = typeof value == "string" ? value : value.toString()
            if ( Array.isArray(array) ) {
                for (let i = index; i < array.length; i++) {
                    const element = array[i]
                    if (element) {
                        const arr_value = typeof element == "string" ? element : element.toString()
                        if (arr_value === value_formatted) {
                            returnValue = returnValueIfTrue;
                            break;
                        }
                    }
                }
            }
        }

        return returnValue
    }
}