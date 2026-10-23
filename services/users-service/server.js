/**
 * users-service/server.js
 * Entry point — starts the Users Service on port 3001.
 */

const app = require("./src/app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`👤 Users Service running on port ${PORT}`);
});
