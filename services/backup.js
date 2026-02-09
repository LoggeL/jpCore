// Used for the backup service
const { CronJob } = require('cron')
const fs = require('fs')
const zlib = require('zlib')

const backup = require('../backup')

module.exports = (app, db) => {
  // Backup Service
  if (!fs.existsSync('../backups')) fs.mkdirSync('../backups')

  for (const method in backup) {
    if (!fs.existsSync(`../backups/${method}`))
      fs.mkdirSync(`../backups/${method}`)

    const currentMethod = method
    const job = new CronJob(
      backup[method].cron,
      () => {
        const timestampString = new Date().toISOString().replace(/:/g, '-')
        const fileName = `../backups/${currentMethod}/${timestampString}.sqlite.gz`
        const outputFile = fs.createWriteStream(fileName)
        const inputFile = fs.createReadStream('../data.sqlite')
        const gzip = zlib.createGzip()

        inputFile.pipe(gzip).pipe(outputFile)

        outputFile.on('finish', () => {
          console.log(`[${currentMethod}] Backup created: ${fileName}`)

          fs.readdir(`../backups/${currentMethod}`, (err, files) => {
            if (err) return console.log(err)
            if (files.length > backup[currentMethod].count) {
              const oldestFile = files
                .sort((a, b) => {
                  return a - b
                })
                .slice(0, 1)[0]
              fs.unlink(`../backups/${currentMethod}/${oldestFile}`, (err) => {
                if (err) return console.log(err)
              })
            }
          })
        })
      },
      null,
      true,
      'Europe/Berlin'
    )
    console.log(
      `[${method}] Backup service started. Cron: ${backup[method].cron}, count: ${backup[method].count}`
    )
  }
}
