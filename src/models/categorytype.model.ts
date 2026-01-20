import mongoose from "mongoose";

const categoryTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    image: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
},
    { timestamps: true }
)

// Pre-findOneAndDelete middleware
categoryTypeSchema.pre('findOneAndDelete', async function (next) {
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

const Categorytype = mongoose.model("Categorytype", categoryTypeSchema);
export default Categorytype;