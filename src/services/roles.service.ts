import Roles from "../models/roles.model.js";
import { GenericResponse } from "../shared/type.js";
import { IncomingRoleData } from "../shared/interface.js";

export class RolesService {
    static async getRoles(currentPage: number, pageSize: number): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [roles, totalItems] = await Promise.all([
                await Roles.find()
                    .select("_id name operations createdAt updatedAt")
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 })
                    .lean(),
                Roles.countDocuments({}),
            ]);
            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    roles,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: "Roles fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching roles: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async listOfRoles(): Promise<GenericResponse<any>> {
        try {
            const roles = await Roles.find().select('_id name');

            return {
                success: true,
                data: roles,
                message: "Roles fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching roles: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async rolesList(): Promise<GenericResponse<any>> {
        try {
            const roles = await Roles.find({
                name: { $nin: [/^admin$/i, /^customer$/i, /^partner$/i] }
            }).select('_id name');

            return {
                success: true,
                data: roles,
                message: "Roles fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching roles: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async storeRole(data: IncomingRoleData): Promise<GenericResponse<any>> {
        try {
            const existing = await Roles.findOne({ name: data.name });
            if (existing) {
                return {
                    success: false,
                    data: null,
                    message: "This role name already exists.",
                };
            }

            const role = await Roles.create(data);
            return {
                success: true,
                data: role,
                message: "Role created successfully.",
            };
        } catch (error: any) {
            console.error("Error creating role: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async getRole(roleId: string): Promise<GenericResponse<any>> {
        try {
            if (!roleId) {
                return {
                    success: false,
                    data: null,
                    message: "Role id is not found."
                }
            }
            const role = await Roles.findById(roleId);
            if (role) {
                return {
                    success: true,
                    data: role,
                    message: "Role data get successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error geting role data: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async updateRole(roleId: string, data: IncomingRoleData): Promise<GenericResponse<any>> {
        try {
            if (!roleId) {
                return {
                    success: false,
                    data: null,
                    message: "Role id is required."
                };
            }

            const role = await Roles.findByIdAndUpdate(roleId, data, {
                new: true,
                runValidators: true // ensures validation rules apply during update
            });

            if (!role) {
                return {
                    success: false,
                    data: null,
                    message: "Role not found.",
                };
            }

            return {
                success: true,
                data: role,
                message: "Role updated successfully.",
            };
        } catch (error: any) {
            console.error("Error updating role: ", error);

            // Duplicate key error handling
            if (error.code === 11000) {
                return {
                    success: false,
                    data: null,
                    message: "Role name already exists. Please use a different name."
                };
            }

            return {
                success: false,
                data: null,
                message: error.message || "Something went wrong while updating the role."
            };
        }
    }

    
    static async deleteRole(roleId: string): Promise<GenericResponse<any>> {
        try {
            if (!roleId) {
                return {
                    success: false,
                    data: null,
                    message: "Role id is not found."
                }
            }
            const role = await Roles.findByIdAndDelete(roleId);
            if (role) {
                return {
                    success: true,
                    data: role,
                    message: "Role delete successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error deleting role: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }
}