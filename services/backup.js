// Used for the backup service
const cron = require('cron').CronJob
const fs = require('fs')
const zlib = require('zlib')

const backup = require('../backup')

module.exports = (app, db) => {
  // Backup Service
  if (!fs.existsSync('../backups')) fs.mkdirSync('../backups')

  for (method in backup) {
    if (!fs.existsSync(`../backups/${method}`))
      fs.mkdirSync(`../backups/${method}`)

    const job = new cron(
      backup[method].cron,
      () => {
        // Get the stored method
        const method = job.context

        const timestampString = new Date().toISOString().replace(/:/g, '-')
        const fileName = `../backups/${method}/${timestampString}.sqlite.gz`
        const outputFile = fs.createWriteStream(fileName)
        const inputFile = fs.createReadStream('../data.sqlite')
        const gzip = zlib.createGzip()

        inputFile.pipe(gzip).pipe(outputFile)

        outputFile.on('finish', () => {
          console.log(`[${method}] Backup created: ${fileName}`)

          fs.readdir(`../backups/${method}`, (err, files) => {
            if (err) return console.log(err)
            if (files.length > backup[method].count) {
              const oldestFile = files
                .sort((a, b) => {
                  return a - b
                })
                .slice(0, 1)[0]
              fs.unlink(`../backups/${method}/${oldestFile}`, (err) => {
                if (err) return console.log(err)
              })
            }
          })
        })
      },
      null,
      true,
      'Europe/Berlin',
      method
    )
    console.log(
      `[${method}] Backup service started. Cron: ${backup[method].cron}, count: ${backup[method].count}`
    )
  }
}
