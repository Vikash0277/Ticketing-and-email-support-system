import "dotenv/config";

import mongoose from "mongoose";

import dbConnection from "../database/mongoDB.js";
import Category from "../modules/categories/category.model.js";
import DEFAULT_CATEGORIES from "../modules/categories/category.defaults.js";

async function main() {
  await dbConnection();

  try {
    const result = await Category.bulkWrite(
      DEFAULT_CATEGORIES.map(({ name, description }) => ({
        updateOne: {
          filter: { name },
          update: {
            $setOnInsert: { name, description, isActive: true },
          },
          upsert: true,
        },
      }))
    );

    console.log(
      `Default categories ready. Added ${result.upsertedCount}; existing categories left unchanged.`
    );
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(async (error) => {
  console.error("Category seed failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exitCode = 1;
});
