import Permissions from "../models/permissions.model.js";
import RoleHasPermissions from "../models/role.has.permissions.model.js";
import { GenericResponse } from "../shared/type.js";
import { IncomingPermissionData, IncomingRolePermission } from "../shared/interface.js";

export class PermissionsService {
    static async getPermissions(currentPage: number, pageSize: number): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [permissions, totalItems] = await Promise.all([
                await Permissions.find()
                    .select("_id name permissionId url icon order createdAt updatedAt")
                    .populate({
                        path: "permissionId",
                        select: "name"
                    })
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ order: 1 })
                    .lean(),
                Permissions.countDocuments({}),
            ]);
            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    permissions,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: "Permissions fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching permissions: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getPermissionMaxOrderNumber(): Promise<GenericResponse<any>> {
        try {
            const maxPermission = await Permissions.findOne().sort({ order: -1 }).select('order');
            const maxOrder = maxPermission ? maxPermission.order : 0;

            if (maxPermission) {
                return {
                    success: true,
                    data: maxOrder,
                    message: "Permission max order get successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error geting permission max order: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }    

    static async storePermission(data: IncomingPermissionData): Promise<GenericResponse<any>> {
        try {
            const permission = await Permissions.create(data);
            return {
                success: true,
                data: permission,
                message: "Permission created successfully.",
            };
        } catch (error: any) {
            console.error("Error creating permission: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getPermission(permissionId: string): Promise<GenericResponse<any>> {
        try {
            if (!permissionId) {
                return {
                    success: false,
                    data: null,
                    message: "Permission id is not found."
                }
            }
            const permission = await Permissions.findById(permissionId);
            if (permission) {
                return {
                    success: true,
                    data: permission,
                    message: "Permission data get successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error geting permission data: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async updatePermission(permissionId: string, data: IncomingPermissionData): Promise<GenericResponse<any>> {
        try {
            if (!permissionId) {
                return {
                    success: false,
                    data: null,
                    message: "Permission id is not found."
                }
            }

            const permission = await Permissions.findByIdAndUpdate(permissionId, data, {
                new: true,
                runValidators: true // ensures validation rules apply during update
            });

            if (!permission) {
                return {
                    success: false,
                    data: null,
                    message: "Permission not found",
                };
            }

            return {
                success: true,
                data: permission,
                message: "Permission updated successfully.",
            };
        } catch (error: any) {
            console.error("Error updating permission: ", error);

            // Duplicate key error handling
            if (error.code === 11000) {
                return {
                    success: false,
                    data: null,
                    message: "Permission name already exists. Please use a different name."
                };
            }

            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async deletePermission(permissionId: string): Promise<GenericResponse<any>> {
        try {
            if (!permissionId) {
                return {
                    success: false,
                    data: null,
                    message: "Permission id is not found."
                }
            }
            const permission = await Permissions.findByIdAndDelete(permissionId);
            if (permission) {
                return {
                    success: true,
                    data: permission,
                    message: "Permission delete successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error deleting permission: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async permissionsList(): Promise<GenericResponse<any>> {
        try {
            const permissions = await Permissions.find({ url: '#' }).select('_id name').exec();

            if (permissions.length === 0) {
                return {
                    success: false,
                    data: null,
                    message: "No record found."
                };
            }

            return {
                success: true,
                data: permissions,
                message: "Permissions list fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching permissions list : ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getAllPermissions(): Promise<GenericResponse<any>> {
        try {
            const permissions = await Permissions.find()
                .select("_id name permissionId order")
                .sort({ order: 1 })
                .lean();

            const map = new Map();
            permissions.forEach(p => {
                const { permissionId, ...rest } = p;
                map.set(p._id.toString(), { ...rest });
            });

            // build hierarchy
            const roots: any[] = [];
            permissions.forEach(p => {
                if (p.permissionId) {
                    const parent = map.get(p.permissionId.toString());
                    if (parent) {
                        if (!parent.childPermissions) {
                            parent.childPermissions = [];
                        }
                        parent.childPermissions.push(map.get(p._id.toString()));
                    }
                } else {
                    roots.push(map.get(p._id.toString()));
                }
            });

            return {
                success: true,
                data: roots,
                message: "Permissions fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching permissions: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async setPermissions(data: IncomingRolePermission): Promise<GenericResponse<any>> {
        try {
            await RoleHasPermissions.deleteMany({ roleId: data.roleId });

            const permission = await RoleHasPermissions.create(data);

            return {
                success: true,
                data: permission,
                message: "Permission created successfully.",
            };
        } catch (error: any) {
            console.error("Error creating permission: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getRoleHasPermissions(roleId: string): Promise<GenericResponse<any>> {
        try {
            if (!roleId) {
                return {
                    success: false,
                    data: null,
                    message: "Role id is not found."
                }
            }

            const roleHasPermissions = await RoleHasPermissions.findOne({ roleId: roleId })
                .populate({
                    path: "permissionId",
                    select: "name permissionId order",
                    options: { sort: { order: 1 } }
                })
                .select('-createdAt -updatedAt -__v')
                .lean()
                .then(doc => {
                    if (!doc) return null;
                    return {
                        ...doc,
                        permissions: doc.permissionId,
                        permissionId: undefined
                    };
                });


            return {
                success: true,
                data: roleHasPermissions,
                message: "Role permissions fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching permissions: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getRoleBasedPermissions(roleId: string): Promise<GenericResponse<any>> {
        try {
            if (!roleId) {
                return {
                    success: false,
                    data: null,
                    message: "Role id is not found."
                }
            }

            const userPermissions = await RoleHasPermissions.findOne({ roleId: roleId })
                .populate({
                    path: "permissionId",
                    select: "name permissionId url icon order",
                    options: { sort: { order: 1 } }
                })
                .select('-createdAt -updatedAt -__v')
                .lean()
                .then(doc => {
                    if (!doc) return null;
                    return {
                        ...doc,
                        permissions: doc.permissionId,
                        permissionId: undefined
                    };
                });

            return {
                success: true,
                data: userPermissions,
                message: "Role permissions fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching role based permissions: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }
}