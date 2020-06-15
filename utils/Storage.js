// Dependencies
// =============================================================
const AWS = require('aws-sdk')
const db = require("../models")
const fs = require("fs")
const { Storage } = require('@google-cloud/storage')

const Media = {
    delete: function (media, storageConfig) {
        let { _id, fileName, key, path } = media
        // storage and value needs to be dynamic, media.storage will be undefined for bulk deletions
        const storage = media.storage || storageConfig.type
        const isBulkDelete = Array.isArray(media)
        const deleteFileAndAssociations = this.deleteFileAndAssociations
        let paths = this.getRoute(fileName, false, isBulkDelete)

        // if this is not a bulk delete, define paths for single deletion
        if (!isBulkDelete) {
            paths = this.getRoute(fileName)
        }

        return new Promise(async function (resolve, reject) {
            try {
                // delete from storage depending on type:

                // HANDLE LOCAL DELETIONS
                // =============================================================
                if (storage == 'local') {
                    // HANDLE BULK LOCAL DELETIONS
                    // ==========================
                    if (isBulkDelete) {
                        // loop through media items and delete and remove associations
                        media.forEach(async function (item) {
                            // delete actual file
                            const localPath = `${__dirname.replace('/utils', '/public')}${item.path}`
                            fs.unlinkSync(localPath)
                            // remove associations
                            await deleteFileAndAssociations(item._id)
                        })

                        //resolve promise
                        return resolve()
                    }
                    // HANDLE SINGLE LOCAL DELETION
                    // ============================
                    
                    // delete actual file
                    const localPath = `${__dirname.replace('/utils', '/public')}${path}`
                    fs.unlinkSync(localPath)

                    // remove associations
                    await deleteFileAndAssociations(_id)

                    // resolve promise
                    resolve()
                }

                // GOOGLE CLOUD STORAGE FILE DELETION
                // =============================================================
                if (storage == 'googleCloud') {
                    const {
                        bucketName,
                        projectId
                    } = storageConfig.configurations.googleCloud
                    const storage = new Storage({
                        keyFilename: paths.gcsJSONpath,
                        projectId
                    })

                    // HANDLE BULK GOOGLE CLOUD STORAGE DELETIONS
                    // ==========================
                    if (isBulkDelete) {
                        // loop through media items and delete each in GCS ...
                        media.forEach(async function (item) {
                            // delete file
                            await storage.bucket(bucketName).file(item.fileName).delete()
                            // remove associations
                            await deleteFileAndAssociations(item._id)
                        })

                        // then resolve promise
                        return resolve()
                    }
                    // HANDLE SINGLE GOOGLE CLOUD STORAGE DELETION
                    // ==========================

                    // Deletes the file from the bucket
                    await storage.bucket(bucketName).file(fileName).delete()

                    // remove associations
                    await deleteFileAndAssociations(_id)

                    // resolve promise
                    resolve()
                }

                // AWS S3 FILE DELETION
                // =============================================================
                if (storage == 'aws') {
                    const {
                        accessKeyId,
                        secretAccessKey,
                        bucketName
                    } = storageConfig.configurations.aws

                    // configuring the AWS environment
                    AWS.config.update({
                        accessKeyId,
                        secretAccessKey
                    })

                    const s3 = new AWS.S3()

                    // HANDLE BULK AWS S3 DELETIONS
                    // ==========================
                    if (isBulkDelete) {
                        // configuring parameters ...
                        let params = {
                            Bucket: bucketName,
                            Delete: {
                                Objects: []
                            }
                        }
                        // then loop through media items and collect keys for the params ...
                        media.forEach(async function (item) {
                            const keyObj = {Key: item.key}
                            params.Delete.Objects.push(keyObj)
                        })
                        // then delete actual files ...
                        await s3.deleteObjects(params).promise()

                        // then loop through media items and delete associations ...
                        media.forEach(async function (item) {
                            // remove associations
                            await deleteFileAndAssociations(item._id)
                        })

                        // finally resolve promise
                        return resolve()
                    }
                    // HANDLE SINGLE AWS S3 DELETION
                    // ==========================

                    // configuring parameters
                    const params = {
                        Bucket: bucketName,
                        Key: key
                    }
                    // delete actual file
                    await s3.deleteObject(params).promise()
                    // remove associations
                    await deleteFileAndAssociations(_id)

                    resolve()
                }

            } catch (error) {
                console.error(error)
                reject(new Error(error))
            }
        })
    },
    
    getRoute: function (fileObj, multipleFileUpload, multipleFileDeletion) {
        const routesArr = []
        const projectDir = __dirname.replace('/utils', '')
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        let currentMonth = currentDate.getMonth() + 1
        currentMonth = currentMonth < 10 ? `0${currentMonth.toString()}` : currentMonth
        const yearPath = `${projectDir}/public/uploads/${currentYear}`
        const gcsJSONpath = `${projectDir}/config/storage/gcs.json`

        // if this is called during a bulk delete, only return certain routes ...
        if (multipleFileDeletion) {
            return {
                gcsJSONpath,
                yearPath
            }
        }

        // if this is a multiple file upload, loop through files and create array of objects to return
        if (multipleFileUpload) {
            fileObj.forEach(media => {
                const fileName = media.name
                const absolutePath = `${yearPath}/${currentMonth}/${fileName}`
                const relativePath = `/uploads/${currentYear}/${currentMonth}/${fileName}`
                const awsPath = `${currentYear}/${currentMonth}/${fileName}`
                const absolutePathNoFile = `${yearPath}/${currentMonth}`
                const tmpPath = `${projectDir}/tmp/${fileName}`
                const gcsJSONpath = `${projectDir}/config/storage/gcs.json`

                routesArr.push({
                    absolutePath,
                    absolutePathNoFile,
                    awsPath,
                    gcsJSONpath,
                    relativePath,
                    tmpPath,
                    yearPath
                })
            })

            return routesArr
        }

        const fileName = fileObj.name || fileObj
        const absolutePath = `${yearPath}/${currentMonth}/${fileName}`
        const relativePath = `/uploads/${currentYear}/${currentMonth}/${fileName}`
        const awsPath = `${currentYear}/${currentMonth}/${fileName}`
        const absolutePathNoFile = `${yearPath}/${currentMonth}`
        const tmpPath = `${projectDir}/tmp/${fileName}`

        return {
            absolutePath,
            absolutePathNoFile,
            awsPath,
            gcsJSONpath,
            relativePath,
            tmpPath,
            yearPath
        }

    },

    deleteFileAndAssociations: (_id) => new Promise(async (resolve, reject) => {
        try {
            const update_by = { image: _id }
            const update_param = { $unset: {image: 1} }
            
            // delete file record from db
            await db.Media.deleteOne({_id})
            // pull this media id from any user record that uses it
            await db.Users.updateMany(update_by, update_param)
            // pull this media id from any page that uses it
            await db.Pages.updateMany(update_by, update_param)
            // delete field value containing this file
            await db.FieldValues.deleteMany({file: _id})

            resolve()

        } catch (error) {
            console.error(error)
            reject(new Error(error))
        }
    }),

    write: async function (fileObj, storageConfig) {
        const multipleFileUpload = Array.isArray(fileObj)
        let paths = this.getRoute(fileObj, multipleFileUpload)

        return new Promise(async function (resolve, reject) {
            try {
                if (!fileObj) {
                    throw new Error('Error on file write attempt.')
                }

                let {
                    absolutePath,
                    absolutePathNoFile,
                    awsPath,
                    gcsJSONpath,
                    relativePath,
                    tmpPath,
                    yearPath
                } = paths

                const { type, configurations } = storageConfig

                // HANDLE LOCAL UPLOADS
                // =============================================================
                if (type == 'local') {
                    const mediaArr = []
                    const renames = []
                    
                    // handle multiple file uploads
                    if (multipleFileUpload) {      
                        // collect each media item ...
                        fileObj.forEach(function (item, i) {
                            const {absolutePath, absolutePathNoFile, relativePath, yearPath} = paths[i]

                            // check if there is a file with this file name already ...
                            if (fs.existsSync(absolutePath)) {
                                // if so, append random number to file name
                                const currentName = item.name
                                const [nameString, extensionString] = currentName.split(/\.(?=[^\.]+$)/);
                                const newName = `${nameString}_${Math.floor((Math.random() * 999) + 1)}`
                                renames.push({originalName: currentName, newName: `${newName}.${extensionString}`})
                                paths[i].relativePath = relativePath.replace(nameString, newName)
                                paths[i].absolutePath = absolutePath.replace(nameString, newName)
                                item.name = `${newName}.${extensionString}`
                            }
    
                            let mediaObj_toPush = {
                                type: item.mimetype,
                                fileName: item.name,
                                storage: type,
                                path: relativePath,
                                size: item.size
                            }

                            mediaArr.push(mediaObj_toPush)

                            // if the directories created above do not exist, create them ...
                            // start with year dir
                            if (!fs.existsSync(yearPath)) {
                                fs.mkdirSync(yearPath)
                            }
                            // then check for the month path ...
                            if (!fs.existsSync(absolutePathNoFile)) {
                                fs.mkdirSync(absolutePathNoFile)
                            }   
                        })

                        // save records of uploads to db
                        let media = await db.Media.create(mediaArr)

                        resolve({ media, renames })

                        // finally move files to proper dir
                        fileObj.forEach(function (item, i) {
                            const absolutePath = paths[i].absolutePath

                            item.mv(absolutePath, (error) => {
                                if (error) {
                                    throw error
                                }
                            })
                        })

                        return
                    }

                    // check if there is a file with this file name already ...
                    if (fs.existsSync(absolutePath)) {
                        // if so, append random number to file name
                        const currentName = fileObj.name
                        const [nameString, extensionString] = currentName.split(/\.(?=[^\.]+$)/);
                        const newName = `${nameString}_${Math.floor((Math.random() * 999) + 1)}`
                        renames.push({originalName: currentName, newName: `${newName}.${extensionString}`})
                        relativePath = relativePath.replace(nameString, newName)
                        absolutePath = absolutePath.replace(nameString, newName)
                        fileObj.name = `${newName}.${extensionString}`
                    }

                    // if the directories created above do not exist, create them ...
                    // start with year dir
                    if (!fs.existsSync(yearPath)) {
                        fs.mkdirSync(yearPath)
                    }
                    // then check for the month path ...
                    if (!fs.existsSync(absolutePathNoFile)) {
                        fs.mkdirSync(absolutePathNoFile)
                    }

                    // save record of upload to db
                    let media = await db.Media.create({
                        type: fileObj.mimetype,
                        fileName: fileObj.name,
                        storage: type,
                        path: relativePath,
                        size: fileObj.size
                    })

                    resolve({ media, renames })

                    // finally move file to proper dir
                    fileObj.mv(absolutePath, (error) => {
                        if (error) {
                            throw error
                        }
                    })
                }

                // HANDLE GOOGLE CLOUD STORAGE UPLOADS
                // =============================================================
                if (type == 'googleCloud') {
                    // first check if AUTH JSON exists, without it nothing can be done
                    if (!fs.existsSync(gcsJSONpath)) {
                        throw new Error('Google Cloud Storage auth JSON file is not present.')
                    }

                    const { bucketName, projectId } = configurations.googleCloud

                    const storage = new Storage({
                        keyFilename: gcsJSONpath,
                        projectId
                    })

                    // then move file to temporary folder and upload to GCS on callback
                    fileObj.mv(tmpPath, async (error) => {
                        if (error) {
                            throw error
                        }

                        let media = {}

                        try {
                            // Uploads a local file to the bucket
                            await storage.bucket(bucketName).upload(tmpPath, {
                                // Support for HTTP requests made with `Accept-Encoding: gzip`
                                gzip: true,
                                // Make file public
                                public: true,
                                // By setting the option `destination`, you can change the name of the
                                // object you are uploading to a bucket.
                                metadata: {
                                    // Enable long-lived HTTP caching headers
                                    // Use only if the contents of the file will never change
                                    // (If the contents will change, use cacheControl: 'no-cache')
                                    cacheControl: 'public, max-age=31536000',
                                }
                            })

                            // save record of upload to db
                            media = await db.Media.create({
                                type: fileObj.mimetype,
                                fileName: fileObj.name,
                                storage: type,
                                path: `https://storage.googleapis.com/${bucketName}/${fileObj.name}`,
                                size: fileObj.size
                            })

                        } finally {
                            // delete from tmp dir
                            fs.unlinkSync(tmpPath)
                        }

                        resolve({ media })
                    })
                }

                // HANDLE AWS S3 UPLOADS
                // =============================================================
                if (type == 'aws') {
                    const { accessKeyId, secretAccessKey, bucketName } = configurations.aws

                    // then move file to temporary folder and upload to AWS on callback
                    fileObj.mv(tmpPath, async (error) => {
                        if (error) {
                            throw error
                        }

                        let media = {}

                        try {
                            // configuring the AWS environment
                            AWS.config.update({ accessKeyId, secretAccessKey })
                            const s3 = new AWS.S3()

                            // configuring parameters
                            const params = {
                                Bucket: bucketName,
                                Body: fs.createReadStream(tmpPath),
                                Key: awsPath
                            }

                            const s3FileData = await s3.upload(params).promise()

                            // save record of upload to db
                            media = await db.Media.create({
                                type: fileObj.mimetype,
                                fileName: fileObj.name,
                                key: awsPath,
                                storage: type,
                                path: s3FileData.Location,
                                size: fileObj.size
                            })  

                        } finally {
                            // delete from tmp dir
                            fs.unlinkSync(tmpPath)
                        }

                        resolve({ media }) 
                    })
                }

            } catch (error) {
                const errorMessage = error.message|| error.toString()
                console.error(`Error on media write. Message: ${errorMessage}`)
                reject(error)
            }
        })

    }
}


// Export the helper function object
module.exports = Media