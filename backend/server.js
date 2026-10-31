
import "dotenv/config";
import app from "./src/app.js";
import dbconnection from "./src/database/mongoDB.js";


const PORT = process.env.PORT || 3000;



async function startServer() {
  try {
    await dbconnection();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
