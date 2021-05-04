const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: './data.sqlite',
    },
});

const db2 = require('./db2.json').sort((a, b) => a.date - b.date)
    ;
(async () => {

    const accountExists = await knex.schema.hasTable('account')
    console.log('accountExists', accountExists)

    if (!accountExists) {
        await knex.schema.createTable('account', table => {
            table.increments('id').primary()
            table.string('name')
            table.string('email')
            table.boolean('verifiedMail')
            table.string('hash')
            table.string('salt')
            table.timestamp('createdAt')
            table.timestamp('lastActivity').defaultTo(null)
            table.json('roles')
        })

        for (let i = 0; i < db2.length; i++) {
            await knex('account').insert(db2[i])
            console.log(db2[i].email)
        }
    }

    const itemsExists = await knex.schema.hasTable('item')
    console.log('itemsExists', itemsExists)

    if (!itemsExists) {
        await knex.schema.createTable('item', table => {
            table.increments('id').primary()
            table.integer('account_id').unsigned()
            table.foreign('account_id').references('account.id')
            table.timestamp('lastActivity').defaultTo(null)
            table.string('name')
        })
    }

    const volunteersExists = await knex.schema.hasTable('volunteer')
    console.log('volunteersExists', volunteersExists)

    if (!volunteersExists) {
        await knex.schema.createTable('volunteer', table => {
            table.increments('id').primary()
            table.integer('account_id').unsigned()
            table.foreign('account_id').references('account.id')
            table.string('duration')
            table.timestamp('lastActivity').defaultTo(null)
        })
    }

    const registrationsExists = await knex.schema.hasTable('registration')
    console.log('registrationsExists', registrationsExists)

    if (!registrationsExists) {
        await knex.schema.createTable('registration', table => {
            table.increments('id').primary()
            table.integer('people')
            table.integer('account_id').unsigned()
            table.foreign('account_id').references('account.id')
            table.timestamp('lastActivity').defaultTo(null)
        })
    }

    const mailVerification = await knex.schema.hasTable('mailVerification')
    console.log('mailVerification', mailVerification)

    if (!mailVerification) {
        await knex.schema.createTable('mailVerification', table => {
            table.increments('id').primary()
            table.integer('account_id').unsigned()
            table.foreign('account_id').references('account.id')
            table.string('token')
        })
    }
})()