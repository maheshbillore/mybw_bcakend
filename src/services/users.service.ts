import User from "../models/user.model.js";
import { GenericResponse } from "../shared/type.js";
import { IncomingUserData } from "../shared/interface.js";
import bcrypt from "bcryptjs";

export class UsersService {
    static async getUsers(currentPage: number, pageSize: number, searchQuery: any): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;

            // Build search filter
            let searchFilter: any = { role: /^volunteer$/i };

            if (searchQuery && searchQuery.trim() !== '') {
                // Search across name, email, and phone fields
                searchFilter = {
                    role: /^volunteer$/i,
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { email: { $regex: searchQuery, $options: 'i' } },
                        { phone: { $regex: searchQuery, $options: 'i' } }
                    ]
                };
            }

            const [users, totalItems] = await Promise.all([
                User.find(searchFilter)
                    .select("_id name phone email password dob picture role roleId isActive createdAt updatedAt")
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 })
                    .lean(),
                User.countDocuments(searchFilter),
            ]);

            const baseUrl = process.env.BASE_URL;
            const folderName = 'uploads/profile';

            const usersWithPictureUrl = users.map(user => ({
                ...user,
                picture: user.picture ? `${baseUrl}/${folderName}/${user.picture}` : null
            }));


            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    users: usersWithPictureUrl,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: searchQuery ? "Search results fetched successfully." : "Users fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching users: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async checkEmailInUsersExists(email: string): Promise<GenericResponse<any>> {
        try {
            // Check if email is provided and valid
            if (!email || typeof email !== 'string') {
                return {
                    success: false,
                    data: null,
                    message: "Email parameter is required and must be a string"
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid email format"
                };
            }

            // Normalize email for comparison
            const normalizedEmail = email.toLowerCase().trim();

            // Check if email exists in database - MongoDB query
            const existingUser = await User.findOne({
                email: normalizedEmail
            }).exec();

            const exists = existingUser !== null && existingUser !== undefined;
            const message = exists ? "Email already exists" : "Email is available";

            const response = {
                success: true,
                data: {
                    exists: exists,
                    email: normalizedEmail,
                    available: !exists
                },
                message: message
            };

            return response;
        } catch (error: any) {
            console.error("Error checking user email: ", error);
            return {
                success: false,
                data: null,
                message: error.message || "Internal server error while checking email"
            };
        }
    }

    static async checkMobileInUsersExists(mobile: string): Promise<GenericResponse<any>> {
        try {
            // Check if mobile is provided and valid
            if (!mobile || typeof mobile !== 'string') {
                return {
                    success: false,
                    data: null,
                    message: "Mobile parameter is required and must be a string"
                };
            }

            // Validate mobile format: +91 followed by 10 digits (total 13 characters)
            const mobileRegex = /^\+91\d{10}$/;
            if (!mobileRegex.test(mobile.trim())) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid mobile format. Must be 13 digits starting with +91 (e.g., +919876543210)"
                };
            }

            // Normalize phone number
            const phoneNumber = mobile.trim();

            // Check if mobile exists in database - MongoDB query
            const existingUser = await User.findOne({
                phone: phoneNumber
            }).exec();

            const exists = existingUser !== null && existingUser !== undefined;
            const message = exists ? "Mobile already exists" : "Mobile is available";

            const response = {
                success: true,
                data: {
                    exists: exists,
                    mobile: phoneNumber,
                    available: !exists
                },
                message: message
            };

            return response;
        } catch (error: any) {
            console.error("Error checking user mobile: ", error);
            return {
                success: false,
                data: null,
                message: error.message || "Internal server error while checking mobile number"
            };
        }
    }

    static async storeUser(data: IncomingUserData): Promise<GenericResponse<any>> {
        try {
            const existing = await User.findOne({ email: data.email });
            if (existing) {
                return {
                    success: false,
                    data: null,
                    message: "This email already exists.",
                };
            }

            const user = await User.create(data);
            return {
                success: true,
                data: user,
                message: "User created successfully.",
            };
        } catch (error: any) {
            console.error("Error creating user: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async updateUser(userId: string, data: IncomingUserData): Promise<GenericResponse<any>> {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User id is required."
                };
            }

            if (data.password) {
                const saltRounds = 10;
                data.password = await bcrypt.hash(data.password, saltRounds);
            }

            const user = await User.findByIdAndUpdate(userId, data, {
                new: true,
                runValidators: true // ensures validation rules apply during update
            });

            if (!user) {
                return {
                    success: false,
                    data: null,
                    message: "User not found.",
                };
            }

            return {
                success: true,
                data: user,
                message: "User updated successfully.",
            };
        } catch (error: any) {
            console.error("Error updating user: ", error);

            // Duplicate key error handling
            if (error.code === 11000) {
                return {
                    success: false,
                    data: null,
                    message: "Email already exists. Please use a different name."
                };
            }

            return {
                success: false,
                data: null,
                message: error.message || "Something went wrong while updating the user."
            };
        }
    }

    static async deleteUser(userId: string): Promise<GenericResponse<any>> {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User id is not found."
                }
            }
            const user = await User.findByIdAndDelete(userId);
            if (user) {
                return {
                    success: true,
                    data: user,
                    message: "User delete successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error deleting User: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }
}