import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        typeOfCategory: {
            type: String,
            required: true,
            enum: ["industrial", "commercial", "residential"],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        image: {
            type: String,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    { timestamps: true }
);

// Pre-findOneAndDelete middleware
subCategorySchema.pre('findOneAndDelete', async function (next) {
    try {
        const Service = mongoose.model('Service');
        const doc = await this.model.findOne(this.getFilter());

        if (doc) {
            const serviceCount = await Service.countDocuments({ subCategory: doc._id });

            if (serviceCount > 0) {
                throw new Error(`Cannot delete SubCategory. It is being used by ${serviceCount} service(s).`);
            }
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

const SubCategory = mongoose.model("SubCategory", subCategorySchema);
export default SubCategory;
