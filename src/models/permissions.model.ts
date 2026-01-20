import mongoose from "mongoose";
import RoleHasPermissions from "../models/role.has.permissions.model.js";

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        permissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "permissions",
            default: null,
            set: (v: string) => (v === "" ? null : v)
        },
        url: {
            type: String,
            required: true,
        },
        icon: {
            type: String
        },
        order: {
            type: Number,            
            unique: true,
            default: 0
        }
    },
    { timestamps: true }
);

permissionSchema.pre("findOneAndDelete", async function (next) {
    const permissionId = this.getQuery()["_id"];

    const permissionCount = await RoleHasPermissions.countDocuments({ permissionId });

    if (permissionCount > 0) {
        return next(new Error("Cannot delete permission: it is assigned to one of role."));
    }

    next();
});

const Permissions = mongoose.model("permissions", permissionSchema);

export default Permissions;