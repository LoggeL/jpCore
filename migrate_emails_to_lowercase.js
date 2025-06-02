const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.sqlite',
  },
  useNullAsDefault: true, // Recommended for SQLite
});

async function migrateEmailsToLowercase() {
  let updatedCount = 0;
  try {
    // Read all records from the account table
    const accounts = await knex('account').select('id', 'email');

    for (const account of accounts) {
      if (account.email) {
        const lowercaseEmail = account.email.toLowerCase();
        // Check if the email needs updating
        if (account.email !== lowercaseEmail) {
          await knex('account')
            .where('id', account.id)
            .update({ email: lowercaseEmail });
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} email(s) to lowercase.`);
  } catch (error) {
    console.error('Error migrating emails to lowercase:', error);
  } finally {
    // Close the database connection
    await knex.destroy();
  }
}

migrateEmailsToLowercase();
