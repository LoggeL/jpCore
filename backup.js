// This file specifies the backups
// Format is cron: https://en.wikipedia.org/wiki/Cron
// count specifies how many backups to keep
// The object key is the name for the backup, which is going to be used for the folder

module.exports = {
    "daily": {
      "cron": "0 0 * * *",
      "count": 3
    },
    "weekly": {
      "cron": "0 0 * * 0",
      "count": 3
    },
    "monthly": {
      "cron": "0 0 1 * *",
      "count": 3
    }
  }
  