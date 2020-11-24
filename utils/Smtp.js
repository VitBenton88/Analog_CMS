// Dependencies
// =============================================================
const db = require("../models")
const nodemailer = require('nodemailer')

const Smtp = {
    /**
     * Helper function for sending emails.
     *
     * @param {Object} `mailData` object containing options for message. See: https://nodemailer.com/smtp/
     * @return {Object} result of SMTP transmission.
     */

	send: (mailData) => new Promise(async (resolve, reject) => {
		try {
			const smtp = await db.Smtp.findOne().lean()
			const { host, port, secure, user, password } = smtp

			// if smtp config is not 100%, throw error
			if (!host || !password || !port || !user) throw new Error('SMTP configuration not complete.')

			const auth = { user, pass: password }
			let transporterOptions = { host, port, secure, auth }
			// add 'from' to mailData
			mailData.from = user

			if (secure) {
				transporterOptions[tls] = { rejectUnauthorized: false }
			}

			let transporter = nodemailer.createTransport(transporterOptions)
			// send mail
			const sent = await transporter.sendMail(mailData)

			resolve({sent})

		} catch (error) {
			reject(new Error(error))
		}
	}),

    /**
     * Helper function for validate SMTP settings.
     *
     * @return {Object} result of SMTP connection test.
     */

	verify: () => new Promise(async (resolve, reject) => {
		try {
			const smtp = await db.Smtp.findOne().lean()
			const { host, port, secure, user, password } = smtp
			const auth = { user, pass: password }
			let transporterOptions = { host, port, secure, auth }

			// if smtp config is not 100%, throw error
			if (!host || !password || !port || !user) throw new Error('SMTP configuration not complete.')

			if (secure) {
				transporterOptions['tls'] = { rejectUnauthorized: false }
			}

			let transporter = nodemailer.createTransport(transporterOptions)

			// fire nodemailer verify method
			const verified = await transporter.verify()

			resolve({verified})

		} catch (error) {
			reject(error)
		}
	})
}

// Export the helper function object
module.exports = Smtp
