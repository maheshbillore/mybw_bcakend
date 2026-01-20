import mongoose from "mongoose";

const roleHasPermissionSchema = new mongoose.Schema(
    {
        permissionId: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "permissions"
        }],
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "roles"
        }
    },
    { timestamps: true }
);

const RoleHasPermissions = mongoose.model("roleHasPermissions", roleHasPermissionSchema);

export default RoleHasPermissions;