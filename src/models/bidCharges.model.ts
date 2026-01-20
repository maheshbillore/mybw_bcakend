import mongoose from "mongoose";
// import RoleHasPermissions from "../models/role.has.permissions.model";
// import Users from "../models/user.model";

const BidChargeSchema = new mongoose.Schema(
    {
        bid_count: {
            type: Number,
            required: true,
            unique: true,
        },
        bid_type: {
            type: String,
            enum: ['percent', 'flat'],
            required: true
        },
        bid_charge: {
            type: String,
            required: true
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// roleSchema.pre("findOneAndDelete", async function (next) {
//     const roleId = this.getQuery()["_id"];

//     const userCount = await Users.countDocuments({ roleId });
//     const permissionCount = await RoleHasPermissions.countDocuments({ roleId });

//     if (userCount > 0 || permissionCount > 0) {
//         return next(new Error("Cannot delete role: it is assigned to users or permissions."));
//     }

//     next();
// });


const BidCharges = mongoose.model("bidcharges", BidChargeSchema);

export default BidCharges;