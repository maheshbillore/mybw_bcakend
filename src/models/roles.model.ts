import mongoose from "mongoose";
import RoleHasPermissions from "../models/role.has.permissions.model.js";
import Users from "../models/user.model.js";

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        operations: {
            type: [String],
            enum: ["create", "update", "view", "delete"],
            default: []
        }
    },
    { timestamps: true }
);

roleSchema.pre("findOneAndDelete", async function (next) {
    const roleId = this.getQuery()["_id"];

    const userCount = await Users.countDocuments({ roleId });
    const permissionCount = await RoleHasPermissions.countDocuments({ roleId });

    if (userCount > 0 || permissionCount > 0) {
        return next(new Error("Cannot delete role: it is assigned to users or permissions."));
    }

    next();
});


const Roles = mongoose.model("roles", roleSchema);

export default Roles;