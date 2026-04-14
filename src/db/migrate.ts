import { runMigrations, closeDb } from './client.js';
import { config } from '../config.js';

console.log(`Running migrations against ${config.databasePath}...`);
runMigrations();
console.log('Migrations applied.');
closeDb();
