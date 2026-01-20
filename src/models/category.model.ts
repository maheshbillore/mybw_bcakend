import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        image: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    { timestamps: true }
);

categorySchema.pre("findOneAndDelete", async function (next) {
    const categoryId = this.getQuery()._id;
    const subcategory = await mongoose.model("Categorytype").findOne({ category: categoryId });
    if (subcategory) {
        const err = new Error("Cannot delete category — it is linked with subcategories.");
        return next(err);
    }
    next();
});

const Category = mongoose.model("Category", categorySchema);

export default Category;