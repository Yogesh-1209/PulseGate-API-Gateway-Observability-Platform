/**
 * products-service/server.js
 * Entry point — starts the Products Service on port 3002.
 */

const app = require("./src/app");

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`📦 Products Service running on port ${PORT}`);
});
