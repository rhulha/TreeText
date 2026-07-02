const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

if (client === 'sqlite') {
  module.exports = require('./sqlite');
} else if (client === 'postgres') {
  module.exports = require('./postgres');
} else {
  throw new Error(`Unknown DB_CLIENT "${client}", expected "postgres" or "sqlite"`);
}
