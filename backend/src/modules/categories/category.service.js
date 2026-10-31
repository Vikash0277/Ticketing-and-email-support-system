import Category from "./category.model.js";

export async function listCategories(query) {
  const { search, page, limit } = query;

  const filter = {
    isActive: true,
  };

  if (search) {
    // Escape regex characters so search input is treated literally.
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.name = {
      $regex: escapedSearch,
      $options: "i",
    };
  }

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .select("_id name description")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Category.countDocuments(filter),
  ]);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}